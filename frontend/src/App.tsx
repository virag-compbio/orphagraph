import React, { useEffect, useState } from 'react';
import { useRoute, href, navigate } from './router';
import { GraphData, GraphNode, PersonaType, PERSONAS } from './types';
import { fetchGraphData } from './services/api';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { DiseasePage } from './pages/DiseasePage';
import { EntityPage } from './pages/EntityPage';
import { AnswerPage } from './pages/AnswerPage';
import { GraphCanvas } from './components/GraphCanvas';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { PathFinderModal } from './components/PathFinderModal';
import { Moonshot10xView } from './components/Moonshot10xView';
import { PathwaysPage } from './pages/PathwaysPage';

const PERSONA_KEY = 'orphagraph.persona';

function loadPersona(): PersonaType {
  try {
    const saved = localStorage.getItem(PERSONA_KEY) as PersonaType | null;
    if (saved && PERSONAS.some((p) => p.id === saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return 'maria';
}

// The knowledge-graph explorer: the full network, a node drawer and the path finder.
const GraphExplorer: React.FC<{ focusId?: string }> = ({ focusId }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [pathOpen, setPathOpen] = useState(false);
  const [pathSource, setPathSource] = useState<string | undefined>();
  const [highlightNodes, setHighlightNodes] = useState<string[]>([]);
  const [highlightEdges, setHighlightEdges] = useState<any[]>([]);

  useEffect(() => {
    fetchGraphData().then(setGraphData).catch(() => undefined);
  }, []);

  return (
    <>
      <GraphCanvas
        graphData={graphData}
        onSelectNode={setSelected}
        selectedNode={selected}
        highlightNodes={highlightNodes}
        highlightEdges={highlightEdges}
        focusNodeId={focusId}
      />
      <NodeDetailDrawer
        node={selected}
        onClose={() => setSelected(null)}
        onSelectNode={setSelected}
        onGenerateDossier={(id) => navigate(href('disease', id))}
        onTracePath={(id) => {
          setPathSource(id);
          setPathOpen(true);
        }}
      />
      <PathFinderModal
        isOpen={pathOpen}
        onClose={() => setPathOpen(false)}
        graphData={graphData}
        initialSourceId={pathSource}
        onHighlightPath={(ids, edges) => {
          setHighlightNodes(ids);
          setHighlightEdges(edges);
          setPathOpen(false);
        }}
      />
    </>
  );
};

const NotFound: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-600">
    <p className="text-lg text-slate-900">This page does not exist.</p>
    <p className="mt-2 text-sm">Search above, or go back to the <a href="#/" className="text-emerald-800 hover:underline">home page</a>.</p>
  </div>
);

export function App() {
  const route = useRoute();
  const [persona, setPersonaState] = useState<PersonaType>(loadPersona);
  const setPersona = (p: PersonaType) => {
    setPersonaState(p);
    try {
      localStorage.setItem(PERSONA_KEY, p);
    } catch {
      /* storage unavailable */
    }
  };

  const [page, id] = route.parts;
  useEffect(() => {
    if (page !== 'disease') document.title = 'Orphagraph Atlas';
  }, [page]);

  if (!page) return <HomePage />;

  let body: React.ReactNode;
  let withPersona = false;
  if (page === 'disease' && id) {
    body = <DiseasePage diseaseId={id} persona={persona} />;
    withPersona = true;
  } else if (page === 'explore' && id === 'graph') {
    body = <GraphExplorer focusId={route.query.get('focus') || undefined} />;
  } else if (page === 'explore' && id === '10x') {
    body = <Moonshot10xView />;
  } else if (page === 'explore' && id === 'pathways') {
    body = <PathwaysPage />;
  } else if ((page === 'gene' || page === 'symptom' || page === 'drug') && id) {
    body = <EntityPage type={page} id={id} />;
  } else if (page === 'ask') {
    body = <AnswerPage query={route.query.get('q') || ''} />;
  } else {
    body = <NotFound />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header
        query={page === 'ask' ? route.query.get('q') || '' : ''}
        persona={withPersona ? persona : undefined}
        setPersona={withPersona ? setPersona : undefined}
      />
      <main>{body}</main>
    </div>
  );
}

export default App;
