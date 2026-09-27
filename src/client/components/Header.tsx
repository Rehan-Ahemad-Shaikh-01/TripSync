import React from 'react';
import { useTrip } from '../context/TripContext.js';
import { Avatar, AvatarStack } from './Avatar.js';
import { Sparkles, Plus, Wallet, Users, Compass, UserCheck, RefreshCw, CloudRain } from 'lucide-react';
import { formatDate } from '../utils/formatters.js';

export const Header: React.FC = () => {
  const {
    trip,
    trips,
    tripId,
    selectTrip,
    members,
    activeScreen,
    navigateTo,
    currentMemberId,
    setCurrentMemberId,
    currentMember,
    isOrganizer,
    openMemberModal,
    reseed,
  } = useTrip();

  if (!trip) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Main Bar */}
      <div className="max-w-[1320px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Brand & Trip Title */}
        <div className="flex items-center gap-4 flex-wrap">
          <div
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img
              src="/tripsync-logo.svg"
              alt=""
              className="w-9 h-9 rounded-full object-contain shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              TripSync
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Trip Info Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <select aria-label="Choose trip" value={tripId} onChange={event => selectTrip(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700">
              {trips.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <h1 className="font-bold text-base text-slate-900">{trip.name}</h1>
            <span
              className={`pill text-[11px] capitalize ${
                trip.status === 'active'
                  ? 'pill-active'
                  : trip.status === 'settled'
                  ? 'pill-settled'
                  : 'pill-warning'
              }`}
            >
              {trip.status}
            </span>
          </div>
        </div>

        {/* Right: Actions, Navigation, Member Switcher */}
        <div className="flex items-center gap-3">
          {/* Members Avatar Stack */}
          <div
            onClick={openMemberModal}
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
            title="Manage Trip Members"
          >
            <AvatarStack members={members} max={4} size="sm" />
            <span className="text-xs font-semibold text-slate-600">
              {members.length > 4 ? `and ${members.length - 4} more` : `${members.length} members`}
            </span>
          </div>

          {/* "+ Add booking/expense" CTA */}
          <button
            onClick={() => navigateTo('item_editor')}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add booking/expense</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Member Perspective Switcher Dropdown */}
          <div className="relative flex items-center bg-slate-100 hover:bg-slate-200 rounded-xl p-1 transition-colors">
            <select
              value={currentMemberId}
              onChange={(e) => setCurrentMemberId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 pr-2 pl-1 py-1 focus:outline-none cursor-pointer"
              title="Switch user perspective"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role})
                </option>
              ))}
            </select>
            {currentMember && (
              <Avatar name={currentMember.displayName} id={currentMember.id} size="xs" className="mr-1" />
            )}
          </div>

          {/* Ensure Demo Data Button */}
          <button
            onClick={reseed}
            title="Ensure demo trips are present"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="max-w-[1320px] mx-auto px-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold overflow-x-auto">
        <div className="flex items-center gap-1 py-1">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeScreen === 'dashboard'
                ? 'text-indigo-600 bg-indigo-50/70 font-bold border-b-2 border-indigo-600 rounded-b-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => navigateTo('digital_twin')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${activeScreen === 'digital_twin' ? 'text-indigo-600 bg-indigo-50/70 font-bold border-b-2 border-indigo-600 rounded-b-none' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <CloudRain className="w-3.5 h-3.5" /> Digital Twin
          </button>
          <button
            onClick={() => navigateTo('personal')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeScreen === 'personal'
                ? 'text-indigo-600 bg-indigo-50/70 font-bold border-b-2 border-indigo-600 rounded-b-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            My Personal View
          </button>

          <button
            onClick={() => navigateTo('settle')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeScreen === 'settle'
                ? 'text-indigo-600 bg-indigo-50/70 font-bold border-b-2 border-indigo-600 rounded-b-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Settle Up
          </button>

          <button
            onClick={() => navigateTo('ai_parser')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeScreen === 'ai_parser'
                ? 'text-indigo-600 bg-indigo-50/70 font-bold border-b-2 border-indigo-600 rounded-b-none'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AI Itinerary Parser
          </button>

          <button
            onClick={openMemberModal}
            className="px-3 py-2 rounded-lg transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Members ({members.length})
          </button>
        </div>

        <div className="hidden md:flex items-center text-slate-400 text-[11px] gap-2 py-1">
          <span>📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
          <span>•</span>
          <span>Currency: {trip.baseCurrency}</span>
        </div>
      </div>
    </header>
  );
};
