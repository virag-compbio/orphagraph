import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  Search, 
  Filter, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  SlidersHorizontal,
  Info,
  Dna,
  Activity,
  Pill,
  GitMerge,
  AlertTriangle,
  FlaskConical,
  HeartHandshake,
  BookOpen
} from 'lucide-react';
import { GraphData, GraphNode, GraphEdge, NodeType } from '../types';
import { NODE_CONFIG, getNodeColor } from '../utils/colors';

interface GraphCanvasProps {
  graphData: GraphData;
  onSelectNode: (node: GraphNode) => void;
  selectedNode: GraphNode | null;
  highlightNodes?: string[];
  highlightEdges?: any[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphData,
  onSelectNode,
  selectedNode,
  highlightNodes = [],
  highlightEdges = []
}) => {
  const fgRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Record<NodeType, boolean>>({
    disease: true,
    gene: true,
    symptom: false, // ~1,000 imported HPO terms; toggle on from the filter panel
    pathway: true,
    drug: true,
    asset: true,
    investigator: true,
    trial: true,
    patient_group: true,
    publication: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Filter graph data based on selected node types
  const filteredData = useMemo(() => {
    if (!graphData.nodes.length) return { nodes: [], links: [] };

    const validNodeIds = new Set<string>();
    const nodes: GraphNode[] = [];

    graphData.nodes.forEach((n) => {
      if (activeTypes[n.type]) {
        validNodeIds.add(n.id);
        nodes.push({ ...n });
      }
    });

    const links: any[] = [];
    graphData.edges.forEach((e) => {
      const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;

      if (validNodeIds.has(srcId) && validNodeIds.has(tgtId)) {
        links.push({
          source: srcId,
          target: tgtId,
          relationship: e.relationship,
          confidence: e.confidence,
          frequency: e.frequency,
          mechanism: e.mechanism
        });
      }
    });

    return { nodes, links };
  }, [graphData, activeTypes]);

  // Handle search query filtering and camera focus
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return graphData.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        (n.code && n.code.toLowerCase().includes(q)) ||
        (n.hgnc && n.hgnc.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQuery, graphData.nodes]);

  const handleFocusNode = (node: GraphNode) => {
    onSelectNode(node);
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.3, 300);
    }
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 40);
    }
  };

  const toggleType = (type: NodeType) => {
    setActiveTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleAllTypes = (state: boolean) => {
    const updated: any = {};
    Object.keys(activeTypes).forEach((k) => (updated[k] = state));
    setActiveTypes(updated);
  };

  // Custom node drawing on HTML5 canvas
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightNodes.includes(node.id);
      const isHovered = hoveredNode?.id === node.id;

      const baseRadius = node.type === 'disease' ? 9 : node.type === 'gene' ? 7 : node.type === 'drug' ? 7 : 5.5;
      const radius = isSelected || isHighlighted || isHovered ? baseRadius * 1.35 : baseRadius;
      const color = getNodeColor(node.type);

      // Glow effect for selected / highlighted / disease nodes
      if (isSelected || isHighlighted || node.type === 'disease') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.35)' : isHighlighted ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.strokeStyle = isSelected ? '#0f172a' : '#ffffff';
      ctx.stroke();

      // Label drawing (only when zoomed in enough or if selected/disease)
      const fontSize = Math.max(10 / globalScale, 3);
      // Always label curated diseases; imported ones (DIS_OMIM_*) only when zoomed in
      if (globalScale > 1.2 || isSelected || isHighlighted || (node.type === 'disease' && !node.id.startsWith('DIS_OMIM_'))) {
        ctx.font = `${node.type === 'disease' || isSelected ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label;
        
        // Background badge behind text for legibility
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(
          node.x - textWidth / 2 - 2,
          node.y + radius + 3,
          textWidth + 4,
          fontSize + 2
        );

        ctx.fillStyle = isSelected ? '#047857' : '#334155';
        ctx.fillText(label, node.x, node.y + radius + fontSize / 2 + 4);
      }
    },
    [selectedNode, highlightNodes, hoveredNode]
  );

  return (
    <div className="relative w-full h-[calc(100vh-61px)] bg-slate-50 overflow-hidden flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-md w-full">
        {/* Search Bar */}
        <div className="relative">
          <div className="flex items-center bg-white/90 backdrop-blur-md border border-slate-300 rounded-xl px-3 py-2 shadow-xl">
            <Search className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search diseases, genes, phenotypes (e.g. NGLY1, Rett, Ataxia)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-500 hover:text-slate-900 px-1.5"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ml-2 p-1.5 rounded-lg border text-xs transition-colors flex items-center space-x-1 ${
                showFilters
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="Filter Node Types"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto z-30 divide-y divide-slate-200">
              {searchResults.map((node) => {
                const config = NODE_CONFIG[node.type];
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      handleFocusNode(node);
                      setSearchQuery('');
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-slate-100/80 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {node.code || node.hgnc || node.hpo_id || node.category || node.id}
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 text-[10px] rounded-full border"
                      style={{
                        backgroundColor: config.bgColor,
                        borderColor: config.borderColor,
                        color: config.color
                      }}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter Drawer / Dropdown */}
        {showFilters && (
          <div className="bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                <span>Filter Knowledge Graph Layers</span>
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleAllTypes(true)}
                  className="text-[10px] text-emerald-600 hover:underline"
                >
                  All
                </button>
                <span className="text-slate-400">|</span>
                <button
                  onClick={() => toggleAllTypes(false)}
                  className="text-[10px] text-slate-500 hover:underline"
                >
                  None
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(NODE_CONFIG) as NodeType[]).map((type) => {
                const config = NODE_CONFIG[type];
                const count = graphData.nodes.filter((n) => n.type === type).length;
                return (
                  <label
                    key={type}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={activeTypes[type]}
                      onChange={() => toggleType(type)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-slate-50"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-slate-700 truncate text-[11px]">
                      {config.label}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Controls (Zoom, Reset) */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md border border-slate-300 p-1.5 rounded-xl shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Fit View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Main Force Graph 2D Canvas */}
      <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          nodeLabel="label"
          nodeRelSize={6}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          linkColor={() => '#cbd5e1'}
          linkWidth={(link: any) => (highlightEdges.includes(link) ? 3 : 1.2)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          onNodeClick={(node: any) => onSelectNode(node)}
          onNodeHover={(node: any) => setHoveredNode(node || null)}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          backgroundColor="#f8fafc"
        />
      </div>

      {/* Bottom Ontology Legend */}
      <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs overflow-x-auto gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-slate-500 font-medium text-[11px] uppercase tracking-wider shrink-0 flex items-center space-x-1">
            <Info className="h-3 w-3 text-emerald-600" />
            <span>Ontology:</span>
          </span>
          <div className="flex items-center space-x-3 shrink-0">
            {(Object.keys(NODE_CONFIG) as NodeType[]).map((type) => {
              const config = NODE_CONFIG[type];
              return (
                <div key={type} className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-slate-700 text-[11px]">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 shrink-0 hidden md:block">
          Click any node to open evidence details & action pathway
        </div>
      </div>
    </div>
  );
};
