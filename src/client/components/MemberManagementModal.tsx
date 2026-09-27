import React, { useState } from 'react';
import { X, UserPlus, LogOut, Check, AlertCircle, Shield } from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { Avatar } from './Avatar.js';
import { formatDate } from '../utils/formatters.js';

export const MemberManagementModal: React.FC = () => {
  const {
    isMemberModalOpen,
    closeMemberModal,
    members,
    addMember,
    markMemberLeft,
    trip,
  } = useTrip();

  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<'participant' | 'organizer'>('participant');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isMemberModalOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    try {
      await addMember(displayName.trim(), email.trim() || undefined, role);
      setDisplayName('');
      setEmail('');
      setIsAdding(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkLeft = async (memberId: string, name: string) => {
    const confirm = window.confirm(
      `Mark ${name} as left mid-trip?\n\nThey will remain liable for past shared bookings up to today, but will be excluded from new/future bookings.`
    );
    if (!confirm) return;

    try {
      await markMemberLeft(memberId);
    } catch (err: any) {
      alert(err.message || 'Failed to update member status');
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeMemberModal}>
      <div className="modal-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">Trip Members ({members.length})</h3>
            <p className="text-xs text-slate-500">
              Manage participants and simulate dynamic mid-trip group changes
            </p>
          </div>
          <button
            onClick={closeMemberModal}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member List */}
        <div className="my-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {members.map((m) => {
            const isLeft = !!m.leftAt;
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isLeft
                    ? 'bg-slate-50/60 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={m.displayName} id={m.id} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{m.displayName}</span>
                      {m.role === 'organizer' && (
                        <span className="pill pill-active text-[10px] py-0.5 px-2">Host</span>
                      )}
                      {isLeft && (
                        <span className="pill pill-unpaid text-[10px] py-0.5 px-2">
                          Left {formatDate(m.leftAt)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Joined {formatDate(m.joinedAt)} {m.email ? `• ${m.email}` : ''}
                    </span>
                  </div>
                </div>

                <div>
                  {!isLeft && m.role !== 'organizer' && (
                    <button
                      onClick={() => handleMarkLeft(m.id, m.displayName)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                      title="Simulate leaving mid-trip"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Mark Left
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Member Toggle / Form */}
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            + Add New Member to Trip
          </button>
        ) : (
          <form onSubmit={handleAdd} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900">Add New Participant</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-indigo-600"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="maya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-4 text-[11px] text-slate-400 text-center">
          ⚡ Adding or removing members dynamically recalculates all active trip dues on the server.
        </p>
      </div>
    </div>
  );
};
