import React, { useState } from 'react';
import { Check, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { Avatar } from '../components/Avatar.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export const SettleUpScreen: React.FC = () => {
  const {
    trip,
    members,
    settlementTransactions,
    recordPayment,
    refreshAll,
    navigateTo,
  } = useTrip();

  const [settledTxIds, setSettledTxIds] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!trip) return null;

  const totalNeeded = settlementTransactions.length;
  const settledCount = Object.values(settledTxIds).filter(Boolean).length;
  const progressPercent = totalNeeded > 0 ? Math.round((settledCount / totalNeeded) * 100) : 100;
  const isAllComplete = totalNeeded === 0 || settledCount === totalNeeded;

  const handleMarkPaid = async (tx: any, idx: number) => {
    const txKey = `${tx.fromMemberId}-${tx.toMemberId}-${idx}`;
    setProcessingId(txKey);

    try {
      await recordPayment({
        fromMemberId: tx.fromMemberId,
        toMemberId: tx.toMemberId,
        amount: tx.amount,
        currency: tx.currency,
        method: 'upi',
        notes: `Final settlement payment to ${tx.toMemberName}`,
      });

      setSettledTxIds((prev) => ({ ...prev, [txKey]: true }));
      await refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to record settlement payment');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="pb-32 page-enter">
      {/* Dark Navy Hero Section */}
      <div className="bg-[#121829] text-white pt-8 pb-12 px-6">
        <div className="max-w-[880px] mx-auto">
          <div className="flex items-center gap-2 mb-4 anim-slide-left delay-0">
            <img src="/tripsync-logo.svg" alt="" className="w-6 h-6 rounded-full object-contain" />
            <span className="font-extrabold text-sm text-slate-200">TripSync</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1.5 anim-fade-up delay-100">
            Settle up — {totalNeeded} payment{totalNeeded !== 1 ? 's' : ''} needed
          </h1>
          <p className="text-xs text-slate-400">
            {trip.name} • {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </p>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="max-w-[880px] mx-auto px-6 -mt-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
            <span>
              {settledCount} of {totalNeeded} settled
            </span>
            <span className="text-indigo-600">{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Minimized Cash-Flow Transactions List */}
        <div className="space-y-4">
          {totalNeeded === 0 ? (
            <div className="card p-12 text-center bg-white border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mb-1">
                All Balances Completely Settled!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No debts remain across any members. All shares are balanced and reconciled to 0.00.
              </p>
            </div>
          ) : (
            settlementTransactions.map((tx, idx) => {
              const txKey = `${tx.fromMemberId}-${tx.toMemberId}-${idx}`;
              const isPaid = settledTxIds[txKey];
              const isBusy = processingId === txKey;
              const txDelays = [0, 100, 200, 300, 400, 500];
              const txDelayClass = `delay-${txDelays[Math.min(idx, txDelays.length - 1)]}`;

              return (
                <div
                  key={txKey}
                  className={`card p-5 bg-white border border-slate-200 flex items-center justify-between gap-4 transition-all anim-fade-up ${txDelayClass}`}
                >
                  {/* Debtor */}
                  <div className="flex items-center gap-3 w-1/3 min-w-0">
                    <Avatar name={tx.fromMemberName} id={tx.fromMemberId} size="md" />
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {tx.fromMemberName}
                    </span>
                  </div>

                  {/* Center Transfer Flow */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      PAYS
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600 num-font my-0.5">
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <div className="w-24 h-px bg-slate-200" />
                  </div>

                  {/* Creditor */}
                  <div className="flex items-center justify-end gap-3 w-1/3 min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {tx.toMemberName}
                    </span>
                    <Avatar name={tx.toMemberName} id={tx.toMemberId} size="md" />

                    {/* Paid Badge or Button */}
                    <div className="ml-2 flex-shrink-0">
                      {isPaid ? (
                        <div className="check-pop flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                          <Check className="w-3.5 h-3.5" />
                          Paid
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(tx, idx)}
                          disabled={isBusy}
                          className="btn btn-primary btn-sm px-4 py-2 rounded-xl text-xs"
                        >
                          {isBusy ? 'Saving...' : 'Mark as paid'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Algorithm info box */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-500 text-xs text-center">
          💡 <strong>Greedy Debt Simplification</strong>: Transferred debts are mathematically reduced
          from {members.length * (members.length - 1)} pairwise interactions down to {totalNeeded}{' '}
          direct payments.
        </div>
      </div>
    </div>
  );
};
