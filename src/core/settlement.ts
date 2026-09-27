import { Currency, MemberLedgerEntry, SettlementTransaction, TripLedgerSnapshot } from './types.js';

interface Balancer {
  id: string;
  name: string;
  balance: number; // positive = creditor, negative = debtor
}

/**
 * Greedy debt-simplification algorithm (min-cash-flow).
 * Reduces N*(N-1) potential pairwise debts down to at most N-1 direct transactions.
 */
export function simplifyDebts(
  snapshot: TripLedgerSnapshot
): SettlementTransaction[] {
  const creditors: Balancer[] = [];
  const debtors: Balancer[] = [];

  for (const [memberId, entry] of Object.entries(snapshot.membersLedger)) {
    if (entry.netBalance > 0) {
      creditors.push({
        id: memberId,
        name: entry.displayName,
        balance: entry.netBalance,
      });
    } else if (entry.netBalance < 0) {
      debtors.push({
        id: memberId,
        name: entry.displayName,
        balance: entry.netBalance,
      });
    }
  }

  // Sort creditors descending by amount owed to them
  creditors.sort((a, b) => b.balance - a.balance);

  // Sort debtors ascending (most negative first)
  debtors.sort((a, b) => a.balance - b.balance);

  const transactions: SettlementTransaction[] = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const oweAmount = -debtor.balance;
    const credAmount = creditor.balance;

    const settleAmount = Math.min(oweAmount, credAmount);

    if (settleAmount > 0) {
      transactions.push({
        fromMemberId: debtor.id,
        fromMemberName: debtor.name,
        toMemberId: creditor.id,
        toMemberName: creditor.name,
        amount: settleAmount,
        currency: snapshot.currency,
      });

      debtor.balance += settleAmount;
      creditor.balance -= settleAmount;
    }

    if (debtor.balance === 0) {
      i++;
    }
    if (creditor.balance === 0) {
      j++;
    }
  }

  return transactions;
}
