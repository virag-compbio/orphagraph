export type NodeType = 
  | 'disease' 
  | 'gene' 
  | 'symptom' 
  | 'pathway' 
  | 'drug' 
  | 'trial' 
  | 'patient_group' 
  | 'publication'
  | 'asset'
  | 'investigator';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  code?: string;
  omim?: string;
  mondo?: string;
  synonyms?: string[];
  category?: string;
  prevalence?: string;
  inheritance?: string;
  description?: string;
  orphan_status?: string;
  treatment_status?: string;
  lead_advocate?: string;
  hgnc?: string;
  ensembl?: string;
  chromosome?: string;
  protein?: string;
  function?: string;
  key_variants?: string[];
  hpo_id?: string;
  informativeness?: string;
  database_id?: string;
  size?: number;  // pathway: number of genes (Reactome)
  drugbank_id?: string;
  fda_status?: string;
  repurposing_confidence?: number;
  evidence_tier?: string;
  mechanism?: string;
  target_genes?: string[];
  nct_id?: string;
  phase?: string;
  status?: string;
  sponsor?: string;
  locations?: string;
  intervention?: string;
  focus?: string;
  country?: string;
  website?: string;
  registry_url?: string;
  contact_url?: string;
  contact_email?: string;
  last_verified?: string;
  source?: string;
  pmid?: string;
  journal?: string;
  year?: number;
  evidence_score?: number;
  title?: string;
  excerpt?: string;
  asset_type?: string;
  availability?: string;
  custodian?: string;
  reusable_by?: string[];
  institution?: string;
  role?: string;
  email?: string;
  active_grants?: string[];
  cross_disease_focus?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: string;
  confidence?: number;
  evidence_tier?: string;
  mechanism?: string;
  frequency?: string;
  onset?: string;
  role?: string;
  effect?: string;
  evidence?: string;
  status?: string;
  score?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: GraphStats;
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  node_breakdown: Record<string, number>;
  monogenic_diseases: number;
  repurposing_drugs: number;
  research_assets: number;
  key_investigators: number;
  clinical_trials: number;
  patient_foundations: number;
  evidence_publications: number;
}

export interface MariasJourney {
  disease_id: string;
  step1_diagnosis: {
    step_title: string;
    prompt: string;
    status: string;
    disease: GraphNode;
  };
  step2_mechanism: {
    step_title: string;
    primary_mechanism: string;
    insight: string;
    connecting_pathway: GraphNode | null;
    connecting_pathway_shared_with: number;
    other_pathways: { id: string; label: string; via: string }[];
    related_diseases: Array<{
      disease_id: string;
      label: string;
      basis: 'mechanism' | 'phenotype';
      score: number;
      shared_pathways: string[];
      shared_genes: string[];
      phenotype_similarity: number;
      shared_phenotypes: Array<{ label: string; informativeness?: string; informative: boolean }>;
    }>;
    counterexamples: Array<{ disease_id: string; label: string; pathway: string; this_direction: string; their_direction: string }>;
    literature: {
      n_papers: number;
      claims: Array<{
        subject: string;
        relation: string;
        object: string;
        relationship: string;
        n_papers: number;
        contradicts: boolean;
        evidence: Array<{ pmid: string; year: number | null; quote: string; context: string }>;
      }>;
      contradictions: Array<{ subject: string; relation: string; object: string }>;
    };
    repurposing_leads: GraphNode[];
    contraindications: Array<{ label: string; reason?: string }>;
  };
  step3_assets: {
    step_title: string;
    reusable_assets: Array<{
      name: string;
      type: string;
      custodian: string;
      reusability: string;
      for_disease: string;
      evidence_tier: string;
    }>;
    key_collaborators: Array<{
      name: string;
      institution: string;
      role: string;
      email?: string;
      connection: string;
      papers: string[];
      other_diseases: string[];
      source: string;
    }>;
  };
  step4_action: {
    step_title: string;
    action_this_week: string[];
    draft_proposal_email: string;
  };
}

export interface MoonshotData {
  milestone: string;
  case_study: string;
  events: Array<{ id: string; date: string; label: string; source: string; url: string }>;
  baselines: Array<{
    id: string;
    label: string;
    note: string;
    from: string;
    to: string;
    months: number;
    months_needed_for_10x: number;
    speedup_default: number;
    speedup_range: [number, number];
  }>;
  route: {
    stages: Array<{
      id: string;
      label: string;
      atlas_feature: string;
      default_months: number;
      min_months: number;
      max_months: number;
      assumption: string;
      validate: string;
    }>;
    default_months: number;
    best_case_months: number;
    worst_case_months: number;
  };
  caveats: string[];
  sources_checked: string;
}

export interface RepurposingHypothesis {
  molecule_name: string;
  drugbank_id: string;
  status: string;
  confidence_score: number;
  evidence_tier?: string;
  mechanism_of_action: string;
  target_genes: string[];
  recommended_assays: string[];
}

export interface ActionDossier {
  disease: GraphNode;
  marias_journey: MariasJourney;
  researcher_actions: {
    disease_name: string;
    orpha_code: string;
    omim_id: string;
    causal_genes: GraphNode[];
    target_pathways: GraphNode[];
    repurposing_hypotheses: RepurposingHypothesis[];
    silo_breaking_synergies: Array<{
      shared_pathway: string;
      synergy_insight: string;
    }>;
    evidence_base: GraphNode[];
    critical_research_voids: string[];
  };
  patient_actions: {
    disease_name: string;
    plain_language_summary: string;
    immediate_diagnostic_steps: string[];
    active_clinical_trials: Array<{
      trial_title: string;
      nct_id: string;
      phase: string;
      status: string;
      sponsor: string;
      locations: string;
      intervention: string;
      is_recruiting: boolean;
      action_url: string;
    }>;
    support_and_advocacy_groups: Array<{
      name: string;
      country: string;
      website: string;
      registry_url?: string;
      contact_url?: string;
      contact?: string;
    }>;
    patient_checklist: string[];
  };
  priya_actions: {
    mechanism_evaluation: string;
    addressable_patient_clusters: string[];
    preclinical_readiness: string;
    named_investigators: string[];
    key_reusable_assets: string[];
  };
  osei_actions: {
    unrelated_diseases_sharing_mechanism: Array<{ disease: string; pathway: string }>;
    collaborator_directory: Array<{ name: string; institution: string; email: string; connection?: string }>;
  };
  moonshot_10x: MoonshotData;
  subgraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    focus_node: GraphNode;
  };
}

export type PersonaType = 'maria' | 'devon' | 'priya' | 'dr_osei';

export interface Explanation {
  source: 'llm' | 'template';
  text: string;
  sentences: Array<{ text: string; facts: string[] }>;
  facts: Array<{ id: string; kind: string; text: string }>;
  dropped: Array<{ text: string; reason: string }>;
  model: string;
  endpoint: string;
  cached?: boolean;
  error?: string;
}
export type ViewTab = 'journey' | 'graph' | 'dossier' | 'moonshot' | 'silos' | 'trials' | 'chat';
