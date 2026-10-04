import React, { useEffect, useState } from 'react';
import { GraphStats } from '../types';
import { fetchGraphStats } from '../services/api';
import { href } from '../router';
import { Logo } from '../components/Logo';
import { SearchBox } from '../components/search/SearchBox';
import { ExploreMenu } from '../components/ExploreMenu';

const EXAMPLES = [
  { label: 'NGLY1 deficiency', to: href('disease', 'DIS_NGLY1') },
  { label: 'SCN2A loss-of-function', to: href('disease', 'DIS_SCN2A_LOF') },
  { label: 'Rett syndrome', to: href('disease', 'DIS_MECP2') },
  { label: 'CDKL5 deficiency disorder', to: href('disease', 'DIS_CDKL5') },
];

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<GraphStats | null>(null);
  useEffect(() => {
    fetchGraphStats().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex justify-end px-4 sm:px-6 py-3">
        <ExploreMenu />
      </div>
      <main className="flex-1 flex flex-col items-center px-4 pt-[14vh]">
        <Logo size="large" />
        <p className="mt-3 text-slate-500 text-center">An evidence-backed knowledge graph for rare diseases</p>
        <div className="w-full max-w-2xl mt-8">
          <SearchBox size="large" autoFocus />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          <span className="text-slate-400">Try</span>
          {EXAMPLES.map((e, i) => (
            <React.Fragment key={e.to}>
              {i > 0 && <span className="text-slate-300">·</span>}
              <a href={e.to} className="text-emerald-800 hover:underline">
                {e.label}
              </a>
            </React.Fragment>
          ))}
        </div>
      </main>
      <footer className="py-6 px-4 text-center text-xs text-slate-400 space-y-1">
        {stats && (
          <p>
            {stats.monogenic_diseases} diseases · {stats.patient_foundations} patient organizations · {stats.clinical_trials} registered
            studies · {stats.evidence_publications} papers
          </p>
        )}
        <p>Built from HPO, OMIM, Reactome, MONDO, PubMed and ClinicalTrials.gov. Every link shows its source.</p>
      </footer>
    </div>
  );
};
