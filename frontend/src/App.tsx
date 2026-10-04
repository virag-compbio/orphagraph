import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MariasJourneyView } from './components/MariasJourneyView';
import { GraphCanvas } from './components/GraphCanvas';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { ActionDossierView } from './components/ActionDossierView';
import { Moonshot10xView } from './components/Moonshot10xView';
import { SiloBreakerView } from './components/SiloBreakerView';
import { TrialMatcher } from './components/TrialMatcher';
import { AICopilot } from './components/AICopilot';
import { PathFinderModal } from './components/PathFinderModal';
import { GraphData, GraphNode, PersonaType, ViewTab, GraphStats } from './types';
import { fetchGraphData, fetchGraphStats } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('journey');
  const [currentPersona, setCurrentPersona] = useState<PersonaType>('maria');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [graphStats, setGraphStats] = useState<GraphStats | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string | undefined>(undefined);
  
  // Pathfinder state
  const [isPathfinderOpen, setIsPathfinderOpen] = useState(false);
  const [pathfinderSourceId, setPathfinderSourceId] = useState<string | undefined>(undefined);
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchGraphData(), fetchGraphStats()])
      .then(([gData, sData]) => {
        setGraphData(gData);
        setGraphStats(sData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateDossier = (diseaseId: string) => {
    setSelectedDiseaseId(diseaseId);
    setCurrentTab('dossier');
    setSelectedNode(null);
  };

  const handleTracePath = (sourceId: string) => {
    setPathfinderSourceId(sourceId);
    setIsPathfinderOpen(true);
  };

  const handleHighlightPath = (nodeIds: string[], edges: any[]) => {
    setHighlightNodes(nodeIds);
    setHighlightEdges(edges);
    setCurrentTab('graph');
    setIsPathfinderOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-700">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        currentPersona={currentPersona}
        setPersona={setCurrentPersona}
        stats={graphStats}
        onOpenPathfinder={() => {
          setPathfinderSourceId(selectedNode?.id || undefined);
          setIsPathfinderOpen(true);
        }}
      />

      {/* Main Tab Content View */}
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-130px)] space-y-3">
            <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Orphagraph Atlas...</p>
          </div>
        ) : (
          <>
            {currentTab === 'journey' && <MariasJourneyView persona={currentPersona} />}

            {currentTab === 'graph' && (
              <GraphCanvas
                graphData={graphData}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNode={selectedNode}
                highlightNodes={highlightNodes}
                highlightEdges={highlightEdges}
              />
            )}

            {currentTab === 'dossier' && (
              <ActionDossierView
                selectedDiseaseId={selectedDiseaseId}
                currentPersona={currentPersona}
              />
            )}

            {currentTab === 'moonshot' && <Moonshot10xView />}

            {currentTab === 'silos' && <SiloBreakerView />}

            {currentTab === 'trials' && <TrialMatcher graphData={graphData} />}

            {currentTab === 'chat' && <AICopilot />}
          </>
        )}
      </main>

      {/* Node Detail Slide-Over Drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onSelectNode={(node) => setSelectedNode(node)}
        onGenerateDossier={handleGenerateDossier}
        onTracePath={handleTracePath}
      />

      {/* PathFinder Modal */}
      <PathFinderModal
        isOpen={isPathfinderOpen}
        onClose={() => setIsPathfinderOpen(false)}
        graphData={graphData}
        initialSourceId={pathfinderSourceId}
        onHighlightPath={handleHighlightPath}
      />
    </div>
  );
}

export default App;
