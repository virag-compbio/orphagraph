import { NodeType } from '../types';

export const NODE_CONFIG: Record<NodeType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: string;
  canvasColor: string;
}> = {
  disease: {
    label: 'Rare Disease',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-600',
    iconName: 'Activity',
    canvasColor: '#ef4444'
  },
  gene: {
    label: 'Gene / Variant',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
    iconName: 'Dna',
    canvasColor: '#3b82f6'
  },
  symptom: {
    label: 'HPO Phenotype',
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconName: 'AlertTriangle',
    canvasColor: '#f59e0b'
  },
  pathway: {
    label: 'Biological Pathway / Mechanism',
    color: '#06b6d4',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-600',
    iconName: 'GitMerge',
    canvasColor: '#06b6d4'
  },
  drug: {
    label: 'Repurposing Lead / Drug',
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600',
    iconName: 'Pill',
    canvasColor: '#10b981'
  },
  asset: {
    label: 'Reusable Research Asset',
    color: '#eab308',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    iconName: 'Database',
    canvasColor: '#eab308'
  },
  investigator: {
    label: 'Key Opinion Leader / Scientist',
    color: '#6366f1',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-600',
    iconName: 'UserCheck',
    canvasColor: '#6366f1'
  },
  trial: {
    label: 'Clinical Trial / Study',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
    iconName: 'FlaskConical',
    canvasColor: '#8b5cf6'
  },
  patient_group: {
    label: 'Patient Advocacy Foundation',
    color: '#ec4899',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-600',
    iconName: 'HeartHandshake',
    canvasColor: '#ec4899'
  },
  publication: {
    label: 'Scientific Evidence',
    color: '#94a3b8',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-500',
    iconName: 'BookOpen',
    canvasColor: '#94a3b8'
  }
};

export function getNodeColor(type: NodeType): string {
  return NODE_CONFIG[type]?.canvasColor || '#64748b';
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}
