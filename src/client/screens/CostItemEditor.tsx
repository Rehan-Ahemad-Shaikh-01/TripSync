import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plane,
  Hotel,
  Compass,
  Bus,
  Utensils,
  Plus,
  Minus,
  Check,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { Avatar } from '../components/Avatar.js';
import { formatCurrency } from '../utils/formatters.js';
import {
  CostItemCategory,
  SplitType,
  CostItem,
} from '../../core/types.js';
import {
  equalSplitStrategy,
  participantWeightedSplitStrategy,
  sharedRoomSplitStrategy,
  activityBasedSplitStrategy,
  customSplitStrategy,
  organizerPaidSplitStrategy,
} from '../../core/splitStrategies.js';

export const CostItemEditor: React.FC = () => {
  const {
    trip,
    members,
    costItems,
    editingItemId,
    navigateTo,
    createCostItem,
    updateCostItem,
    cancelCostItem,
    currentMemberId,
  } = useTrip();

  const existingItem: CostItem | undefined = costItems.find((i) => i.id === editingItemId);
  const isEditMode = !!existingItem;

  // Form State
  const [title, setTitle] = useState<string>(existingItem?.title || '');
  const [vendorName, setVendorName] = useState<string>('');
  const [category, setCategory] = useState<CostItemCategory>(existingItem?.category || 'stay');
  const [amountStr, setAmountStr] = useState<string>(
    existingItem ? (existingItem.totalAmount / 100).toString() : '24500'
  );
  const [currency, setCurrency] = useState<string>(existingItem?.currency || trip?.baseCurrency || 'INR');
  const [startDatetime, setStartDatetime] = useState<string>(
    existingItem?.startDatetime || new Date().toISOString().slice(0, 16)
  );
  const [paidByMemberId, setPaidByMemberId] = useState<string>(
    existingItem?.paidByMemberId || currentMemberId
  );

  // Selected participant IDs
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    existingItem?.participants.map((p) => p.memberId) || members.map((m) => m.id)
  );

  // Split Rule State
  const [splitType, setSplitType] = useState<SplitType>(existingItem?.splitRule.type || 'participant_weighted');
  const [weights, setWeights] = useState<Record<string, number>>({
    'mem-alice': 1.0,
    'mem-bob': 1.5,
    'mem-charlie': 0.5,
    'mem-dave': 1.0,
  });
  const [customShareInputs, setCustomShareInputs] = useState<Record<string, string>>({});

  const [rooms, setRooms] = useState<
    Array<{ roomId: string; roomName: string; occupantMemberIds: string[]; costOverride?: number }>
  >([
    {
      roomId: 'r1',
      roomName: 'Oceanview Suite',
      occupantMemberIds: ['mem-alice', 'mem-bob'],
      costOverride: 1400000,
    },
    {
      roomId: 'r2',
      roomName: 'Standard Room',
      occupantMemberIds: ['mem-charlie', 'mem-dave'],
      costOverride: 1050000,
    },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.title);
      setCategory(existingItem.category);
      setAmountStr((existingItem.totalAmount / 100).toString());
      setCurrency(existingItem.currency);
      setStartDatetime(existingItem.startDatetime.slice(0, 16));
      setPaidByMemberId(existingItem.paidByMemberId || currentMemberId);
      setSelectedMemberIds(existingItem.participants.map((p) => p.memberId));
      setSplitType(existingItem.splitRule.type);

      if (existingItem.splitRule.config && 'weights' in existingItem.splitRule.config) {
        setWeights(existingItem.splitRule.config.weights as Record<string, number>);
      }
      if (existingItem.splitRule.config && 'rooms' in existingItem.splitRule.config) {
        setRooms(existingItem.splitRule.config.rooms);
      }
      if (existingItem.splitRule.config && 'shares' in existingItem.splitRule.config) {
        setCustomShareInputs(Object.fromEntries(
          Object.entries(existingItem.splitRule.config.shares as Record<string, number>)
            .map(([memberId, amount]) => [memberId, (amount / 100).toFixed(2)])
        ));
      }
    }
  }, [editingItemId]);

  const totalAmountMinor = Math.round((parseFloat(amountStr) || 0) * 100);
  const customSharesMinor = Object.fromEntries(
    selectedMemberIds.map((memberId) => [
      memberId,
      Math.round((parseFloat(customShareInputs[memberId] || '') || 0) * 100),
    ])
  );
  const customShareTotalMinor = Object.values(customSharesMinor).reduce((sum, amount) => sum + amount, 0);
  const hasInvalidCustomInput = selectedMemberIds.some((memberId) => {
    const rawValue = customShareInputs[memberId];
    return rawValue !== undefined && rawValue.trim() !== '' && (!Number.isFinite(Number(rawValue)) || Number(rawValue) < 0);
  });
  const isCustomSplitValid = !hasInvalidCustomInput && customShareTotalMinor > 0 && customShareTotalMinor < totalAmountMinor;

  // Calculate live split preview using the pure strategy engine
  const computeLivePreview = (): Record<string, number> => {
    if (totalAmountMinor <= 0) return {};

    const dummyItem: CostItem = {
      id: existingItem?.id || 'temp',
      tripId: trip?.id || 't1',
      title: title || 'Draft',
      category,
      totalAmount: totalAmountMinor,
      currency: currency as any,
      startDatetime: new Date(startDatetime).toISOString(),
      endDatetime: new Date(startDatetime).toISOString(),
      status: 'confirmed',
      paidByMemberId,
      splitRule: {
        id: 'temp-rule',
        type: splitType,
        config:
          splitType === 'participant_weighted'
            ? { weights }
            : splitType === 'shared_room'
            ? { rooms }
            : splitType === 'custom'
            ? { shares: customSharesMinor }
            : null,
      },
      participants: selectedMemberIds.map((mid) => ({
        bookingId: 'temp',
        memberId: mid,
        overrideShare: weights[mid] || 1.0,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (splitType === 'equal') {
      return equalSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    if (splitType === 'participant_weighted') {
      return participantWeightedSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    if (splitType === 'shared_room') {
      return sharedRoomSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    if (splitType === 'activity_based') {
      return activityBasedSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    if (splitType === 'custom') {
      return customSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    if (splitType === 'organizer_paid') {
      return organizerPaidSplitStrategy(dummyItem, members, trip?.ownerId || '').memberShares;
    }
    return {};
  };

  const liveShares = computeLivePreview();

  const toggleMemberSelection = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((mid) => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const selectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([currentMemberId]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  const handleWeightChange = (memberId: string, delta: number) => {
    const current = weights[memberId] ?? 1.0;
    const next = Math.max(0.5, Math.round((current + delta) * 10) / 10);
    setWeights((prev) => ({ ...prev, [memberId]: next }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || totalAmountMinor <= 0) {
      alert('Please provide a title and positive expense amount');
      return;
    }
    if (splitType === 'custom' && !isCustomSplitValid) {
      alert('Custom shares must add up to more than zero and less than the total expense.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        totalAmount: totalAmountMinor,
        currency,
        startDatetime: new Date(startDatetime).toISOString(),
        endDatetime: new Date(startDatetime).toISOString(),
        paidByMemberId,
        splitRule: {
          type: splitType,
          config:
            splitType === 'participant_weighted'
              ? { weights }
            : splitType === 'shared_room'
            ? { rooms }
            : splitType === 'custom'
            ? { shares: customSharesMinor }
            : {},
        },
        participants: selectedMemberIds.map((mid) => ({
          memberId: mid,
          overrideShare: weights[mid] || null,
        })),
      };

      if (isEditMode && existingItem) {
        await updateCostItem(existingItem.id, payload);
      } else {
        await createCostItem(payload);
      }

      navigateTo('dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!existingItem) return;
    const refundStr = prompt('Enter vendor refund amount if any (in major units, e.g. 5000):', '0');
    if (refundStr === null) return;
    const refundAmount = Math.round((parseFloat(refundStr) || 0) * 100);

    const reason = prompt('Reason for cancellation:', 'Schedule change');

    try {
      await cancelCostItem(existingItem.id, refundAmount, reason || undefined);
      navigateTo('dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <div className="max-w-[1040px] mx-auto px-6 py-8 pb-32">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('dashboard')}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {isEditMode ? 'Edit Expense' : 'Add New Expense'}
            </h1>
            <p className="text-xs text-slate-500">Recording for {trip?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditMode && (
            <button
              onClick={handleCancelBooking}
              className="btn btn-danger btn-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancel Booking
            </button>
          )}

          <button
            onClick={() => navigateTo('dashboard')}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={submitting}
            className="btn btn-primary btn-sm"
          >
            {submitting ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Basic Info Card */}
        <div className="card p-6 bg-white border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1.5">Expense Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Grand Hyatt Stay"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1.5">Vendor Name</label>
              <input
                type="text"
                placeholder="e.g. Grand Hyatt Mumbai"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Category Pill Selector */}
          <div>
            <label className="font-bold text-xs text-slate-700 block mb-2">Category</label>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'flight', label: 'Flight', icon: Plane },
                { id: 'stay', label: 'Hotel', icon: Hotel },
                { id: 'activity', label: 'Activity', icon: Compass },
                { id: 'transport', label: 'Transport', icon: Bus },
                { id: 'food', label: 'Food & Drinks', icon: Utensils },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as CostItemCategory)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount and Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1.5">Amount</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">
                    {trip?.baseCurrency === 'INR' ? '₹' : trip?.baseCurrency === 'EUR' ? '€' : trip?.baseCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="24500"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-extrabold text-slate-900 num-font focus:outline-indigo-600 focus:bg-white"
                  />
                </div>
                <span className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500">
                  {trip?.baseCurrency || currency}
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1.5">Date & Time</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-indigo-600 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Who's Included */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-slate-900">Who's included</h2>
            <button
              type="button"
              onClick={selectAllMembers}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              {selectedMemberIds.length === members.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              const isPayer = paidByMemberId === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => toggleMemberSelection(m.id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-600 shadow-2xs'
                      : 'bg-white border-slate-200 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.displayName} id={m.id} size="sm" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block truncate max-w-[90px]">
                        {m.id === currentMemberId ? 'You' : m.displayName.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {isPayer ? 'Payer' : m.role}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] transition-colors ${
                      isSelected ? 'bg-indigo-600' : 'border border-slate-300'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Split Method Selector */}
        <div>
          <h2 className="text-base font-extrabold text-slate-900 mb-1">Split method</h2>
          <p className="text-xs text-slate-500 mb-4">
            Choose how to distribute the {formatCurrency(totalAmountMinor, currency)} cost
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6">
            {[
              { id: 'equal', label: 'Equal' },
              { id: 'participant_weighted', label: 'Weighted' },
              { id: 'shared_room', label: 'Shared room' },
              { id: 'activity_based', label: 'Activity-based' },
              { id: 'custom', label: 'Custom' },
            ].map((method) => {
              const isActive = splitType === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSplitType(method.id as SplitType)}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>

          {/* Split Method Config Panel */}
          <div className="card p-6 bg-white border border-slate-200">
            {splitType === 'participant_weighted' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Weighted Allocation</h3>
                    <p className="text-[11px] text-slate-500">
                      Adjust shares using custom multipliers (e.g. 1.5x suite upgrade, 0.5x child)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {members
                    .filter((m) => selectedMemberIds.includes(m.id))
                    .map((m) => {
                      const weight = weights[m.id] ?? 1.0;
                      const calculatedShare = liveShares[m.id] || 0;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar name={m.displayName} id={m.id} size="sm" />
                            <div>
                              <span className="font-bold text-xs text-slate-900">{m.displayName}</span>
                              <span className="text-[10px] text-slate-400 block">
                                {weight === 1.0 ? 'Base share' : `${weight}x multiplier`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1 gap-2 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleWeightChange(m.id, -0.5)}
                                className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-extrabold w-8 text-center text-slate-900">
                                {weight.toFixed(1)}x
                              </span>
                              <button
                                type="button"
                                onClick={() => handleWeightChange(m.id, 0.5)}
                                className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="font-extrabold text-xs text-slate-900 num-font w-20 text-right">
                              {formatCurrency(calculatedShare, currency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {splitType === 'equal' && (
              <div className="text-center py-4">
                <span className="text-xs text-slate-500 font-medium">
                  {formatCurrency(totalAmountMinor, currency)} divided equally across{' '}
                  <strong>{selectedMemberIds.length} members</strong> with deterministic integer remainder distribution.
                </span>
              </div>
            )}

            {splitType === 'shared_room' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-slate-900">Room Allocation & Occupancy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room, rIdx) => (
                    <div key={room.roomId} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex justify-between font-bold text-slate-900 mb-2">
                        <span>{room.roomName}</span>
                        <span>{formatCurrency(room.costOverride || 0, currency)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Occupants: {room.occupantMemberIds.map((id) => members.find((m) => m.id === id)?.displayName).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {splitType === 'activity_based' && (
              <div className="text-center py-4">
                <span className="text-xs text-slate-500 font-medium">
                  Only the {selectedMemberIds.length} opted-in participants above will pay for this activity. Other trip members owe ₹0.
                </span>
              </div>
            )}

            {splitType === 'custom' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Custom shares</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter what each selected participant owes. The payer covers any amount left over.
                  </p>
                </div>
                <div className="space-y-3">
                  {members
                    .filter((member) => selectedMemberIds.includes(member.id))
                    .map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50/80 border border-slate-100"
                      >
                        <span className="flex items-center gap-3">
                          <Avatar name={member.displayName} id={member.id} size="sm" />
                          <span className="font-bold text-xs text-slate-900">{member.displayName}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{currency}</span>
                          <input
                            aria-label={`${member.displayName} custom share`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={customShareInputs[member.id] ?? ''}
                            onChange={(event) => setCustomShareInputs((previous) => ({
                              ...previous,
                              [member.id]: event.target.value,
                            }))}
                            placeholder="0.00"
                            className="w-32 text-right bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-indigo-600"
                          />
                        </span>
                      </label>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className="font-semibold text-slate-600">
                    Assigned {formatCurrency(customShareTotalMinor, currency)} of {formatCurrency(totalAmountMinor, currency)}
                  </span>
                  <span className={`font-bold ${isCustomSplitValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isCustomSplitValid
                      ? `${formatCurrency(totalAmountMinor - customShareTotalMinor, currency)} left for payer`
                      : 'Shares must total more than zero and less than the expense'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Sticky Bottom Bar: LIVE SPLIT PREVIEW */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 z-30 shadow-lg">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              LIVE SPLIT PREVIEW
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              {members
                .filter((m) => selectedMemberIds.includes(m.id))
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 text-xs">
                    <Avatar name={m.displayName} id={m.id} size="xs" />
                    <span className="font-semibold text-slate-700">{m.displayName.split(' ')[0]}:</span>
                    <span className="font-extrabold text-slate-900">
                      {formatCurrency(liveShares[m.id] || 0, currency)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL EXPENSE
              </span>
              <span className="text-base font-extrabold text-slate-900 num-font">
                {formatCurrency(totalAmountMinor, currency)}
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={submitting}
              className="btn btn-primary btn-sm px-6 py-2.5 rounded-xl shadow-md"
            >
              {isEditMode ? 'Save Changes' : 'Finalize & Split'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
