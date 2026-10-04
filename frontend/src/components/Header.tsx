import React from 'react';
import { PersonaType, PERSONAS } from '../types';
import { Logo } from './Logo';
import { SearchBox } from './search/SearchBox';
import { ExploreMenu } from './ExploreMenu';

interface HeaderProps {
  query?: string;
  persona?: PersonaType;
  setPersona?: (p: PersonaType) => void;
}

// Header for every page except home: logo, compact search, "Explain for" (when the page has a
// summary) and the Explore menu.
export const Header: React.FC<HeaderProps> = ({ query = '', persona, setPersona }) => (
  <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      <a href="#/" aria-label="Orphagraph Atlas home" className="shrink-0">
        <Logo />
      </a>
      <div className="flex-1 min-w-[240px] max-w-2xl">
        <SearchBox size="compact" initialQuery={query} />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        {persona && setPersona && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline">Explain for</span>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as PersonaType)}
              title={PERSONAS.find((p) => p.id === persona)?.description}
              className="text-sm text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-600"
            >
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <ExploreMenu />
      </div>
    </div>
  </header>
);
