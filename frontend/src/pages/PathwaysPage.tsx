import React, { useEffect, useState } from 'react';
import { fetchSiloAnalysis, SiloAnalysis } from '../services/api';
import { href } from '../router';
import { EvidenceTierBadge } from '../components/EvidenceTierBadge';
import { Section, ExtLink } from '../components/disease/Section';

// Pathways that link several diseases (directly or through their causal genes), and every drug in
// the atlas with its strongest evidence.
export const PathwaysPage: React.FC = () => {
  const [data, setData] = useState<SiloAnalysis | null>(null);
  useEffect(() => {
    document.title = 'Shared pathways · Orphagraph Atlas';
    fetchSiloAnalysis().then(setData).catch(() => undefined);
  }, []);

  if (!data) return <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="pb-6 max-w-3xl">
        <div className="text-sm text-slate-500">Explore</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Shared pathways</h1>
        <p className="mt-3 text-slate-700 leading-relaxed">
          Rare diseases are usually studied one at a time. Diseases that disrupt the same pathway could share cell assays, screens and
          biomarkers. {data.total_cross_disease_pathways} pathways link two or more of the atlas's {data.total_diseases} diseases; the{' '}
          {data.cross_disease_pathways.length} linking the most are listed here.
        </p>
      </header>

      <Section id="pathways" title="Pathways linking the most diseases">
        <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
          {data.cross_disease_pathways.map((c) => {
            const reactome = c.database_id?.startsWith('REACTOME:') ? c.database_id.slice(9) : undefined;
            return (
              <div key={c.pathway_id}>
                <div className="font-medium text-slate-900">
                  {reactome ? <ExtLink href={`https://reactome.org/content/detail/${reactome}`}>{c.pathway}</ExtLink> : c.pathway}
                </div>
                <div className="text-xs text-slate-500">
                  {c.connected_diseases.length} diseases{c.size ? ` · ${c.size} genes` : ''}
                </div>
                <p className="mt-1.5 text-sm leading-6">
                  {c.connected_diseases.map((d, i) => (
                    <React.Fragment key={d.id}>
                      {i > 0 && <span className="text-slate-300"> · </span>}
                      <a href={href('disease', d.id)} className={`hover:underline ${d.curated ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>
                        {d.label}
                      </a>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-slate-500">Curated diseases are shown first, in bold. Pathways with more than 40 genes are not used.</p>
      </Section>

      <Section id="drugs" title="Drugs in the atlas" note="Each drug with the strongest evidence recorded for any of its disease links.">
        <ul className="space-y-4">
          {data.repurposing_matrix.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-6 text-sm">
              <div className="max-w-2xl">
                <a href={href('drug', r.id)} className="text-emerald-800 hover:underline font-medium">
                  {r.drug}
                </a>
                <div className="text-slate-500">{r.status}</div>
                <div className="text-slate-600 mt-0.5">{r.mechanism}</div>
              </div>
              <div className="text-right shrink-0">
                <EvidenceTierBadge tier={r.evidence_tier} />
                {r.evidence_for && <div className="mt-1 text-xs text-slate-500 max-w-[200px]">{r.evidence_for}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};
