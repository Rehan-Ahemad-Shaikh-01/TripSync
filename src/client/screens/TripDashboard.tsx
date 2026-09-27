import React, { useState } from 'react';
import {
  Plane,
  Hotel,
  Ship,
  Utensils,
  Car,
  ChefHat,
  Filter,
  Search,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Plus,
  Compass,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { AvatarStack } from '../components/Avatar.js';
import { InconsistencyBanner } from '../components/InconsistencyBanner.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { CostItem } from '../../core/types.js';

export const TripDashboard: React.FC = () => {
  const {
    trip,
    members,
    costItems,
    payments,
    ledgerSnapshot,
    settlementTransactions,
    inconsistencies,
    auditLogs,
    navigateTo,
    currentMemberId,
    openAuditModal,
  } = useTrip();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!trip) return null;

  const totalSpend = ledgerSnapshot?.totalTripSpend ?? 0;
  const totalCollected = ledgerSnapshot?.totalCollected ?? 0;
  const outstanding = Math.max(0, totalSpend - totalCollected);
  const settlementTotal = settlementTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const activeMemberCount = members.filter((member) => !member.leftAt).length;
  const collectedPercent = totalSpend > 0 ? Math.min(100, Math.round((totalCollected / totalSpend) * 100)) : 0;

  // Active member balance
  const currentLedger = ledgerSnapshot?.membersLedger[currentMemberId];
  const myNet = currentLedger?.netBalance ?? 0;

  // Filtered items
  const filteredItems = costItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getCategoryIcon = (category: string, title: string) => {
    const t = title.toLowerCase();
    if (category === 'flight' || t.includes('flight') || t.includes('air')) {
      return <Plane className="w-5 h-5 text-indigo-600" />;
    }
    if (category === 'stay' || t.includes('villa') || t.includes('hotel') || t.includes('resort')) {
      return <Hotel className="w-5 h-5 text-indigo-600" />;
    }
    if (t.includes('boat') || t.includes('cruise') || t.includes('scuba') || t.includes('island')) {
      return <Ship className="w-5 h-5 text-indigo-600" />;
    }
    if (category === 'food' || t.includes('dinner') || t.includes('cocktail') || t.includes('feast')) {
      return <Utensils className="w-5 h-5 text-indigo-600" />;
    }
    if (category === 'transport' || t.includes('van') || t.includes('shuttle') || t.includes('cab')) {
      return <Car className="w-5 h-5 text-indigo-600" />;
    }
    return <ChefHat className="w-5 h-5 text-indigo-600" />;
  };

  const getSplitLabel = (type: string) => {
    switch (type) {
      case 'equal':
        return 'EQUAL SPLIT';
      case 'shared_room':
        return 'SHARED ROOM';
      case 'participant_weighted':
        return 'WEIGHTED';
      case 'activity_based':
        return 'ACTIVITY BASED';
      case 'custom':
        return 'CUSTOM';
      case 'organizer_paid':
        return 'ORGANIZER PAID';
      default:
        return 'SPLIT';
    }
  };

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-8 page-enter">
      {/* Top Warning Banner if inconsistencies detected */}
      <InconsistencyBanner warnings={inconsistencies} onOpenAudit={openAuditModal} />
      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Total Trip Cost */}
        <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-0">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total trip cost</span>
          <div className="text-3xl font-extrabold text-slate-900 num-font tracking-tight">
            {formatCurrency(totalSpend, trip.baseCurrency)}
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <span>ⓘ Projected: {formatCurrency(totalSpend * 1.08, trip.baseCurrency)}</span>
          </div>
        </div>

        {/* Total Collected with Progress Bar */}
        <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-100">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Trip funding</span>
          <div className="text-3xl font-extrabold text-emerald-600 num-font tracking-tight">
            {formatCurrency(totalCollected, trip.baseCurrency)}
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full progress-fill"
                style={{ width: `${collectedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-200">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Unfunded expenses</span>
          <div className="text-3xl font-extrabold text-rose-500 num-font tracking-tight">
            {formatCurrency(outstanding, trip.baseCurrency)}
          </div>
          <div className="mt-3 text-[11px] text-rose-500 font-semibold flex items-center gap-1">
            <span>⚠️ {activeMemberCount} active members tracking shares</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Trip Expenses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between anim-fade-in delay-150">
            <h2 className="text-xl font-bold text-slate-900">Trip Expenses</h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-indigo-600 font-medium"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-indigo-600 cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="stay">Stays</option>
                <option value="flight">Flights</option>
                <option value="activity">Activities</option>
                <option value="transport">Transport</option>
                <option value="food">Food & Drinks</option>
              </select>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="card p-12 text-center text-slate-400 text-xs anim-fade-up delay-200">
                No cost items found. Click "+ Add booking/expense" to create one.
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isItemCancelled = item.status === 'cancelled';
                const hasInconsistency = inconsistencies.some((i) => i.entityId === item.id);
                const participantMembers = members.filter((m) =>
                  item.participants.some((p) => p.memberId === m.id)
                );
                const staggerDelays = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
                const delayClass = `delay-${staggerDelays[Math.min(index, staggerDelays.length - 1)]}`;

                return (
                  <div
                    key={item.id}
                    onClick={() => navigateTo('item_editor', { itemId: item.id })}
                    className={`card p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all anim-fade-up ${delayClass} ${
                      isItemCancelled ? 'opacity-50 bg-slate-50' : 'bg-white'
                    }`}
                  >
                    {/* Left: Icon & Title */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-2xs icon-bounce-parent">
                        <span className="icon-bounce inline-flex">{getCategoryIcon(item.category, item.title)}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {item.title}
                          </h3>
                          {hasInconsistency && (
                            <span title="Inconsistency or conflict detected">
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5 truncate">
                          {formatDate(item.startDatetime)} • {item.category.toUpperCase()}
                          {item.paidByMemberId && (
                            <span className="text-slate-500 font-medium">
                              {' '}
                              • Paid by {members.find((m) => m.id === item.paidByMemberId)?.displayName || 'Member'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Right: Avatars, Split Pill, Amount & Status */}
                    <div className="flex items-center gap-5 flex-shrink-0">
                      <div className="hidden sm:flex flex-col items-end">
                        <AvatarStack members={participantMembers} max={3} size="xs" />
                        <span className="pill pill-split text-[10px] mt-1">
                          {getSplitLabel(item.splitRule.type)}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-base text-slate-900 num-font">
                          {formatCurrency(item.totalAmount, item.currency)}
                        </div>
                        <span
                          className={`pill text-[10px] py-0.5 mt-0.5 capitalize ${
                            isItemCancelled
                              ? 'pill-warning'
                              : item.paidByMemberId
                              ? 'pill-settled'
                              : 'pill-unpaid'
                          }`}
                        >
                          {isItemCancelled ? 'Cancelled' : item.paidByMemberId ? 'Settled' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Column: Settle Up CTA & Group Activity Timeline */}
        <div className="space-y-6">
          {/* Ready to Settle Card (Dark Midnight) — ambient glow */}
          <div className="card-dark p-6 relative overflow-hidden anim-fade-up delay-200">
            <div className="glow-orb absolute -right-8 -bottom-8 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="glow-orb absolute -left-4 top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" style={{ animationDelay: '2s' }} />

            <h3 className="text-lg font-extrabold text-white tracking-tight mb-2">
              Ready to settle?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              There are currently <strong className="text-white">{activeMemberCount} active balances</strong>{' '}
              with <strong className="text-white">{formatCurrency(settlementTotal, trip.baseCurrency)}</strong> ready to settle.
              Settle up now to clear the derived ledger.
            </p>

            <div className="space-y-2 py-3 border-y border-white/10 text-xs text-slate-300 mb-6">
              <div className="flex justify-between">
                  <span>Ready to settle</span>
                  <span className="font-bold text-white">
                  {formatCurrency(settlementTotal, trip.baseCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{myNet >= 0 ? 'Owed to you' : 'Due from you'}</span>
                <span
                  className={`font-bold ${myNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {formatCurrency(Math.abs(myNet), trip.baseCurrency)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigateTo('settle')}
              className="w-full btn bg-white text-slate-900 hover:bg-slate-100 font-bold py-3 rounded-xl shadow-md transition-all text-xs"
            >
              Settle your balance
            </button>
          </div>

          {/* Group Activity Log Card */}
          <div className="card p-6 bg-white border border-slate-200 anim-fade-up delay-350">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700 mb-4">
              Group Activity
            </h3>

            <div className="space-y-4 text-xs">
              {auditLogs.slice(0, 4).map((log, i) => {
                const logDelayClasses = ['delay-400', 'delay-450', 'delay-500', 'delay-600'];
                return (
                <div key={log.id} className={`flex items-start gap-3 anim-slide-left ${logDelayClasses[i] ?? 'delay-600'}`}>
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 leading-snug">
                      {log.description}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => openAuditModal(currentMemberId)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View full activity & audit log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
