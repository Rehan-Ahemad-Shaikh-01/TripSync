# GrouptripLedger — Project Brief for AI Agents

> **Purpose of this document**: This is the single source of truth for any AI coding agent (Claude Code, Cursor, Copilot, etc.) working on this project. Read this in full before writing code. When in doubt about a design decision, follow the principles in Section 2 before improvising.

---

## 1. What we're building

**GrouptripLedger** is a group travel coordination and settlement platform. It gives a trip organizer and participants a unified view of:

- The group's **itinerary** (flights, hotels, activities, transport — multi-vendor)
- **Who is part of** each booking/activity
- **Shared and individual expenses** across vendors
- **Payments made** and **outstanding balances**
- A **final settlement** showing who owes whom, minimized to the fewest transactions

The system must stay correct and up to date automatically when the group changes — someone joins late, someone drops out, a booking gets cancelled, a price changes — without anyone manually re-doing math.

This is not a Splitwise clone. The differentiator is: itinerary-awareness (bookings, not just "expenses"), multiple cost-sharing models per booking, and automatic recalculation as trip state changes.

### Origin documents
This brief is derived from a hackathon problem statement and an initial 6-feature concept (central ledger, AI itinerary parser, live group voting, smart pool/escrow, milestone vendor payouts, dynamic recalculation). Those are referenced throughout but re-prioritized here based on what's actually required vs. what's a nice-to-have.

---

## 2. Non-negotiable design principles

These override convenience or shortcuts elsewhere in this doc:

1. **Balances are derived, never stored as truth.** Never write "Alice owes ₹1200" to a persistent field and mutate it. Store raw facts (bookings, split rules, payments) and compute balances on read. This is the only way recalculation-on-change can be correct instead of buggy.
2. **Every booking/expense has an explicit split rule.** No implicit "equal split" defaults buried in code — split rule is a first-class field on every cost item, chosen at creation time, changeable later.
3. **Every money-affecting mutation must be explainable.** A user should be able to click "why do I owe this?" and see the exact chain: booking → split rule → their share → payments applied → remaining balance. Build the audit trail into the data model from day one, not as a bolt-on log.
4. **Money math uses integer minor units, never floats.** Store amounts in paise/cents (integers). Never do currency arithmetic in floating point.
5. **Idempotency on all mutation endpoints.** Payment recording, booking edits, and cancellations should be safe to retry (client may retry on flaky network).
6. **Optimistic UI, pessimistic ledger.** UI can show instant feedback, but the ledger recalculation is always server-authoritative — never trust client-computed balances.

---

## 3. Core entities (data model)

```
Trip
 ├── id, name, start_date, end_date, base_currency, status (planning|active|settled)
 └── owner_id (organizer)

Member
 ├── id, trip_id, user_id (nullable if invited-not-joined), display_name
 ├── joined_at, left_at (nullable — null = still active)
 └── role (organizer|participant)

Vendor
 ├── id, trip_id, name, category (airline|hotel|activity|transport|other)
 └── contact_info (optional)

Booking
 ├── id, trip_id, vendor_id, title, category
 ├── total_amount (minor units), currency
 ├── start_datetime, end_datetime
 ├── status (pending|confirmed|cancelled|refunded|modified)
 ├── cancellation_policy (free_text or structured %rules — MVP: free text)
 └── split_rule_id

BookingParticipant  (join table: Booking <-> Member)
 ├── booking_id, member_id
 ├── override_share (nullable — for participant-weighted splits, e.g. "2x share")
 └── room_unit_id (nullable — only used for shared-room split type)

SplitRule
 ├── id, type: ENUM[equal, participant_weighted, shared_room, activity_based, organizer_paid]
 └── config (JSON — shape depends on type, see Section 4)

Expense   (lighter-weight than Booking — e.g. a cab, a round of drinks)
 ├── id, trip_id, title, amount, currency, category
 ├── paid_by_member_id
 ├── split_rule_id
 └── created_at

Payment
 ├── id, trip_id, from_member_id
 ├── to: EITHER to_pool (bool) OR to_vendor_id OR to_member_id (settlement payment)
 ├── amount, currency, method (cash|upi|card|pool)
 ├── applies_to: booking_id | expense_id | null (null = general pool contribution)
 └── created_at, status (pending|confirmed|failed)

Pool (Smart Pool / escrow — optional feature, see Section 6)
 ├── id, trip_id, current_balance
 └── funding_threshold_rules (JSON — for milestone payouts)

LedgerEntry (DERIVED — computed, not stored as source of truth;
             may be cached/materialized for performance but must be
             recomputable from raw events at any time)
 ├── member_id, gross_owed, gross_paid, net_balance
 └── computed_at

AuditLog
 ├── id, trip_id, actor_member_id, action_type, entity_type, entity_id
 ├── before_state (JSON), after_state (JSON)
 └── created_at
```

