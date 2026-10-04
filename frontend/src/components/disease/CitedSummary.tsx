import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Explanation } from '../../types';

// A model-written summary, sentence by sentence; each citation chip shows its fact on hover.
// Template text is shown as-is when no model output is available.
export const CitedSummary: React.FC<{ explanation: Explanation | null; loading: boolean; audience?: string }> = ({
  explanation,
  loading,
  audience,
}) => {
  const [showFacts, setShowFacts] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
        <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Writing a cited summary with the local model (up to a minute the first time)…
      </div>
    );
  }
  if (!explanation) return null;

  const factsById = Object.fromEntries(explanation.facts.map((f) => [f.id, f]));
  const isLLM = explanation.source === 'llm';

  return (
    <div className="bg-slate-50 rounded-2xl px-5 py-4 space-y-3">
      <p className="text-[15px] leading-7 text-slate-800">
        {isLLM
          ? explanation.sentences.map((s, i) => (
              <span key={i}>
                {s.text}
                {s.facts.map((fid) => (
                  <sup
                    key={fid}
                    title={factsById[fid]?.text}
                    className="ml-0.5 px-1 rounded bg-white border border-slate-200 text-slate-500 font-mono text-[9px] cursor-help"
                  >
                    {fid}
                  </sup>
                ))}{' '}
              </span>
            ))
          : explanation.text}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>
          {isLLM
            ? `Written by ${explanation.model}${audience ? ` for ${audience.toLowerCase()} readers` : ''}. Each sentence cites the atlas facts it uses; hover a number to see one. ${
                explanation.dropped.length ? `${explanation.dropped.length} sentence(s) failed the citation check and were removed. ` : ''
              }Wording can still overstate a fact.`
            : 'Template summary (the language model is not available).'}
        </span>
        <button onClick={() => setShowFacts(!showFacts)} className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-900">
          {showFacts ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Facts used ({explanation.facts.length})
        </button>
      </div>
      {showFacts && (
        <ol className="space-y-1 text-xs text-slate-600 border-t border-slate-200 pt-3">
          {explanation.facts.map((f) => (
            <li key={f.id}>
              <span className="font-mono text-slate-400 mr-1.5">{f.id}</span>
              {f.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
