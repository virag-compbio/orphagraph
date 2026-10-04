import React, { useEffect, useState } from 'react';
import { 
  X, 
  ExternalLink, 
  FileText, 
  GitFork, 
  Layers, 
  Sparkles, 
  Activity, 
  Dna, 
  Pill, 
  AlertTriangle, 
  FlaskConical, 
  HeartHandshake, 
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { GraphNode, NodeType } from '../types';
import { NODE_CONFIG } from '../utils/colors';
import { fetchNodeNeighborhood } from '../services/api';

interface NodeDetailDrawerProps {
  node: GraphNode | null;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onGenerateDossier: (diseaseId: string) => void;
  onTracePath: (sourceNodeId: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  onClose,
  onSelectNode,
  onGenerateDossier,
  onTracePath
}) => {
  const [neighborhood, setNeighborhood] = useState<{ nodes: GraphNode[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!node) return;
    setLoading(true);
    fetchNodeNeighborhood(node.id, 1)
      .then((data) => {
        setNeighborhood({
          nodes: data.nodes.filter((n) => n.id !== node.id),
          edges: data.edges
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [node]);

  if (!node) return null;

  const config = NODE_CONFIG[node.type];

  // External link helpers
  const getExternalLink = () => {
    if (node.code && node.code.startsWith('ORPHA:')) {
      const orphaId = node.code.replace('ORPHA:', '');
      return { url: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Lng=GB&Expert=${orphaId}`, label: 'Orphanet' };
    }
    if (node.omim) {
      return { url: `https://omim.org/entry/${node.omim}`, label: `OMIM #${node.omim}` };
    }
    if (node.hpo_id) {
      return { url: `https://hpo.jax.org/app/browse/term/${node.hpo_id}`, label: `HPO ${node.hpo_id}` };
    }
    if (node.hgnc) {
      return { url: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${node.hgnc.replace('HGNC:', '')}`, label: 'HGNC Gene' };
    }
    if (node.nct_id) {
      return { url: `https://clinicaltrials.gov/study/${node.nct_id}`, label: `ClinicalTrials.gov ${node.nct_id}` };
    }
    if (node.drugbank_id) {
      return { url: `https://go.drugbank.com/drugs/${node.drugbank_id}`, label: `DrugBank ${node.drugbank_id}` };
    }
    if (node.pmid) {
      return { url: `https://pubmed.ncbi.nlm.nih.gov/${node.pmid}/`, label: `PubMed PMID:${node.pmid}` };
    }
    if (node.website) {
      return { url: node.website, label: 'Official Website' };
    }
    return null;
  };

  const extLink = getExternalLink();

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50/60">
        <div className="flex items-start space-x-3">
          <div
            className="p-2.5 rounded-xl border shrink-0 mt-0.5"
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
              color: config.color
            }}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border"
                style={{
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor,
                  color: config.color
                }}
              >
                {config.label}
              </span>
              {node.orphan_status && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 border border-red-200 rounded-md">
                  {node.orphan_status}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
              {node.label}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Action CTA Bar */}
      <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
        {node.type === 'disease' ? (
          <button
            onClick={() => onGenerateDossier(node.id)}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Generate Action Dossier</span>
          </button>
        ) : (
          <button
            onClick={() => onTracePath(node.id)}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-600/20 transition-all"
          >
            <GitFork className="h-3.5 w-3.5" />
            <span>Find Path from Here</span>
          </button>
        )}
        
        {extLink && (
          <a
            href={extLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg border border-slate-300 transition-colors"
          >
            <span>{extLink.label}</span>
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </a>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-200 text-xs">
        {/* Core Metadata */}
        <div className="space-y-2.5">
          <h3 className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
            Biomedical Identifiers & Ontologies
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {node.code && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Orphanet Code</span>
                <span className="font-mono text-emerald-600 font-semibold">{node.code}</span>
              </div>
            )}
            {node.omim && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">OMIM ID</span>
                <span className="font-mono text-blue-600 font-semibold">{node.omim}</span>
              </div>
            )}
            {node.hgnc && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">HGNC Symbol</span>
                <span className="font-mono text-blue-700 font-semibold">{node.hgnc}</span>
              </div>
            )}
            {node.chromosome && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Locus</span>
                <span className="font-mono text-slate-700 font-semibold">{node.chromosome}</span>
              </div>
            )}
            {node.hpo_id && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">HPO Term</span>
                <span className="font-mono text-amber-700 font-semibold">{node.hpo_id}</span>
              </div>
            )}
            {node.prevalence && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Prevalence</span>
                <span className="text-slate-700 font-semibold">{node.prevalence}</span>
              </div>
            )}
            {node.status && (
              <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Trial Status</span>
                <span className="text-purple-700 font-semibold">{node.status}</span>
              </div>
            )}
          </div>

          {node.description && (
            <div className="bg-slate-50/40 p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Clinical Overview
              </span>
              {node.description}
            </div>
          )}

          {node.mechanism && (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-emerald-800 leading-relaxed">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Therapeutic Mechanism of Action</span>
              </span>
              {node.mechanism}
            </div>
          )}

          {node.treatment_status && (
            <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200 text-slate-700">
              <span className="text-[10px] text-slate-500 block mb-0.5">Therapeutic Landscape</span>
              <span className="text-slate-800">{node.treatment_status}</span>
            </div>
          )}

          {(node.source || node.last_verified) && (
            <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200 text-slate-500 text-[11px]">
              Source: {node.source || 'curated record'}{node.last_verified ? ` (checked ${node.last_verified})` : ''}
            </div>
          )}
        </div>

        {/* Connected Knowledge Graph Neighbors */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-600" />
              <span>Direct Graph Connections ({neighborhood?.nodes.length || 0})</span>
            </h3>
          </div>

          {loading ? (
            <div className="py-6 text-center text-slate-500">Loading connections...</div>
          ) : neighborhood && neighborhood.nodes.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {neighborhood.nodes.map((nbr) => {
                const nbrConfig = NODE_CONFIG[nbr.type];
                return (
                  <button
                    key={nbr.id}
                    onClick={() => onSelectNode(nbr)}
                    className="w-full p-2.5 rounded-lg bg-slate-50/60 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: nbrConfig.color }}
                      />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 group-hover:text-emerald-600 truncate">
                          {nbr.label}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {nbrConfig.label}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-600 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 py-3 italic">No direct connections recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
};
