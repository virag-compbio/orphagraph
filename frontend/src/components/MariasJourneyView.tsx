import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Copy, 
  Check, 
  ChevronRight, 
  Database, 
  Microscope, 
  HeartHandshake, 
  FileText,
  AlertTriangle,
  Zap,
  ExternalLink
} from 'lucide-react';
import { MariasJourney, GraphNode, Explanation, PersonaType } from '../types';
import { fetchMariasJourney, fetchDiseases, fetchJourneyExplanation } from '../services/api';
import { ExplanationPanel } from './ExplanationPanel';
import { NODE_CONFIG } from '../utils/colors';
import { withBold } from '../utils/richText';

// The primary pathway's own description when it has one (curated records); for imported Reactome
// pathways, which carry none, the record itself: source, identifier, size and how widely it is shared.
const PathwayDetails: React.FC<{ mechanism: MariasJourney['step2_mechanism'] }> = ({ mechanism }) => {
  const p = mechanism.connecting_pathway;
  if (!p) {
    return <p className="text-slate-500 mt-1 leading-relaxed">No disrupted pathway is recorded for this condition in the atlas.</p>;
  }
  const dbId = p.database_id;
  const reactomeId = dbId?.startsWith('REACTOME:') ? dbId.slice('REACTOME:'.length) : undefined;
  const shared = mechanism.connecting_pathway_shared_with;
  return (
    <div className="mt-1 space-y-1.5 text-slate-500 leading-relaxed">
      {p.description && <p>{p.description}</p>}
      <p>
        {[p.source, p.size ? `${p.size} genes` : null].filter(Boolean).join(' · ')}
        {dbId && (
          <>
            {' · '}
            {reactomeId ? (
              <a href={`https://reactome.org/content/detail/${reactomeId}`} target="_blank" rel="noreferrer"
                 className="text-cyan-700 hover:underline">{reactomeId}</a>
            ) : dbId}
          </>
        )}
      </p>
      <p>
        {shared > 0
          ? `Shared with ${shared} related disease${shared === 1 ? '' : 's'} in the atlas.`
          : 'Not shared with another disease in the atlas.'}
      </p>
      {mechanism.other_pathways.length > 0 && (
        <p>
          <span className="text-slate-700 font-medium">Also recorded: </span>
          {mechanism.other_pathways.slice(0, 4).map(o => o.label).join('; ')}
          {mechanism.other_pathways.length > 4 && ` and ${mechanism.other_pathways.length - 4} more`}
        </p>
      )}
    </div>
  );
};

