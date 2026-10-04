import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  HeartHandshake, 
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  MapPin,
  Sparkles
} from 'lucide-react';
import { GraphData, GraphNode } from '../types';

interface TrialMatcherProps {
  graphData: GraphData;
}

export const TrialMatcher: React.FC<TrialMatcherProps> = ({ graphData }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all symptoms, diseases, trials, patient groups

  const diseases = useMemo(() => {
    return graphData.nodes.filter((n) => n.type === 'disease');
  }, [graphData]);

  const trials = useMemo(() => {
    return graphData.nodes.filter((n) => n.type === 'trial');
  }, [graphData]);

  const patientGroups = useMemo(() => {
    return graphData.nodes.filter((n) => n.type === 'patient_group');
  }, [graphData]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((s) => s !== symptomId) : [...prev, symptomId]
    );
  };

  // Edge endpoints may have been replaced by node objects by the force-graph renderer
  const edgeEnds = (e: any): [string, string] => [
    typeof e.source === 'object' ? e.source.id : e.source,
    typeof e.target === 'object' ? e.target.id : e.target,
  ];

  // Symptom ids attached to each trial: its disease's phenotypes plus any symptom the trial targets directly
  const trialSymptoms = useMemo(() => {
    const phenotypesByDisease = new Map<string, Set<string>>();
    graphData.edges.forEach((e: any) => {
      if (e.relationship !== 'HAS_PHENOTYPE') return;
      const [d, s] = edgeEnds(e);
      if (!phenotypesByDisease.has(d)) phenotypesByDisease.set(d, new Set());
      phenotypesByDisease.get(d)!.add(s);
    });
    const byTrial = new Map<string, Set<string>>();
    graphData.edges.forEach((e: any) => {
      const [src, tgt] = edgeEnds(e);
      if (e.relationship === 'INVESTIGATED_IN') {
        const set = byTrial.get(tgt) ?? new Set<string>();
        phenotypesByDisease.get(src)?.forEach((s) => set.add(s));
        byTrial.set(tgt, set);
      } else if (e.relationship === 'PRIMARY_OUTCOME_TARGETS') {
        const set = byTrial.get(src) ?? new Set<string>();
        set.add(tgt);
        byTrial.set(src, set);
      }
    });
    return byTrial;
  }, [graphData]);

  // Only offer symptoms that can match at least one trial
  const symptoms = useMemo(() => {
    const relevant = new Set<string>();
    trialSymptoms.forEach((set) => set.forEach((s) => relevant.add(s)));
    return graphData.nodes
      .filter((n) => n.type === 'symptom' && relevant.has(n.id))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [graphData, trialSymptoms]);

  // Filter trials based on criteria
  const matchedTrials = useMemo(() => {
    return trials.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        t.label.toLowerCase().includes(q) ||
        (t.nct_id && t.nct_id.toLowerCase().includes(q)) ||
        (t.sponsor && t.sponsor.toLowerCase().includes(q)) ||
        (t.intervention && t.intervention.toLowerCase().includes(q));

      const symptomSet = trialSymptoms.get(t.id);
      const matchSymptoms = selectedSymptoms.every((s) => symptomSet?.has(s));

      return matchQuery && matchSymptoms;
    });
  }, [trials, searchQuery, selectedSymptoms, trialSymptoms]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 rounded-full flex items-center space-x-1">
            <FlaskConical className="h-3 w-3" />
            <span>Clinical & Registry Discovery</span>
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Clinical Trial & Registry Finder
        </h1>
        <p className="text-xs text-slate-500 max-w-3xl">
          Find registered clinical trials and natural-history studies (with their current ClinicalTrials.gov status) and the patient organizations and registries linked in the atlas.
        </p>
      </div>

      {/* Symptom Cluster Selection Bar */}
      <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>Select Phenotype / Symptom Cluster (HPO Terms)</span>
          </span>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => setSelectedSymptoms([])}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Clear selections
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {symptoms.map((s) => {
            const isSelected = selectedSymptoms.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-100 text-amber-700 border-amber-200 ring-1 ring-amber-400/30'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span>{s.label}</span>
                {s.hpo_id && <span className="text-[10px] text-slate-500 font-mono">({s.hpo_id})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by trial title, NCT ID, drug intervention, or sponsor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Grid of Matched Clinical Trials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FlaskConical className="h-4 w-4 text-purple-600" />
            <span>Clinical Trials & Studies ({matchedTrials.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedTrials.map((trial) => (
            <div
              key={trial.id}
              className="bg-white border border-slate-200 hover:border-purple-200 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {trial.label}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border shrink-0 ${
                    ['recruiting', 'not yet recruiting', 'enrolling by invitation'].includes((trial.status || '').toLowerCase())
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {trial.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>Phase: <strong className="text-slate-800">{trial.phase}</strong></div>
                  <div>Sponsor: <strong className="text-slate-800">{trial.sponsor}</strong></div>
                </div>

                {trial.intervention && (
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">
                      Intervention / Compound:
                    </span>
                    {trial.intervention}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-slate-500 truncate max-w-[200px]">
                  <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="truncate text-[11px]">{trial.locations}</span>
                </div>

                <a
                  href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-xs flex items-center space-x-1 shadow-md shadow-purple-600/20"
                >
                  <span>{trial.nct_id}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Advocacy Registries Directory */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <HeartHandshake className="h-4 w-4 text-pink-600" />
          <span>Patient Organizations & Registries ({patientGroups.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patientGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-slate-200 hover:border-pink-200 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-pink-700 text-xs">{group.label}</h3>
                  <span className="text-[10px] text-slate-500">{group.country}</span>
                </div>

                <div className="text-[11px] text-slate-700 bg-pink-50 p-2.5 rounded-xl border border-pink-100 space-y-0.5">
                  <div>Focus: {group.focus}</div>
                  {group.contact_email && <div className="text-slate-500">Email (published by the organization): {group.contact_email}</div>}
                  {group.last_verified && <div className="text-[10px] text-slate-500">Links checked {group.last_verified}</div>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                {group.registry_url ? (
                  <a
                    href={group.registry_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline flex items-center space-x-1 text-[11px]"
                  >
                    <span>Patient Registry</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : group.contact_url ? (
                  <a href={group.contact_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline flex items-center space-x-1 text-[11px]">
                    <span>Contact</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500">No registry link found</span>
                )}
                <a
                  href={group.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-900 flex items-center space-x-1 text-[11px]"
                >
                  <span>Website</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
