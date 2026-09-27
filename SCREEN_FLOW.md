# GrouptripLedger — Screen Flow & Navigation Map

> **Purpose**: This document tells AI agents how the six core screens connect — entry points, exit points, shared state, and what data must be passed between them. Read this alongside `PROJECT_BRIEF.md` (data model/business logic) before wiring up routes or navigation. This doc is about **flow**, not visual design (see the Variant.ui prompts for that).

---

## 1. Screen inventory (reference names — use these consistently in code)

| ID | Screen | Route (suggested) |
|---|---|---|
| S1 | Trip Dashboard | `/trips/:tripId` |
| S2 | Add/Edit Cost Item | `/trips/:tripId/items/new` and `/trips/:tripId/items/:itemId/edit` |
| S3 | Personal View | `/trips/:tripId/me` |
| S4 | Audit Trail Drill-down | modal/panel, not a route — opened over S1 or S3 |
| S5 | Settle Up | `/trips/:tripId/settle` |
| S6 | AI Parser Review | `/trips/:tripId/import` |

Two screens not detailed in the Variant prompts but implied by the brief — add these as you build:
| ID | Screen | Route |
|---|---|---|
| S0 | Trip List / Create Trip | `/trips` |
| S7 | Member Management | `/trips/:tripId/members` |

---

## 2. Top-level navigation map

```
S0 (Trip List)
  └─ select/create trip → S1 (Trip Dashboard)

S1 (Trip Dashboard)  ◄── the hub; almost everything returns here
  ├─ tap "+ Add booking/expense"        → S2 (new)
  ├─ tap an existing cost item row      → S2 (edit, prefilled)
  ├─ tap a member avatar / "Members"    → S7
  ├─ tap "Settle up" CTA                → S5
  ├─ tap "Import from chat" / AI entry  → S6
  ├─ tap an inconsistency warning icon  → S4 (scoped to that item)
  └─ tap "My view" / own avatar         → S3

S2 (Add/Edit Cost Item)
  ├─ Save                → back to S1 (dashboard reflects new/updated item + recalculated balances)
  ├─ Cancel/back          → back to S1, discard draft
  └─ (edit mode only) Delete/cancel booking → confirmation → back to S1

S3 (Personal View)
  ├─ tap a balance figure / "why do I owe this" → S4 (scoped to current member)
  ├─ tap an itinerary item                        → S2 in read-only/edit mode (if organizer) or a read-only detail view (if participant)
  ├─ tap "Record a payment"                        → inline form or modal (not a separate screen — see Section 4)
  └─ back                                          → S1 (organizer) or stays as home (participant-only users may land here by default, see Section 5)

S4 (Audit Trail Drill-down)
  — always a modal/panel over S1 or S3, never a standalone route
  └─ close → returns to whichever screen opened it, state unchanged

S5 (Settle Up)
  ├─ "Mark as paid" per row → row updates in place, triggers recalculation, no navigation
  ├─ all rows settled → success state shown in place (same screen, new state)
  └─ back/done → S1 (dashboard now shows Trip.status = settled if fully closed)

S6 (AI Parser Review)
  ├─ paste text → parse (async, loading state)
  ├─ "Confirm X of Y" → creates real CostItems → back to S1 (new items appear in dashboard list)
  └─ cancel/back → discard drafts, back to S1

S7 (Member Management)
  ├─ add member → updates S1's avatar stack + triggers recalculation if trip is active
  ├─ mark member as "left" → confirmation (explains effect on future items per PROJECT_BRIEF Section 5) → recalculation → back to S1
  └─ back → S1
```

---

## 3. Data that must travel between screens

Treat these as the contract each screen depends on. If a screen is missing required upstream data, it must fetch it itself rather than assume it was passed — screens can be deep-linked directly (e.g. from a notification), not only navigated to internally.

