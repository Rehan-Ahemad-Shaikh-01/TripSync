import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle2, Hotel, Plane, Bus, Utensils, Compass, ArrowRight } from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { api } from '../utils/api.js';

export const AuditTrailModal: React.FC = () => {
  const {
    tripId,
    trip,
    auditModalOpen,
    auditModalMemberId,
    closeAuditModal,
    members,
    openPaymentModal,
    navigateTo,
  } = useTrip();

  const [explanationData, setExplanationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const targetMemberId = auditModalMemberId || members[0]?.id;
  const targetMember = members.find((m) => m.id === targetMemberId);

  useEffect(() => {
    if (!auditModalOpen || !targetMemberId) return;

    let isMounted = true;
    setLoading(true);

    api
      .explainMember(tripId, targetMemberId)
      .then((data) => {
        if (isMounted) {
          setExplanationData(data);
          // Auto-expand all items
          const initialExpanded: Record<string, boolean> = {};
          data.lineItems?.forEach((_: any, idx: number) => {
            initialExpanded[idx] = true;
          });
          setExpandedItems(initialExpanded);
        }
      })
      .catch((err) => console.error('Failed to load dues explanation:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [auditModalOpen, targetMemberId, tripId]);

  if (!auditModalOpen) return null;

  const toggleExpand = (idx: number) => {
    setExpandedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const netBalance = explanationData?.member?.netBalance ?? 0;
  const isOwed = netBalance > 0;
  const isSettled = netBalance === 0;

  const getCategoryIcon = (title: string, splitType: string) => {
    const t = title.toLowerCase();
    if (t.includes('villa') || t.includes('hotel') || t.includes('stay') || splitType === 'shared_room') {
      return <Hotel className="w-4 h-4 text-slate-700" />;
    }
    if (t.includes('flight') || t.includes('air')) {
      return <Plane className="w-4 h-4 text-slate-700" />;
    }
    if (t.includes('cab') || t.includes('van') || t.includes('transport') || t.includes('transfer')) {
      return <Bus className="w-4 h-4 text-slate-700" />;
    }
    if (t.includes('dinner') || t.includes('drinks') || t.includes('lunch') || t.includes('food')) {
      return <Utensils className="w-4 h-4 text-slate-700" />;
    }
    return <Compass className="w-4 h-4 text-slate-700" />;
  };

  return (
    <div className="modal-slideover-backdrop" onClick={closeAuditModal}>
      <div
        className="slideover-card flex flex-col p-6 sm:p-7 justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={closeAuditModal}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Audit Breakdown • {targetMember?.displayName || 'Member'}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Why do I {isOwed ? 'get back ' : 'owe '}
            <span className={isOwed ? 'text-emerald-600' : isSettled ? 'text-slate-800' : 'text-rose-500'}>
              {formatCurrency(Math.abs(netBalance), trip?.baseCurrency)}
            </span>
            ?
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            We’ve broken down your balance item-by-item based on the raw ledger events recorded for{' '}
            <strong className="text-slate-700">{trip?.name}</strong>.
          </p>

          {/* Line Items List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              Recalculating audit trail from raw ledger facts...
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {explanationData?.lineItems?.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No active cost items assigned to this member.
                </div>
              ) : (
                explanationData?.lineItems?.map((item: any, idx: number) => {
                  const isExpanded = expandedItems[idx] ?? true;
                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden transition-all"
                    >
                      {/* Item Header */}
                      <div
                        onClick={() => toggleExpand(idx)}
                        className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer border-b border-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                            {getCategoryIcon(item.itemTitle, item.splitType)}
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                            {item.itemTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {formatCurrency(item.myShare, trip?.baseCurrency)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Item Expanded Breakdown */}
                      {isExpanded && (
                        <div className="p-4 space-y-2.5 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span>Total expense cost</span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrency(item.totalItemCost, trip?.baseCurrency)}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-500 italic">
                            <span>Split: {item.explanation}</span>
                          </div>

                          <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-100">
                            <span>Your gross share</span>
                            <span>{formatCurrency(item.myShare, trip?.baseCurrency)}</span>
                          </div>

                          <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-bold text-xs">
                            <span className="uppercase text-[10px] tracking-wider text-slate-400">
                              Remaining Share
                            </span>
                            <span className="text-rose-500 font-extrabold">
                              {formatCurrency(item.myShare, trip?.baseCurrency)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Payments Made Section */}
              {explanationData?.paymentsMade?.length > 0 && (
                <div className="mt-4 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs space-y-2">
                  <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                    Payments & Offsets Recorded
                  </span>
                  {explanationData.paymentsMade.map((p: any) => (
                    <div key={p.id} className="flex justify-between text-emerald-800">
                      <span>
                        Paid via {p.method?.toUpperCase()} to {p.target}
                      </span>
                      <span className="font-bold">-{formatCurrency(p.amount, trip?.baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Total Card */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>Accumulated balance</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(explanationData?.member?.grossOwed, trip?.baseCurrency)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-emerald-600 font-medium">
            <span>Gross payments / credits</span>
            <span className="font-bold">
              -{formatCurrency(explanationData?.member?.grossPaid, trip?.baseCurrency)}
            </span>
          </div>

          {/* Dark Hero Card */}
          <div className="card-dark p-4 flex items-center justify-between rounded-2xl mt-2">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                {isOwed ? 'Final Credit Balance' : 'Final Amount Due'}
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                {formatCurrency(Math.abs(netBalance), trip?.baseCurrency)}
              </span>
            </div>

            {!isSettled && (
              <button
                onClick={() => {
                  closeAuditModal();
                  if (!isOwed) {
                    openPaymentModal();
                  } else {
                    navigateTo('settle');
                  }
                }}
                className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs px-4 py-2 rounded-xl transition-all"
              >
                {isOwed ? 'View Settlements' : 'Settle Now'}
              </button>
            )}
          </div>

          <p className="text-[10px] text-center text-slate-400">
            Amounts are derived from raw events. Exact integer math guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
};
