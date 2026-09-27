import React from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plane,
  Hotel,
  Ship,
  Utensils,
  Car,
  Compass,
  Download,
  MessageCircle,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { Avatar } from '../components/Avatar.js';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters.js';

export const PersonalView: React.FC = () => {
  const {
    trip,
    members,
    costItems,
    payments,
    ledgerSnapshot,
    currentMemberId,
    currentMember,
    openAuditModal,
    openPaymentModal,
  } = useTrip();

  if (!trip) return null;

  const memberLedger = ledgerSnapshot?.membersLedger[currentMemberId];
  const netBalance = memberLedger?.netBalance ?? 0;
  const grossOwed = memberLedger?.grossOwed ?? 0;
  const grossPaid = memberLedger?.grossPaid ?? 0;

  const isOwed = netBalance > 0;
  const isSettled = netBalance === 0;

  // Filter cost items that include this member
  const myItems = costItems.filter(
    (item) =>
      item.status !== 'cancelled' &&
      item.participants.some((p) => p.memberId === currentMemberId)
  );

  // Group my items by start date
  const groupedItems: Record<string, typeof myItems> = {};
  myItems.forEach((item) => {
    const dateKey = formatDate(item.startDatetime);
    if (!groupedItems[dateKey]) groupedItems[dateKey] = [];
    groupedItems[dateKey].push(item);
  });

  // Filter payments made by this member
  const myPayments = payments.filter((p) => p.fromMemberId === currentMemberId);

  const getCategoryIcon = (category: string, title: string) => {
    const t = title.toLowerCase();
    if (category === 'flight' || t.includes('flight')) {
      return <Plane className="w-4 h-4 text-slate-700" />;
    }
    if (category === 'stay' || t.includes('hotel') || t.includes('villa')) {
      return <Hotel className="w-4 h-4 text-slate-700" />;
    }
    if (t.includes('scuba') || t.includes('boat') || t.includes('dive')) {
      return <Ship className="w-4 h-4 text-slate-700" />;
    }
    if (category === 'food' || t.includes('dinner') || t.includes('cocktail')) {
      return <Utensils className="w-4 h-4 text-slate-700" />;
    }
    if (category === 'transport' || t.includes('van') || t.includes('cab')) {
      return <Car className="w-4 h-4 text-slate-700" />;
    }
    return <Compass className="w-4 h-4 text-slate-700" />;
  };

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-8 pb-24 page-enter">
      {/* Top Welcome Title */}
      <div className="flex items-center justify-between mb-8">
        <div className="anim-fade-up delay-0">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Personal Itinerary & Balance
          </h1>
          <p className="text-xs text-slate-500">
            Viewing active dues and schedule for{' '}
            <strong className="text-slate-700">{currentMember?.displayName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Avatar name={currentMember?.displayName || 'Me'} id={currentMember?.id} size="md" />
          <div className="text-right">
            <span className="font-bold text-xs text-slate-900 block">
              {currentMember?.displayName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {currentMember?.role} View
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Balances & Payment History */}
        <div className="space-y-6">
          {/* Current Balance Card */}
          <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Current Balance</span>
              <span
                className={`pill text-[10px] uppercase ${
                  isSettled ? 'pill-settled' : 'pill-unpaid'
                }`}
              >
                {isSettled ? 'Settled' : 'Pending'}
              </span>
            </div>

            <div className="mb-4">
              <h2
                className={`text-3xl font-extrabold num-font tracking-tight ${
                  isSettled
                    ? 'text-emerald-600'
                    : isOwed
                    ? 'text-emerald-600'
                    : 'text-rose-500'
                }`}
              >
                {isSettled
                  ? "You're settled up"
                  : isOwed
                  ? `You get back ${formatCurrency(Math.abs(netBalance), trip.baseCurrency)}`
                  : `You owe ${formatCurrency(Math.abs(netBalance), trip.baseCurrency)}`}
              </h2>

              <button
                onClick={() => openAuditModal(currentMemberId)}
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 flex items-center gap-1 mt-2 transition-colors"
              >
                View cost breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isSettled && (
              <button
                onClick={openPaymentModal}
                className="w-full btn btn-primary btn-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <Wallet className="w-4 h-4" />
                Record a Payment
              </button>
            )}

            {isSettled && (
              <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                No payment due
              </div>
            )}
          </div>

          {/* Payment History Card */}
          <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-xs text-slate-900">Payment History</h3>
              </div>
            </div>

            <div className="space-y-3.5">
              {myPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No direct payments recorded yet.
                </p>
              ) : (
                myPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {p.notes || `Payment via ${p.method.toUpperCase()}`}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(p.createdAt)} • {p.toPool ? 'Trip Pool' : 'Vendor'}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-600 num-font text-xs">
                      +{formatCurrency(p.amount, p.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                onClick={() => openAuditModal(currentMemberId)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
              >
                VIEW FULL AUDIT TRAIL
              </button>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Your Personal Itinerary */}
        <div className="lg:col-span-2">
          <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-100">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Your Personal Itinerary</h2>
                <p className="text-xs text-slate-500">List of bookings you are participating in</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  YOUR TOTAL SHARE
                </span>
                <span className="text-xl font-extrabold text-slate-900 num-font">
                  {formatCurrency(grossOwed, trip.baseCurrency)}
                </span>
              </div>
            </div>

            {/* Timeline Grouped by Date */}
            <div className="space-y-6">
              {Object.keys(groupedItems).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active itinerary items assigned to you.
                </div>
              ) : (
                Object.entries(groupedItems).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      {date}
                    </h3>

                    <div className="space-y-3">
                      {items.map((item, itemIdx) => {
                        const breakdown = ledgerSnapshot?.itemBreakdowns[item.id];
                        const myShare = breakdown?.memberShares[currentMemberId] ?? 0;
                        const itemDelayMs = [0, 50, 100, 150, 200, 250, 300][Math.min(itemIdx, 6)];

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs flex items-center justify-between gap-4 transition-all anim-fade-up delay-${itemDelayMs}`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                                {getCategoryIcon(item.category, item.title)}
                              </div>

                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-400">
                                  {formatTime(item.startDatetime)}
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 truncate">
                                  {item.title}
                                </h4>
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {item.cancellationPolicy || `${item.category.toUpperCase()} • Confirmed`}
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                YOUR SHARE
                              </span>
                              <span className="font-extrabold text-sm text-slate-900 num-font">
                                {formatCurrency(myShare, item.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
