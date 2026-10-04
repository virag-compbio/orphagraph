import React from 'react';

// Evidence tiers recorded on drug->disease edges, strongest first. Shown instead of a numeric
// score: the curated confidence values are hand-entered, not computed.
const TIERS: Record<string, { label: string; className: string }> = {
  CLINICAL_PROVEN: { label: 'Clinically proven', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLINICAL_OBSERVATIONAL: { label: 'Clinical, observational', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  CLINICAL_CASE_REPORTS: { label: 'Case reports', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  PRECLINICAL_VALIDATED: { label: 'Preclinical', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  INFERRED_HYPOTHESIS: { label: 'Hypothesis', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export function evidenceTierLabel(tier?: string): string {
  if (!tier) return 'Evidence not recorded';
  return TIERS[tier]?.label ?? tier.replace(/_/g, ' ').toLowerCase();
}

export const EvidenceTierBadge: React.FC<{ tier?: string }> = ({ tier }) => (
  <span
    title="Evidence tier of the recorded link"
    className={`px-2 py-0.5 text-[10px] font-medium border rounded whitespace-nowrap ${
      (tier && TIERS[tier]?.className) || 'bg-slate-50 text-slate-500 border-slate-200'
    }`}
  >
    {evidenceTierLabel(tier)}
  </span>
);
