import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { searchEntities, SearchHit } from '../../services/api';
import { href, navigate } from '../../router';

const GROUPS: Array<{ type: SearchHit['type']; label: string }> = [
  { type: 'disease', label: 'Diseases' },
  { type: 'gene', label: 'Genes' },
  { type: 'symptom', label: 'Symptoms' },
  { type: 'drug', label: 'Drugs' },
];

interface SearchBoxProps {
  size?: 'large' | 'compact';
  initialQuery?: string;
  autoFocus?: boolean;
}

// One box for everything: suggestions grouped by type while typing; Enter opens the highlighted
// suggestion, or asks the query as a question when nothing is highlighted.
export const SearchBox: React.FC<SearchBoxProps> = ({ size = 'large', initialQuery = '', autoFocus = false }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Record<string, SearchHit[]>>({});
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults({});
      return;
    }
    const timer = setTimeout(() => {
      searchEntities(q).then(setResults).catch(() => setResults({}));
    }, 120);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Flat list in display order, for keyboard navigation; the last entry is "ask as a question"
  const flat = useMemo(() => GROUPS.flatMap((g) => results[g.type] || []), [results]);
  const askIndex = flat.length;

  const go = (hit?: SearchHit) => {
    setOpen(false);
    if (hit) navigate(href(hit.type, hit.id));
    else if (query.trim()) navigate(`#/ask?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, askIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(active >= 0 && active < flat.length ? flat[active] : undefined);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const large = size === 'large';
  const showMenu = open && query.trim().length > 0;
  let index = -1;

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`flex items-center bg-white border border-slate-300 transition-shadow focus-within:border-emerald-600 focus-within:shadow-md ${
          large ? 'rounded-full px-5 py-3.5 shadow-sm' : 'rounded-full px-4 py-2'
        } ${showMenu ? 'rounded-b-none rounded-t-3xl' : ''}`}
      >
        <Search className={`${large ? 'h-5 w-5' : 'h-4 w-4'} text-slate-400 shrink-0`} />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search a disease, gene, symptom or drug, or ask a question"
          aria-label="Search the atlas"
          className={`flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400 ml-3 ${large ? 'text-base' : 'text-sm'}`}
        />
      </div>

      {showMenu && (
        <div className="absolute z-40 left-0 right-0 bg-white border border-t-0 border-slate-300 rounded-b-3xl shadow-lg pb-2 max-h-[70vh] overflow-y-auto">
          {GROUPS.map((g) => {
            const hits = results[g.type] || [];
            if (!hits.length) return null;
            return (
              <div key={g.type} className="pt-2">
                <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</div>
                {hits.map((hit) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      key={hit.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(hit)}
                      className={`w-full text-left px-5 py-1.5 flex items-baseline justify-between gap-3 ${active === i ? 'bg-slate-100' : ''}`}
                    >
                      <span className="text-sm text-slate-800 truncate">{hit.label}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {hit.curated && <span className="text-emerald-700 mr-2">curated</span>}
                        {hit.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <button
            onMouseEnter={() => setActive(askIndex)}
            onClick={() => go()}
            className={`w-full text-left px-5 py-2 mt-1 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-600 ${
              active === askIndex ? 'bg-slate-100' : ''
            }`}
          >
            <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Ask: <span className="text-slate-900">{query.trim()}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
