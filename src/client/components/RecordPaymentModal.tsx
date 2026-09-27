import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, Wallet, ArrowRight } from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { PaymentMethod } from '../../core/types.js';

export const RecordPaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    closePaymentModal,
    members,
    costItems,
    currentMemberId,
    recordPayment,
    trip,
  } = useTrip();

  const [fromMemberId, setFromMemberId] = useState<string>(currentMemberId || members[0]?.id || '');
  const [destinationType, setDestinationType] = useState<'pool' | 'member' | 'vendor'>('pool');
  const [toMemberId, setToMemberId] = useState<string>('');
  const [appliesToCostItemId, setAppliesToCostItemId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isPaymentModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const minorAmount = Math.round(num * 100);
      await recordPayment({
        fromMemberId,
        toPool: destinationType === 'pool',
        toMemberId: destinationType === 'member' ? toMemberId : null,
        appliesToCostItemId: appliesToCostItemId || null,
        amount: minorAmount,
        currency: trip?.baseCurrency || 'INR',
        method,
        notes,
      });
      closePaymentModal();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closePaymentModal}>
      <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Record a Payment</h3>
              <p className="text-xs text-slate-500">Log money paid toward the trip or settled directly</p>
            </div>
          </div>
          <button
            onClick={closePaymentModal}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Who paid */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Who is paying?</label>
            <select
              value={fromMemberId}
              onChange={(e) => setFromMemberId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-indigo-600"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Amount ({trip?.baseCurrency || 'INR'})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">
                {trip?.baseCurrency === 'INR' ? '₹' : '$'}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 font-bold text-slate-900 text-sm focus:outline-indigo-600"
              />
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Payment Destination</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDestinationType('pool')}
                className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                  destinationType === 'pool'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Trip Smart Pool
              </button>
              <button
                type="button"
                onClick={() => setDestinationType('member')}
                className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                  destinationType === 'member'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Direct to Member
              </button>
              <button
                type="button"
                onClick={() => setDestinationType('vendor')}
                className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                  destinationType === 'vendor'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Direct to Vendor
              </button>
            </div>
          </div>

          {destinationType === 'member' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Recipient Member</label>
              <select
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-indigo-600"
                required
              >
                <option value="">Select recipient...</option>
                {members
                  .filter((m) => m.id !== fromMemberId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Applies to Cost Item */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Applies to Booking / Expense (Optional)
            </label>
            <select
              value={appliesToCostItemId}
              onChange={(e) => setAppliesToCostItemId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-indigo-600"
            >
              <option value="">General contribution / No specific item</option>
              {costItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({(item.totalAmount / 100).toFixed(2)} {item.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-indigo-600"
              >
                <option value="upi">UPI / Instant Pay</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Scuba advance"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-900 focus:outline-indigo-600"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={closePaymentModal} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
