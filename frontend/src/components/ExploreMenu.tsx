import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { href } from '../router';

const ITEMS = [
  { to: href('explore', 'graph'), label: 'Knowledge graph', description: 'Every disease, gene and link, drawn as a network' },
  { to: href('explore', 'pathways'), label: 'Shared pathways', description: 'Pathways that connect several diseases' },
  { to: href('explore', '10x'), label: '10× Moonshot', description: 'How much faster a first natural-history cohort could be' },
];

export const ExploreMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg"
      >
        Explore <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
          {ITEMS.map((item) => (
            <a key={item.to} href={item.to} onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-slate-50">
              <div className="text-sm text-slate-900">{item.label}</div>
              <div className="text-xs text-slate-500">{item.description}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