export const MariasJourneyView: React.FC<{ persona: PersonaType }> = ({ persona }) => {
  const [diseases, setDiseases] = useState<GraphNode[]>([]);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('DIS_NGLY1');
  const [journey, setJourney] = useState<MariasJourney | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Fetch the LLM explanation when step 2 is shown (cached on the server after the first run)
  useEffect(() => {
    if (currentStep !== 2) return;
    let cancelled = false;
    setExplanation(null);
    setExplaining(true);
    fetchJourneyExplanation(selectedDiseaseId, persona)
      .then((data) => !cancelled && setExplanation(data))
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setExplaining(false));
    return () => {
      cancelled = true;
    };
  }, [currentStep, selectedDiseaseId, persona]);

  useEffect(() => {
    fetchDiseases().then((res) => {
      setDiseases(res.diseases);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMariasJourney(selectedDiseaseId)
      .then((data) => {
        setJourney(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedDiseaseId]);

  const handleCopyEmail = () => {
    if (!journey) return;
    navigator.clipboard.writeText(journey.step4_action.draft_proposal_email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { num: 1, title: '1. Isolated Diagnosis', icon: AlertTriangle, color: 'text-red-600' },
    { num: 2, title: '2. Disrupted Mechanism', icon: Layers, color: 'text-cyan-600' },
    { num: 3, title: '3. Reusable Assets & KOLs', icon: Database, color: 'text-yellow-700' },
    { num: 4, title: '4. Action This Week', icon: Zap, color: 'text-emerald-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-cyan-50 border border-emerald-200 rounded-2xl p-6 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Maria's 1-Click Guided Journey</span>
            </span>
          </div>

          {/* Disease Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Diagnosis Focus:</span>
            <select
              value={selectedDiseaseId}
              onChange={(e) => {
                setSelectedDiseaseId(e.target.value);
                setCurrentStep(1);
              }}
              className="bg-slate-50 text-slate-900 text-xs font-semibold border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {diseases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.code || d.omim})
                </option>
              ))}
            </select>
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          From an Isolated Diagnosis to a Concrete Sourced Proposal
        </h1>
        <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
          Follow Maria—a patient organization leader—as she moves from an untreated ultra-rare diagnosis to a shared biological mechanism, existing experimental models, and a concrete collaborative proposal she can send this week.
        </p>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                  isActive
                    ? 'bg-white border-emerald-300 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/30'
                    : isCompleted
                    ? 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300'
                    : 'bg-slate-50/40 border-slate-200 text-slate-500 hover:text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <div className="truncate">
                  <div className={`text-xs font-bold truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    {s.title.split('. ')[1]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Body */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading Maria's guided journey...</div>
      ) : journey ? (
        <div className="space-y-6">
          {/* STEP 1: ISOLATED DIAGNOSIS */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 rounded-md">
                    Step 1 of 4: The Starting Point
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    {journey.step1_diagnosis.step_title}
                  </h2>
                </div>
              </div>

              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  "{journey.step1_diagnosis.prompt}"
                </p>
                <p className="text-slate-500">
                  Status: <strong className="text-red-600">{journey.step1_diagnosis.status}</strong> Maria needs to know who else shares her disease characteristics and what already exists.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                    Condition Overview
                  </h3>
                  <div>Disease: <strong className="text-slate-900">{journey.step1_diagnosis.disease.label}</strong></div>
                  <div>Orphanet Code: <strong className="text-emerald-600 font-mono">{journey.step1_diagnosis.disease.code}</strong></div>
                  <div>OMIM Number: <strong className="text-blue-600 font-mono">#{journey.step1_diagnosis.disease.omim}</strong></div>
                  <div>Prevalence: <strong className="text-slate-800">{journey.step1_diagnosis.disease.prevalence}</strong></div>
                  <p className="text-slate-500 pt-1 leading-relaxed">
                    {journey.step1_diagnosis.disease.description}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">
                      Maria's 3 Key Questions
                    </h3>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start space-x-2">
                        <span className="font-bold text-cyan-600">Q1:</span>
                        <span><strong>Who shares our disease characteristics?</strong> (Hidden mechanistic & phenotypic overlap)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="font-bold text-yellow-700">Q2:</span>
                        <span><strong>What useful work already exists?</strong> (Reusable registries, iPSC lines, biomarker assays)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="font-bold text-emerald-600">Q3:</span>
                        <span><strong>What should we do together next?</strong> (A concrete action Maria can take this week)</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                  >
                    <span>Proceed to Step 2: Uncover Disrupted Mechanism</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DISRUPTED MECHANISM */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-md">
                    Step 2 of 4: Organizing by Mechanism, Not Disease Name
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    {journey.step2_mechanism.step_title}
                  </h2>
                </div>
              </div>

              <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200 text-xs text-cyan-800 leading-relaxed">
                <span className="font-bold text-cyan-700 uppercase tracking-wider text-[10px] block mb-1">
                  Key Insight
                </span>
                {journey.step2_mechanism.insight}
              </div>

              {journey.step2_mechanism.literature.claims.length > 0 && (
                <details className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <summary className="cursor-pointer font-bold text-slate-800">
                    Literature evidence: {journey.step2_mechanism.literature.claims.length} claim(s) from{' '}
                    {journey.step2_mechanism.literature.n_papers} PubMed paper(s)
                    {journey.step2_mechanism.literature.contradictions.length > 0 && (
                      <span className="ml-2 text-red-600">{journey.step2_mechanism.literature.contradictions.length} contradicting</span>
                    )}
                    <span className="block font-normal text-[10px] text-slate-500 mt-0.5">
                      Extracted automatically by the local model; every quote was checked word for word against the abstract.
                    </span>
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {journey.step2_mechanism.literature.claims.map((c, ci) => (
                      <li
                        key={ci}
                        className={`p-2.5 rounded-lg border ${c.contradicts ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                      >
                        <div className="text-slate-800">
                          <strong>{c.subject}</strong> {c.relation} <strong>{c.object}</strong>
                          {c.contradicts && <span className="ml-2 text-red-700 font-semibold">contradicts a recorded positive claim</span>}
                        </div>
                        {c.evidence.slice(0, 2).map((ev) => (
                          <div key={ev.pmid} className="mt-1 text-[11px] text-slate-500">
                            <span className="italic">"{ev.quote}"</span>{' '}
                            <a
                              href={`https://pubmed.ncbi.nlm.nih.gov/${ev.pmid}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:underline"
                            >
                              PMID {ev.pmid}
                            </a>
                            {ev.year ? ` (${ev.year})` : ''} · {ev.context.replace('_', ' ')}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <ExplanationPanel explanation={explanation} loading={explaining} title={`Explained for ${persona === 'dr_osei' ? 'Dr. Osei' : persona.charAt(0).toUpperCase() + persona.slice(1)}`} />

              {journey.step2_mechanism.related_diseases.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {journey.step2_mechanism.related_diseases.map((r) => (
                    <span
                      key={r.disease_id}
                      className={`px-2.5 py-1 rounded-lg border ${
                        r.basis === 'mechanism'
                          ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                          : 'bg-slate-100/60 text-slate-700 border-slate-300'
                      }`}
                    >
                      <strong>{r.label}</strong>
                      {' · '}
                      {r.basis === 'mechanism'
                        ? `${r.shared_genes.length ? `same gene ${r.shared_genes.join(', ')} · ` : ''}${r.shared_pathways.slice(0, 2).join(', ')}${r.shared_pathways.length > 2 ? ` +${r.shared_pathways.length - 2}` : ''}`
                        : `phenotype only: ${r.shared_phenotypes.slice(0, 3).map((p) => p.label).join(', ')}`}
                      {` · similarity ${r.phenotype_similarity.toFixed(2)}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-cyan-600" />
                    <span>Disrupted Intracellular Pathway</span>
                  </h3>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-sm font-bold text-cyan-700 block">
                      {journey.step2_mechanism.primary_mechanism}
                    </span>
                    <PathwayDetails mechanism={journey.step2_mechanism} />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Cross-Targeted Repurposing Leads</span>
                  </h3>
                  <div className="space-y-2">
                    {journey.step2_mechanism.repurposing_leads.map((drug, di) => (
                      <div key={di} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-700 block">{drug.label}</span>
                          <span className="text-[10px] text-slate-500">{drug.fda_status}{drug.evidence_tier ? ` · ${drug.evidence_tier.replace(/_/g, ' ').toLowerCase()}` : ''}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">
                          {Math.round((drug.repurposing_confidence || 0.85) * 100)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                  {journey.step2_mechanism.contraindications.map((c, ci) => (
                    <div key={ci} className="bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-700 block">Caution: {c.label}</span>
                        {c.reason && <span className="text-[10px] text-red-800">{c.reason}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ← Back to Step 1
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <span>Proceed to Step 3: Discover Reusable Assets</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REUSABLE ASSETS & KOLS */}
          {currentStep === 3 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-md">
                    Step 3 of 4: Preventing Duplication of Effort
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    {journey.step3_assets.step_title}
                  </h2>
                </div>
              </div>

              <p className="text-xs text-slate-700">
                Existing assets and investigators linked in the atlas to this condition, or to diseases that share its disrupted mechanism. Assets built for another disease need expert review before reuse.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reusable Assets */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <Database className="h-4 w-4 text-yellow-700" />
                    <span>Reusable Experimental & Clinical Assets</span>
                  </h3>
                  <div className="space-y-2.5">
                    {journey.step3_assets.reusable_assets.length === 0 && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        No reusable assets are linked to this condition or its mechanism neighbours in the atlas yet.
                      </p>
                    )}
                    {journey.step3_assets.reusable_assets.map((asset, ai) => (
                      <div key={ai} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-yellow-700">{asset.name}</span>
                          <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded border border-slate-300 shrink-0">
                            {asset.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Custodian: <strong className="text-slate-800">{asset.custodian}</strong>
                          {' · '}Built for: <strong className="text-slate-800">{asset.for_disease}</strong>
                          {' · '}{asset.evidence_tier.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-[11px] text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                          {asset.reusability}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Opinion Leaders */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                    <Microscope className="h-4 w-4 text-blue-600" />
                    <span>Identified Key Opinion Leaders & Investigators</span>
                  </h3>
                  <div className="space-y-2.5">
                    {journey.step3_assets.key_collaborators.length === 0 && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        No investigators are linked to this condition or its mechanism neighbours in the atlas yet.
                      </p>
                    )}
                    {journey.step3_assets.key_collaborators.map((kol, ki) => (
                      <div key={ki} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{kol.name}</span>
                          <span className="text-[11px] text-slate-500 block">{kol.institution}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          Role: <strong className="text-blue-700">{kol.role}</strong>
                        </div>
                        <div className="pt-1 border-t border-slate-200 text-[11px] space-y-1">
                          <div className="text-emerald-700">Why linked: {kol.connection}</div>
                          {kol.other_diseases.length > 0 && (
                            <div className="text-amber-700">Bridges communities: {kol.other_diseases.join(', ')}</div>
                          )}
                          {kol.papers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {kol.papers.map((p) => (
                                <a
                                  key={p}
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${p}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 hover:underline font-mono"
                                >
                                  PMID {p}
                                </a>
                              ))}
                            </div>
                          )}
                          {kol.email && <div className="text-slate-500 font-mono">{kol.email}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ← Back to Step 2
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <span>Proceed to Step 4: Sourced Action This Week</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ACTION THIS WEEK & PROPOSAL */}
          {currentStep === 4 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md">
                    Step 4 of 4: Turning Connections into Immediate Action
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    {journey.step4_action.step_title}
                  </h2>
                </div>
              </div>

              {/* Action Checklist */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center space-x-1.5">
                  <Zap className="h-4 w-4" />
                  <span>Concrete Actions Maria Can Take This Week</span>
                </h3>
                <div className="space-y-2 text-xs text-emerald-800">
                  {journey.step4_action.action_this_week.map((act, ai) => (
                    <div key={ai} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{withBold(act)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Proposal Email */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>AI-Generated Sourced Outreach Proposal</span>
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium border border-slate-300 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Proposal Text'}</span>
                  </button>
                </div>

                <pre className="text-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed bg-white/80 p-4 rounded-lg border border-slate-200">
                  {journey.step4_action.draft_proposal_email}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ← Back to Step 3
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Journey Complete: Ready to Collaborate</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