### Key relationships to get right
- A `Booking` has **one** `SplitRule`, but many `BookingParticipant` rows.
- `Member.left_at` being set does **not** delete the member — historical bookings they were part of before leaving must still show them correctly. Recalculation only affects **future/unsettled** items, not already-settled history (see Section 5).
- Every `Expense` is really just a lightweight `Booking` with no vendor — consider whether to actually unify these into one table with `vendor_id` nullable, rather than two separate tables. Recommendation: **unify them** to avoid duplicated split logic. Call the unified entity `CostItem`.

---

## 4. Split rule types — implement as a strategy pattern

Each type takes a `CostItem` (amount + participants) and returns a map of `member_id -> owed_amount`. Implement each as an independent, testable function — do not hardcode split logic inline in booking creation code.

| Type | Logic | Config shape |
|---|---|---|
| `equal` | Total ÷ number of active participants on this item | `{}` |
| `participant_weighted` | Each participant has a weight (e.g. 1x, 2x, 0.5x for a child); split proportional to weight | `{ weights: { member_id: weight } }` |
| `shared_room` | Room cost split among room occupants; supports uneven splits (e.g. single supplement) | `{ rooms: [{ room_id, occupants: [member_id], cost_override? }] }` |
| `activity_based` | Only members who opted into a specific activity pay for it; others pay ₹0 | Uses `BookingParticipant` membership directly — no extra config needed |
| `organizer_paid` | Organizer covers 100%; other members owe ₹0 for this item (still tracked for reporting) | `{}` |

**Edge case to handle explicitly**: rounding. When splitting ₹1000 three ways equally, you get ₹333.33 each — someone must absorb the remainder. Standard approach: assign the remainder paise to the first N participants (deterministic, sorted by member_id) so totals always reconcile exactly.

---

## 5. Dynamic recalculation — the hardest and most important feature

### Trigger events
- Member joins mid-trip
- Member leaves mid-trip
- Booking amount changes
- Booking cancelled / refunded
- Split rule changed on an existing item
- Participant added/removed from a specific booking

### Rules
1. **Recalculation is always a full recompute from raw events for the affected `CostItem`**, not a patch to a stored balance. Recompute that item's shares, then recompute affected members' aggregate balances.
2. **Past payments are never retroactively altered.** If Alice already paid ₹500 toward a booking and the booking's split changes, her ₹500 payment stays recorded — only the *owed* amount recalculates, which changes her *net balance*, not her payment history.
3. **Define what "settled" means and freeze it.** Once a `Trip.status = settled`, no further recalculation should silently change historical numbers — any post-settlement edit should require an explicit "reopen trip" action, logged in `AuditLog`.
4. **Leaving mid-trip**: a member who leaves should stop being included in **future** cost items but remains liable for items already incurred while they were active (unless organizer explicitly removes them from a specific booking, which is a separate, explicit action with its own audit entry).
5. **Cancellations & refunds**: a cancellation should not simply delete the booking. Set `status = cancelled`, zero out shares going forward, and if a refund amount differs from the original (partial refund, cancellation fee), record the refund as its own `Payment` (negative direction, vendor → pool/members) so the audit trail shows both the original charge and the refund distinctly.

### Suggested implementation shape
```
function recalculateTrip(tripId):
    items = getAllActiveCostItems(tripId)
    for item in items:
        shares = computeSplit(item)   # strategy pattern from Section 4
        upsertLedgerLineItems(item.id, shares)
    balances = aggregateByMember(tripId)
    cacheLedgerSnapshot(tripId, balances)   # cache is a perf optimization only
    return balances
```
Run this synchronously on every mutation for MVP (trip sizes are small — tens of people, dozens of items — so a full recompute is cheap). Don't build incremental/diff-based recalculation unless profiling proves it's needed.

---

## 6. Feature priority (build in this order)

### Phase 1 — Foundation (must work perfectly)
1. Trip + Member CRUD (add/remove/edit members, join/leave dates)
2. CostItem (booking/expense) CRUD with vendor, amount, dates
3. All 5 split rule types implemented and unit-tested independently
4. Payment recording (member pays toward an item or into the pool)
5. Ledger computation engine (Section 5) — recompute-on-mutation
6. Per-member personal view: their itinerary items + what they owe/have paid
7. Group-level financial view: total spend, per-item breakdown, per-member balances

### Phase 2 — Settlement & correctness
8. Debt simplification algorithm for final settlement (see Section 7)
9. Cancellation/refund flow with correct audit trail
10. Inconsistency detection (rule-based, not AI — see Section 8)
11. Audit log UI ("why do I owe this?" drill-down)

### Phase 3 — Differentiators (build if time allows, in this order)
12. AI itinerary parser: unstructured text (e.g. pasted chat) → structured booking suggestions, organizer reviews/confirms before they become real bookings — **never auto-commit AI output directly to the ledger**
13. Live voting on options (e.g. hotel choice) that feeds the winning option into a real booking
14. Smart Pool / escrow tracking (a `Pool` balance separate from vendor payments)
15. Milestone-triggered vendor payout suggestions (rule-based threshold check, surfaced as a suggestion/notification — do not auto-execute real payments without explicit organizer confirmation)

