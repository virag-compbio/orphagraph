import { GraphData, GraphNode, ActionDossier, GraphStats, MariasJourney, MoonshotData, Explanation, PersonaType } from '../types';

const API_BASE = '/api';

export async function fetchGraphData(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}

export async function fetchGraphStats(): Promise<GraphStats> {
  const res = await fetch(`${API_BASE}/graph/stats`);
  if (!res.ok) throw new Error('Failed to fetch graph statistics');
  return res.json();
}

export async function searchNodes(query: string, type?: string): Promise<{ results: GraphNode[]; count: number }> {
  const params = new URLSearchParams({ q: query });
  if (type) params.append('type', type);
  const res = await fetch(`${API_BASE}/graph/search?${params.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchNodeNeighborhood(nodeId: string, depth = 1): Promise<{ nodes: GraphNode[]; edges: any[]; focus_node: GraphNode }> {
  const res = await fetch(`${API_BASE}/graph/node/${encodeURIComponent(nodeId)}/neighborhood?depth=${depth}`);
  if (!res.ok) throw new Error('Failed to fetch neighborhood');
  return res.json();
}

export async function findShortestPath(sourceId: string, targetId: string): Promise<{
  found: boolean;
  path_length?: number;
  path_nodes?: GraphNode[];
  path_edges?: any[];
  explanation: string;
}> {
  const res = await fetch(`${API_BASE}/graph/path?source=${encodeURIComponent(sourceId)}&target=${encodeURIComponent(targetId)}`);
  if (!res.ok) throw new Error('Failed to find path');
  return res.json();
}

export async function fetchDiseases(): Promise<{ total: number; diseases: GraphNode[] }> {
  const res = await fetch(`${API_BASE}/diseases`);
  if (!res.ok) throw new Error('Failed to fetch diseases');
  return res.json();
}

export async function fetchActionDossier(diseaseId: string): Promise<ActionDossier> {
  const res = await fetch(`${API_BASE}/dossier/${encodeURIComponent(diseaseId)}`);
  if (!res.ok) throw new Error('Failed to fetch action dossier');
  return res.json();
}

export async function fetchMariasJourney(diseaseId = 'DIS_NGLY1'): Promise<MariasJourney> {
  const res = await fetch(`${API_BASE}/journey/maria?disease=${encodeURIComponent(diseaseId)}`);
  if (!res.ok) throw new Error('Failed to fetch Maria\'s journey');
  return res.json();
}

export async function fetchJourneyExplanation(diseaseId: string, persona: PersonaType): Promise<Explanation> {
  const res = await fetch(`${API_BASE}/explain/journey/${encodeURIComponent(diseaseId)}?persona=${persona}`);
  if (!res.ok) throw new Error('Failed to fetch explanation');
  return res.json();
}

export async function fetchMoonshot10x(): Promise<MoonshotData> {
  const res = await fetch(`${API_BASE}/moonshot`);
  if (!res.ok) throw new Error('Failed to fetch 10x Moonshot data');
  return res.json();
}

export async function fetchAssets(): Promise<{ total: number; assets: GraphNode[] }> {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function fetchInvestigators(): Promise<{ total: number; investigators: GraphNode[] }> {
  const res = await fetch(`${API_BASE}/investigators`);
  if (!res.ok) throw new Error('Failed to fetch investigators');
  return res.json();
}

export async function fetchSiloAnalysis(): Promise<{
  total_curated_diseases: number;
  total_repurposable_molecules: number;
  cross_disease_pathways: Array<{ pathway: string; connected_diseases: string[]; synergy_score: number }>;
  repurposing_matrix: Array<{ drug: string; status: string; evidence_tier?: string; evidence_for?: string; mechanism: string }>;
}> {
  const res = await fetch(`${API_BASE}/silos`);
  if (!res.ok) throw new Error('Failed to fetch silo analysis');
  return res.json();
}

export async function sendChatQuery(query: string): Promise<{
  query: string;
  matched_entities: { diseases: GraphNode[]; genes: GraphNode[]; drugs: GraphNode[] };
  insights: string[];
  actionable_steps: string[];
  evidence_citations: Array<{ pmid: string; title: string; journal: string; year: number; evidence_score: number }>;
  graph_stats: GraphStats;
  answer?: Explanation;
}> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Chat query failed');
  return res.json();
}
