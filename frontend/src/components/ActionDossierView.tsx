import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Sparkles, 
  Microscope, 
  UserCheck, 
  HeartHandshake, 
  ExternalLink, 
  FlaskConical, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  ChevronRight,
  ArrowUpRight,
  Layers,
  Activity,
  Stethoscope,
  Building2,
  Database
} from 'lucide-react';
import { ActionDossier, GraphNode, PersonaType } from '../types';
import { fetchDiseases, fetchActionDossier } from '../services/api';
import { formatConfidence } from '../utils/colors';
import { withBold } from '../utils/richText';

interface ActionDossierViewProps {
  selectedDiseaseId?: string;
  currentPersona: PersonaType;
}

export const ActionDossierView: React.FC<ActionDossierViewProps> = ({
  selectedDiseaseId,
  currentPersona
}) => {
  const [diseases, setDiseases] = useState<GraphNode[]>([]);
  const [activeDiseaseId, setActiveDiseaseId] = useState<string>(selectedDiseaseId || 'DIS_NGLY1');
  const [dossier, setDossier] = useState<ActionDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<PersonaType>('maria');

  useEffect(() => {
    setActiveSubTab(currentPersona);
  }, [currentPersona]);

  useEffect(() => {
    fetchDiseases().then((data) => {
      setDiseases(data.diseases);
      if (!selectedDiseaseId && data.diseases.length > 0) {
        setActiveDiseaseId(data.diseases[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedDiseaseId) {
      setActiveDiseaseId(selectedDiseaseId);
    }
  }, [selectedDiseaseId]);

  useEffect(() => {
    if (!activeDiseaseId) return;
    setLoading(true);
    fetchActionDossier(activeDiseaseId)
      .then((data) => setDossier(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [activeDiseaseId]);

  const handleExportJSON = () => {
    if (!dossier) return;
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OrphagraphAtlas_Dossier_${dossier.disease.code || dossier.disease.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Disease Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Evidence-Backed Action Engine</span>
            </span>
            <span className="text-xs text-slate-500">Persona-Tailored Translation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Rare Disease Action Dossier
          </h1>
          <p className="text-xs text-slate-500">
            Translating biomedical knowledge graph connections into immediate next steps for Maria, Devon, Priya, and Dr. Osei.
          </p>
        </div>

        {/* Disease Dropdown & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeDiseaseId}
            onChange={(e) => setActiveDiseaseId(e.target.value)}
            className="bg-slate-50 text-slate-900 text-xs font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner min-w-[240px]"
          >
            {diseases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.code || d.omim})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl transition-colors shadow-sm"
            title="Download structured JSON"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Disease Summary Card */}
      {dossier && (
        <div className="bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">{dossier.disease.label}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border border-red-200 rounded-md">
                  {dossier.disease.orphan_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Category: <strong className="text-slate-800">{dossier.disease.category}</strong> • Inheritance: <strong className="text-slate-800">{dossier.disease.inheritance}</strong> • Prevalence: <strong className="text-slate-800">{dossier.disease.prevalence}</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 text-emerald-600 rounded-lg border border-slate-300">
                {dossier.disease.code}
              </span>
              <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-slate-100 text-blue-600 rounded-lg border border-slate-300">
                OMIM #{dossier.disease.omim}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            {dossier.disease.description}
          </p>

          {/* Sub-Persona Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => setActiveSubTab('maria')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeSubTab === 'maria'
                  ? 'bg-pink-100 text-pink-700 border-pink-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <HeartHandshake className="h-4 w-4 text-pink-600" />
              <span>Maria (Leader)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('devon')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeSubTab === 'devon'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>Devon (Caregiver)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('priya')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeSubTab === 'priya'
                  ? 'bg-cyan-100 text-cyan-700 border-cyan-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="h-4 w-4 text-cyan-600" />
              <span>Priya (Biotech)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('dr_osei')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeSubTab === 'dr_osei'
                  ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Microscope className="h-4 w-4 text-blue-600" />
              <span>Dr. Osei (Scientist)</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-xs">Computing multi-hop graph inferences...</p>
        </div>
      )}

      {/* 1. MARIA'S VIEW */}
      {!loading && dossier && activeSubTab === 'maria' && (
        <div className="space-y-6">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5 shadow-xl text-xs space-y-2">
            <h3 className="text-sm font-bold text-pink-700 flex items-center space-x-2">
              <HeartHandshake className="h-4 w-4" />
              <span>Maria's Collaborative Roadmap: Reusable Assets & Shared Infrastructure</span>
            </h3>
            <p className="text-pink-800 leading-relaxed">
              Accelerating progress by connecting {dossier.disease.label} to adjacent rare disease communities with shared pathways, open iPSC lines, and natural history study designs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Immediate Collaborative Steps</span>
              </h3>
              <div className="space-y-2">
                {dossier.marias_journey.step4_action.action_this_week.map((act, i) => (
                  <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{withBold(act.replace(/^\d+\.\s*/, ''))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Database className="h-4 w-4 text-yellow-700" />
                <span>Reusable Assets Available Now</span>
              </h3>
              <div className="space-y-2">
                {dossier.marias_journey.step3_assets.reusable_assets.map((asset, i) => (
                  <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-700">{asset.name}</span>
                      <span className="text-[10px] text-slate-500">{asset.type}</span>
                    </div>
                    <p className="text-emerald-600 text-[11px]">{asset.reusability}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEVON'S VIEW */}
      {!loading && dossier && activeSubTab === 'devon' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xl text-xs space-y-2">
            <h3 className="text-sm font-bold text-emerald-700 flex items-center space-x-2">
              <UserCheck className="h-4 w-4" />
              <span>Devon's Action Guide: Clear Answers for Newly Diagnosed Families</span>
            </h3>
            <p className="text-emerald-800 leading-relaxed">
              {dossier.patient_actions.plain_language_summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Diagnostic & Verification Next Steps</span>
              </h3>
              <div className="space-y-2">
                {dossier.patient_actions.immediate_diagnostic_steps.map((step, i) => (
                  <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <HeartHandshake className="h-4 w-4 text-pink-600" />
                <span>Patient Community & Registry</span>
              </h3>
              <div className="space-y-2">
                {dossier.patient_actions.support_and_advocacy_groups.map((group, i) => (
                  <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-pink-700">{group.name}</span>
                      <a
                        href={group.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center space-x-1"
                      >
                        <span>Website</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                    {group.registry_url ? (
                      <a href={group.registry_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-[11px] block">
                        Patient registry ➔
                      </a>
                    ) : (
                      <div className="text-[11px] text-slate-500">No registry link found on the organization's website.</div>
                    )}
                    {group.contact_url && (
                      <a href={group.contact_url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline text-[11px] block">
                        Contact page ➔
                      </a>
                    )}
                    {group.contact && <div className="text-[11px] text-slate-500">Email (published by the organization): {group.contact}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRIYA'S VIEW */}
      {!loading && dossier && activeSubTab === 'priya' && (
        <div className="space-y-6">
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5 shadow-xl text-xs space-y-2">
            <h3 className="text-sm font-bold text-cyan-700 flex items-center space-x-2">
              <Stethoscope className="h-4 w-4" />
              <span>Priya's Therapeutic Scout Dossier: Mechanism & Addressable Clusters</span>
            </h3>
            <p className="text-cyan-800 leading-relaxed">
              Evaluating target mechanism: <strong className="text-slate-900">{dossier.priya_actions.mechanism_evaluation}</strong> against patient populations with ready infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-cyan-600" />
                <span>Preclinical Infrastructure Assessment</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Preclinical Readiness</span>
                  <span className="text-emerald-600 font-bold">{dossier.priya_actions.preclinical_readiness}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Named Investigators</span>
                  <div className="text-slate-800 mt-1">{dossier.priya_actions.named_investigators.join(', ') || 'None linked in the atlas'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Top Drug Repurposing Candidates</span>
              </h3>
              <div className="space-y-2 text-xs">
                {dossier.researcher_actions.repurposing_hypotheses.map((dr, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-700 block">{dr.molecule_name}</span>
                      <span className="text-[10px] text-slate-500">{dr.status}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {formatConfidence(dr.confidence_score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DR. OSEI'S VIEW */}
      {!loading && dossier && activeSubTab === 'dr_osei' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-xl text-xs space-y-2">
            <h3 className="text-sm font-bold text-blue-700 flex items-center space-x-2">
              <Microscope className="h-4 w-4" />
              <span>Dr. Osei's Academic Cross-Disease Connector</span>
            </h3>
            <p className="text-blue-800 leading-relaxed">
              Connecting academic labs researching homologous pathways across different gene symbols to break publication silos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Unrelated Diseases Sharing Your Mechanism</span>
              </h3>
              <div className="space-y-2 text-xs">
                {dossier.osei_actions.unrelated_diseases_sharing_mechanism.length === 0 && (
                  <p className="text-slate-500 text-[11px]">No other disease in the atlas shares a recorded mechanism with this condition yet.</p>
                )}
                {dossier.osei_actions.unrelated_diseases_sharing_mechanism.map((item, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-blue-700 block">{item.disease}</span>
                    <span className="text-slate-500 text-[11px]">{item.pathway}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>Colleagues Working on Shared Mechanisms</span>
              </h3>
              <div className="space-y-2 text-xs">
                {dossier.osei_actions.collaborator_directory.length === 0 && (
                  <p className="text-slate-500 text-[11px]">No investigators are linked to this mechanism in the atlas yet.</p>
                )}
                {dossier.osei_actions.collaborator_directory.map((collab, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{collab.name}</span>
                      <span className="text-[10px] text-emerald-600 font-mono">{collab.email}</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{collab.institution}</span>
                    {collab.connection && <span className="text-emerald-700 text-[11px] block">{collab.connection}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
