import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitFork, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  ShieldCheck,
  Activity
} from 'lucide-react';
import { GraphData, GraphNode } from '../types';
import { findShortestPath } from '../services/api';
import { NODE_CONFIG } from '../utils/colors';

interface PathFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  initialSourceId?: string;
  onHighlightPath?: (nodeIds: string[], edges: any[]) => void;
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({
  isOpen,
  onClose,
  graphData,
  initialSourceId,
  onHighlightPath
}) => {
  const [sourceId, setSourceId] = useState<string>(initialSourceId || 'DIS_NGLY1');
  const [targetId, setTargetId] = useState<string>('DRUG_AURANOFIN');
  const [pathResult, setPathResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSourceId) {
      setSourceId(initialSourceId);
    }
  }, [initialSourceId]);

  const handleComputePath = async () => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    try {
      const res = await findShortestPath(sourceId, targetId);
      setPathResult(res);
      if (res.found && res.path_nodes && onHighlightPath) {
        onHighlightPath(
          res.path_nodes.map((n: any) => n.id),
          res.path_edges || []
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-full flex items-center space-x-1">
                <GitFork className="h-3 w-3" />
                <span>Mechanistic Path Trace</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Trace Biological Pathway Between Entities
            </h2>
            <p className="text-xs text-slate-500">
              Discover multi-hop mechanistic bridges connecting rare diseases, genes, pathways, and therapeutic repurposing targets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source & Target Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Source Entity:
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
            >
              {graphData.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({NODE_CONFIG[n.type]?.label || n.type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Target Entity:
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
            >
              {graphData.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({NODE_CONFIG[n.type]?.label || n.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleComputePath}
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center space-x-2"
        >
          {loading ? (
            <span>Computing shortest biological graph path...</span>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Trace Biological Chain</span>
            </>
          )}
        </button>

        {/* Results Chain */}
        {pathResult && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            {pathResult.found ? (
              <>
                <div className="flex items-center justify-between text-slate-700 font-semibold pb-2 border-b border-slate-200">
                  <span>Found Mechanistic Path ({pathResult.path_length} hops)</span>
                  <span className="text-emerald-600 font-mono text-[11px]">Direct Biological Link</span>
                </div>

                {/* Step Chain */}
                <div className="space-y-2 py-2">
                  {pathResult.path_nodes?.map((n: GraphNode, i: number) => {
                    const cfg = NODE_CONFIG[n.type];
                    return (
                      <div key={n.id} className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">{n.label}</span>
                            <span className="text-[10px] text-slate-500">{cfg.label}</span>
                          </div>
                        </div>
                        {i < pathResult.path_nodes.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-cyan-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-slate-500 text-[11px] bg-white/50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  <strong>Biological Rationale:</strong> {pathResult.explanation}
                </p>
              </>
            ) : (
              <div className="text-amber-700 text-center py-3">
                {pathResult.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