**Cut ruthlessly if short on time**: voting and milestone payouts are demo-flavor, not foundation. A rock-solid Phase 1 + working settlement beats a shaky Phase 3 feature set.

---

## 7. Settlement / debt-simplification algorithm

Don't show raw pairwise debts. Compute net balance per member, then greedily settle:

```
function simplifyDebts(balances):  # balances: member_id -> net (positive = owed money, negative = owes money)
    creditors = sorted([m for m in balances if balances[m] > 0], by balance desc)
    debtors   = sorted([m for m in balances if balances[m] < 0], by balance asc)
    transactions = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        amount = min(-debtors[i].balance, creditors[j].balance)
        transactions.append({from: debtors[i].id, to: creditors[j].id, amount})
        debtors[i].balance += amount
        creditors[j].balance -= amount
        if debtors[i].balance == 0: i += 1
        if creditors[j].balance == 0: j += 1
    return transactions
```
This minimizes number of transactions needed (classic greedy min-cash-flow approach). Surface this as "Settle up" — it's a strong demo moment.

---

## 8. Inconsistency detection (rule-based — cheap, high value, do this before AI features)

Implement as simple validation rules run on demand or on mutation:

- Two bookings for the same member with overlapping date/time windows (possible double-booking)
- A `CostItem` with zero participants but a nonzero amount
- Sum of individual payments toward an item exceeds the item's total amount
- A member marked `left_at` who still has future-dated cost items assigned without explicit override
- A booking with `status = confirmed` but zero recorded payments past its date

Surface these as warnings in the organizer's dashboard, not blocking errors.

---

## 9. AI feature guardrails (Phase 3 only)

- **AI itinerary parser**: input = pasted planning-chat text; output = structured *draft* bookings (vendor, dates, amount, suggested participants) that the organizer must explicitly confirm before they touch the ledger. Never let parsed output write directly to `CostItem` table.
- **Cost-saving suggestions / optimization**: framed as recommendations shown alongside real data, not automated actions.
- Keep AI calls isolated behind a service boundary so the rest of the system (ledger, recalculation, settlement) works fully even if the AI service is down or unavailable — these are enhancements, not dependencies.

---

## 10. Suggested tech stack (adjust to team's existing familiarity — this is a hackathon, don't fight your tools)

- **Backend**: any typed language/framework the team knows well (Node/TypeScript + Express/Fastify, or Python/FastAPI) — typed models help a lot here given how easy money-math bugs are
- **Database**: PostgreSQL (relational fits this domain naturally — lots of joins between members/items/splits/payments); use `NUMERIC`/`BIGINT` minor-units columns, never `FLOAT`, for money
- **Frontend**: React + a component library for speed; don't hand-roll a design system under time pressure
- **Ledger computation**: pure functions, no framework — should be unit-testable in isolation from HTTP/DB layer
- **AI features**: isolate behind a single service module (see Section 9) so they can be stubbed/mocked without blocking core demo

---

## 11. Things that will bite you late if not decided now

- **Currency**: single-currency or multi-currency? Decide now. If multi-currency, decide whether conversion happens at booking time (locked rate) or display time (live rate) — locked-at-booking-time is simpler and more correct for settlement purposes.
- **Rounding remainder assignment** — must be deterministic (see Section 4).
- **What "leaving the trip" means for past shared costs** — decide the default behavior now (recommendation: liable for past, excluded from future, organizer can override per-item).
- **Shared-room splits with uneven occupancy** (e.g., 3 people in a 2-bed room) — decide your exact allocation formula before you need it in a demo.
- **Timezone handling** for booking dates if the trip spans multiple timezones.

---

## 12. Definition of done for the hackathon demo

A judge should be able to watch this flow end-to-end without errors:
1. Organizer creates a trip, adds 4–5 members, creates 3–4 bookings using at least 3 different split types
2. A member joins mid-demo → balances visibly recalculate live
3. A booking gets cancelled/refunded → ledger updates correctly, audit trail shows why
4. A member views their personal itinerary + balance summary
5. Organizer clicks "Settle up" → sees minimized transaction list
6. (Stretch) Organizer pastes a messy chat snippet → AI suggests structured bookings → organizer confirms → they appear in the ledger

If steps 1–5 work flawlessly, that's a strong submission on its own.

---

## 13. Glossary (for consistent naming across the codebase)

| Term | Meaning |
|---|---|
| CostItem | Unified booking or expense — anything with an amount and participants |
| SplitRule | The method used to divide a CostItem's cost among participants |
| LedgerEntry | Derived per-member balance, always recomputable from raw data |
| Settlement | The final minimized set of payments needed to zero out all balances |
| Pool | Shared escrow wallet members pay into, separate from direct vendor payment |
| Recalculation | The act of recomputing all affected balances after a trip-state change |
