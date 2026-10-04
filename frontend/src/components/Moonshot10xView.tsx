import React, { useEffect, useMemo, useState } from 'react';
import { Zap, Clock, CheckCircle2, AlertTriangle, ExternalLink, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { MoonshotData } from '../types';
import { fetchMoonshot10x } from '../services/api';

export const Moonshot10xView: React.FC = () => {
  const [data, setData] = useState<MoonshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [baselineId, setBaselineId] = useState('conservative');
  const [months, setMonths] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMoonshot10x()
      .then((res) => {
        setData(res);
        setMonths(Object.fromEntries(res.route.stages.map((s) => [s.id, s.default_months])));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const baseline = data?.baselines.find((b) => b.id === baselineId) ?? data?.baselines[0];
  const routeMonths = useMemo(() => Object.values(months).reduce((a, b) => a + b, 0), [months]);
  const speedup = baseline && routeMonths > 0 ? baseline.months / routeMonths : 0;
  const reaches10x = speedup >= 10;

  if (loading) return <div className="py-16 text-center text-slate-500">Loading the 10× case...</div>;
  if (!data || !baseline) return <div className="py-16 text-center text-slate-500">The 10× case could not be loaded.</div>;

  const eventsById = Object.fromEntries(data.events.map((e) => [e.id, e]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 via-white to-emerald-50 border border-purple-200 rounded-2xl p-6 shadow-2xl space-y-2">
        <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 rounded-full inline-flex items-center space-x-1">
          <Zap className="h-3 w-3" />
          <span>The 10× Moonshot</span>
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Milestone: {data.milestone}</h1>
        <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
          Case study: <strong>{data.case_study}</strong>. The baseline is measured from dated public records (checked {data.sources_checked}).
          The atlas route is built only from the assumptions below; change them to see when 10× holds and when it does not.
        </p>
      </div>

      {/* Result */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Baseline (measured)</span>
          <div className="text-3xl font-black text-slate-900">{baseline.months} <span className="text-base font-semibold text-slate-500">months</span></div>
          <p className="text-[11px] text-slate-500">{baseline.label}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Atlas route (assumed)</span>
          <div className="text-3xl font-black text-slate-900">{routeMonths.toFixed(1)} <span className="text-base font-semibold text-slate-500">months</span></div>
          <p className="text-[11px] text-slate-500">
            Range with the stated limits: {data.route.best_case_months}–{data.route.worst_case_months} months
          </p>
        </div>
        <div className={`rounded-2xl p-5 space-y-1 border ${reaches10x ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Acceleration</span>
          <div className={`text-3xl font-black ${reaches10x ? 'text-emerald-700' : 'text-amber-700'}`}>{speedup.toFixed(1)}×</div>
          <p className="text-[11px] text-slate-700">
            {reaches10x
              ? 'These assumptions reach 10×.'
              : `10× needs the atlas route to take ${baseline.months_needed_for_10x} months or less.`}
          </p>
        </div>
      </div>

      {/* Baseline timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span>What actually happened (sourced)</span>
          </h2>
          <div className="flex gap-2">
            {data.baselines.map((b) => (
              <button
                key={b.id}
                onClick={() => setBaselineId(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  b.id === baseline.id ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                }`}
              >
                {b.id === 'conservative' ? 'Conservative baseline' : 'Registered-study baseline'}
              </button>
            ))}
          </div>
        </div>
        <ol className="space-y-2 text-xs">
          {data.events.map((e) => {
            const inRange = e.date >= eventsById[baseline.from].date && e.date <= eventsById[baseline.to].date;
            return (
              <li key={e.id} className={`flex items-start gap-3 ${inRange ? 'text-slate-800' : 'text-slate-500'}`}>
                <span className="font-mono w-24 shrink-0">{e.date}</span>
                <span className="flex-1">
                  {e.label}{' '}
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline inline-flex items-center">
                    {e.source} <ExternalLink className="h-3 w-3 ml-0.5" />
                  </a>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-[11px] text-slate-500">{baseline.note}</p>
      </div>

      {/* Assumptions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            <span>Atlas route: assumptions to test</span>
          </h2>
          <button
            onClick={() => setMonths(Object.fromEntries(data.route.stages.map((s) => [s.id, s.default_months])))}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
        {data.route.stages.map((s) => (
          <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{s.label}</span>
              <span className="font-mono text-emerald-700">{months[s.id]?.toFixed(2)} months</span>
            </div>
            <input
              type="range"
              min={s.min_months}
              max={s.max_months}
              step={0.25}
              value={months[s.id] ?? s.default_months}
              onChange={(e) => setMonths({ ...months, [s.id]: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{s.min_months} mo</span>
              <span>default {s.default_months} mo</span>
              <span>{s.max_months} mo</span>
            </div>
            <p className="text-slate-700"><strong className="text-slate-800">Assumption:</strong> {s.assumption}</p>
            <p className="text-slate-500"><strong className="text-slate-700">Atlas feature:</strong> {s.atlas_feature}</p>
            <p className="text-amber-800 flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span><strong>To validate:</strong> {s.validate}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Caveats */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2 text-xs">
        <h2 className="text-sm font-bold text-amber-800 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Caveats</span>
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {data.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
