import React from 'react';

export const Section: React.FC<{ id: string; title: string; note?: string; children: React.ReactNode }> = ({ id, title, note, children }) => (
  <section id={id} className="scroll-mt-24 py-7 border-t border-slate-200 first:border-t-0">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    {note && <p className="text-sm text-slate-500 mt-0.5">{note}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-slate-500">{children}</p>;

export const ExtLink: React.FC<{ href: string; children: React.ReactNode; className?: string }> = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noreferrer" className={`text-emerald-800 hover:underline ${className}`}>
    {children}
  </a>
);

export const pubmed = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
