import React, { useState } from 'react';
import { CloudRain, MapPin, Users, Car, Utensils, Compass, Activity } from 'lucide-react';
import { getTwinScenario, TwinDestination } from './digitalTwinModel.js';
import { useTrip } from '../context/TripContext.js';

const destinations: TwinDestination[] = ['Goa', 'Munnar', 'Jaipur'];
const nodes: Record<TwinDestination, { x: number; y: number }[]> = {
  Goa: [{ x: 18, y: 30 }, { x: 49, y: 54 }, { x: 76, y: 35 }],
  Munnar: [{ x: 20, y: 58 }, { x: 51, y: 28 }, { x: 78, y: 53 }],
  Jaipur: [{ x: 20, y: 32 }, { x: 50, y: 58 }, { x: 78, y: 30 }],
};
const icons = { transport: Car, activities: Compass, dining: Utensils, movement: Users };

export const DigitalTwinScreen: React.FC = () => {
  const { trip } = useTrip();
  const [destination, setDestination] = useState<TwinDestination>('Goa');
  const [rainfall, setRainfall] = useState(25);
  if (!trip) return null;
  const scenario = getTwinScenario(destination, rainfall);
  const selectedNodes = nodes[destination];

  return <div className="max-w-[1320px] mx-auto px-6 py-8 page-enter space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">TripSync · Digital Twin</p><h2 className="text-3xl font-extrabold text-slate-900 mt-1">Explore a what-if day</h2><p className="text-sm text-slate-500 mt-2">A local scenario sandbox. Changes here do not affect saved trips or ledger balances.</p></div>
      <div className="flex gap-2">{destinations.map(place => <button key={place} onClick={() => setDestination(place)} className={`rounded-xl px-4 py-2 text-sm font-bold ${destination === place ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{place}</button>)}</div>
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>SIMULATED DEMO DATA</strong> · Fabricated weather, reactions, locations, movement and impact estimates. No external services are used.</div>
    <div className="grid lg:grid-cols-5 gap-6">
      <section className="lg:col-span-3 card bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-slate-900">{destination} schematic</h3><p className="text-xs text-slate-400">Illustrative locations · not to scale</p></div><span className="pill pill-active">Demo map</span></div>
        <div className="relative h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-100 border border-slate-100">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={`M ${selectedNodes[0].x} ${selectedNodes[0].y} Q 35 15 ${selectedNodes[1].x} ${selectedNodes[1].y} T ${selectedNodes[2].x} ${selectedNodes[2].y}`} fill="none" stroke="#818cf8" strokeWidth="1.2" strokeDasharray="2 2"/><path d="M0 75 Q30 66 50 83 T100 70" fill="none" stroke="#bae6fd" strokeWidth="5"/></svg>
          {scenario.places.map((place, index) => <div key={place} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${selectedNodes[index].x}%`, top: `${selectedNodes[index].y}%` }}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-indigo-600"><MapPin className="w-4 h-4"/></span><span className="mt-1 block whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow">{place}</span></div>)}
          <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-3 py-2 text-xs text-slate-600"><span className="font-bold text-slate-900">{Math.max(1, Math.round(scenario.estimates.movement))} group clusters</span> · simulated movement</div>
        </div>
      </section>
      <section className="lg:col-span-2 card bg-white border border-slate-200 p-5 space-y-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-50 p-3 text-sky-600"><CloudRain className="w-5 h-5"/></div><div><p className="text-xs text-slate-500">Simulated conditions · {scenario.temperature}°C</p><p className="font-bold text-slate-900">{scenario.weather}</p></div></div>
        <label className="block"><span className="flex justify-between text-sm font-bold text-slate-700"><span>Rainfall scenario</span><span>{rainfall}%</span></span><input aria-label="Rainfall scenario" type="range" min="0" max="100" value={rainfall} onChange={event => setRainfall(Number(event.target.value))} className="mt-3 w-full accent-indigo-600"/><span className="flex justify-between text-[10px] text-slate-400"><span>Clear</span><span>Heavy rain</span></span></label>
        <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Fabricated traveler reactions</p><div className="space-y-2">{scenario.reactions.map(reaction => <p key={reaction} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{reaction}</p>)}</div></div>
      </section>
    </div>
    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{scenario.suggestions.map(item => { const Icon = icons[item.category]; const impact = item.category === 'movement' ? `${item.estimate} group clusters` : `₹${item.estimate.toLocaleString('en-IN')}`; return <article key={item.category} className="card bg-white border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon className="w-4 h-4"/></span><span className="text-sm font-extrabold text-slate-900">{impact} <small className="text-[9px] text-slate-400">est.</small></span></div><h3 className="mt-3 capitalize font-bold text-slate-900">{item.category}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.text}</p><p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400"><Activity className="h-3 w-3"/>Simulated scenario impact</p></article>})}</section>
    <p className="text-center text-[11px] text-slate-400">All Twin values are generated locally for this session. Your actual {trip.name} expenses and balances remain unchanged.</p>
  </div>;
};
