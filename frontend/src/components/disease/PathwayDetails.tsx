import React from 'react';
import { MariasJourney } from '../../types';

// The primary pathway's own description when it has one (curated records); for imported Reactome
// pathways, which carry none, the record itself: source, identifier, size and how widely it is shared.
export const PathwayDetails: React.FC<{ mechanism: MariasJourney['step2_mechanism'] }> = ({ mechanism }) => {
  const p = mechanism.connecting_pathway;
  if (!p) return null;
  const dbId = p.database_id;
  const reactomeId = dbId?.startsWith('REACTOME:') ? dbId.slice('REACTOME:'.length) : undefined;
  const shared = mechanism.connecting_pathway_shared_with;
  return (
    <div className="border border-slate-200 rounded-xl px-4 py-3 text-sm space-y-1">
      <div className="text-xs uppercase tracking-wider text-slate-400">Main shared pathway</div>
      <div className="font-medium text-slate-900">{p.label}</div>
      {p.description && <p className="text-slate-600">{p.description}</p>}
      <p className="text-xs text-slate-500">
        {[p.source, p.size ? `${p.size} genes` : null].filter(Boolean).join(' · ')}
        {dbId && (
          <>
            {' · '}
            {reactomeId ? (
              <a href={`https://reactome.org/content/detail/${reactomeId}`} target="_blank" rel="noreferrer" className="text-emerald-800 hover:underline">
                {reactomeId}
              </a>
            ) : (
              dbId
            )}
          </>
        )}
        {' · '}
        {shared > 0 ? `shared with ${shared} related disease${shared === 1 ? '' : 's'}` : 'not shared with another disease in the atlas'}
      </p>
      {mechanism.other_pathways.length > 0 && (
        <p className="text-xs text-slate-500">
          Also recorded: {mechanism.other_pathways.slice(0, 4).map((o) => o.label).join('; ')}
          {mechanism.other_pathways.length > 4 && ` and ${mechanism.other_pathways.length - 4} more`}
        </p>
      )}
    </div>
  );
};