| From → To | Data passed | Why |
|---|---|---|
| S1 → S2 (edit) | `itemId` | S2 fetches full CostItem + current split config itself; don't pass the whole object through navigation state, fetch fresh (avoids stale-data bugs after recalculation) |
| S1 → S4 | `itemId` or `memberId` (whichever was tapped) | S4 needs to know its *scope* — a single item's breakdown, or a single member's full balance breakdown |
| S1/S7 → recalculation | none passed explicitly — recalculation is triggered server-side on any mutation and **all open screens showing balances must re-fetch/re-subscribe**, not just the screen that triggered the change |
| S3 → S4 | current `memberId` (implicit — "my" balance) | Same drill-down component as S1's version, just pre-scoped to self, no need to pick a member |
| S6 → S1 | none — S6 creates real CostItems on confirm, S1 just re-fetches its list | Keeps S6 stateless with respect to S1; don't try to hand off in-memory draft objects |
| S2 (save) → S1 | none — S1 re-fetches | Same reasoning: never pass computed balances through navigation, always re-derive after a mutation |

**Rule of thumb**: navigation should pass **identifiers**, not computed values (amounts, balances, split results). Every screen re-fetches/recomputes what it needs to display. This mirrors the "balances are derived, never stored" principle from the main project brief — apply it to frontend state too, not just the database.

---

## 4. Things that are modals/inline, NOT separate screens/routes

Don't build these as full navigatable routes — they're overlays or inline expansions:

- **Audit Trail (S4)** — always a modal/panel over its parent screen
- **Record a payment** (triggered from S3) — inline form or modal, not a route; on submit, closes and S3 re-fetches
- **Delete/cancel confirmation** (triggered from S2 edit mode) — confirmation dialog, not a route
- **Mark member as left confirmation** (triggered from S7) — confirmation dialog, not a route

Reasoning: these are short-lived, contextual actions. Making them full routes adds back-button complexity for no benefit and breaks the "always returns to the hub" mental model in Section 2.

---

## 5. Role-based entry point

- **Organizer** default landing screen after selecting a trip: **S1 (Dashboard)**
- **Participant (non-organizer)** default landing screen: **S3 (Personal View)** — they should not be dropped into the full group financial dashboard by default, though they can navigate to a read-only version of S1 if you choose to expose it (decide this based on how much group-level financial visibility participants should have — not specified in the original brief, flag this as a decision to make, don't assume)

Both roles can reach S4 and S5; S2, S6, and S7 (mutation-capable screens) should be organizer-only unless you deliberately decide to let participants add their own expenses — if you do, gate it per-field (e.g. a participant can add an expense they paid for, but shouldn't be able to edit someone else's booking).

---

## 6. State that must live above individual screens (app-level, not screen-level)

- **Current trip context** (`tripId`, trip status, current user's role in this trip) — needed by nearly every screen, fetch once when entering a trip, not per-screen
- **Live balance subscription** — if using real-time updates (websocket/polling), subscribe at the trip-level, not per-screen, so S1's dashboard totals and S3's personal balance and S5's settle-up list all update together when a recalculation happens anywhere. This is the concrete implementation of "dynamic recalculation" from the main brief — it has to be visible across every screen simultaneously, not just the screen where the triggering edit happened.
- **Trip member list** (for avatar rendering, split-rule member pickers in S2) — cache at trip level, invalidate on S7 mutations

---

## 7. Suggested build order for wiring navigation (matches PROJECT_BRIEF.md phasing)

1. S1 ↔ S2 loop first (dashboard + add/edit item) — this alone proves the core data model works
2. Add S3 (personal view) reading from the same underlying data S1 uses
3. Add S4 as a shared component, mountable from both S1 and S3
4. Add S5 (settle up) once balances in S1/S3 are trustworthy
5. Add S7 (member management) and confirm recalculation propagates to S1/S3/S5 correctly
6. Add S6 (AI parser) last — it's additive and shouldn't block core flow if AI service is unavailable (per PROJECT_BRIEF Section 9)
