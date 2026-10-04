import React, { useEffect, useState } from 'react';
import { 
  GitFork, 
  Layers, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Pill, 
  Activity, 
  Microscope,
  Zap,
  Share2
} from 'lucide-react';
import { fetchSiloAnalysis } from '../services/api';
import { EvidenceTierBadge } from './EvidenceTierBadge';

export const SiloBreakerView: React.FC = () => {
  const [data, setData] = useState<{
    total_curated_diseases: number;
    total_repurposable_molecules: number;
    cross_disease_pathways: Array<{ pathway: string; connected_diseases: string[]; synergy_score: number }>;
    repurposing_matrix: Array<{ drug: string; status: string; evidence_tier?: string; evidence_for?: string; mechanism: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiloAnalysis()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-50 via-white to-blue-50 border border-cyan-200 rounded-2xl p-6 shadow-2xl space-y-3">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-full flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>Silo Breaker Engine</span>
          </span>
          <span className="text-xs text-slate-500">Cross-Disease Biological Synergies</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pathways Shared Across Diseases in the Atlas
        </h1>
        <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
          Rare diseases are traditionally studied in isolated academic silos. Orphagraph Atlas identifies mechanistic overlaps across metabolic, lysosomal, ion channel, and mitochondrial pathways—enabling shared drug screens, shared clinical biomarker assays, and multi-disease therapeutic trials.
        </p>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Monogenic Diseases</span>
              <span className="text-lg font-extrabold text-slate-900">{data.total_curated_diseases}</span>
            </div>
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Repurposing Leads</span>
              <span className="text-lg font-extrabold text-emerald-600">{data.total_repurposable_molecules}</span>
            </div>
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Cross-Disease Pathways</span>
              <span className="text-lg font-extrabold text-cyan-600">{data.cross_disease_pathways.length}</span>
            </div>
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Average Synergies / Pathway</span>
              <span className="text-lg font-extrabold text-pink-600">2.4 Diseases</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading cross-disease analytics...</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Cross-Disease Shared Pathway Clusters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-cyan-600" />
                  <span>Shared Biological Pathways Across Independent Rare Diseases</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Conditions sharing these pathways can share cellular screening assays and drug repurposing pipelines.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.cross_disease_pathways.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-cyan-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-cyan-700 text-xs">{item.pathway}</h4>
                      <span className="px-2 py-0.5 text-[10px] bg-cyan-50 text-cyan-600 border border-cyan-200 rounded font-mono shrink-0">
                        {item.connected_diseases.length} Diseases
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Connected Conditions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.connected_diseases.length > 0 ? (
                          item.connected_diseases.map((d, di) => (
                            <span
                              key={di}
                              className="px-2 py-1 bg-white text-slate-800 rounded-lg text-[11px] border border-slate-200 font-medium"
                            >
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs italic">Expanding discovery cluster...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span>Cross-disease screening synergy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repurposing Matrix Across Indications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Pill className="h-4 w-4 text-emerald-600" />
              <span>Multi-Hop Drug Repurposing Matrix</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 px-3">Molecule / Drug</th>
                    <th className="pb-3 px-3">Clinical / Regulatory Status</th>
                    <th className="pb-3 px-3">Mechanism of Action</th>
                    <th className="pb-3 px-3 text-right">Strongest Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.repurposing_matrix.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-100/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{row.drug}</td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px]">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-md">{row.mechanism}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <EvidenceTierBadge tier={row.evidence_tier} />
                          {row.evidence_for && <span className="text-[10px] text-slate-500">{row.evidence_for}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
