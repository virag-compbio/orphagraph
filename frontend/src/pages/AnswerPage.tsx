import React, { useEffect, useState } from 'react';
import { Explanation, GraphNode } from '../types';
import { sendChatQuery, searchEntities, SearchHit } from '../services/api';
import { href } from '../router';
import { CitedSummary } from '../components/disease/CitedSummary';
import { Section } from '../components/disease/Section';

const TYPE_LABEL: Record<string, string> = { disease: 'Disease', gene: 'Gene', symptom: 'Symptom', drug: 'Drug' };

// Free-text questions: a cited answer about the first disease recognised in the question, plus
// search matches for the words in it.
export const AnswerPage: React.FC<{ query: string }> = ({ query }) => {
  const [answer, setAnswer] = useState<Explanation | null>(null);
  const [about, setAbout] = useState<GraphNode | null>(null);
  const [mentioned, setMentioned] = useState<GraphNode[]>([]);
  const [matches, setMatches] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${query} · Orphagraph Atlas`;
    let cancelled = false;
    setLoading(true);
    setAnswer(null);
    setAbout(null);
    setMentioned([]);
    setMatches([]);

    // Search matches: for the whole query, else for each longer word in it
    const words = query.split(/\s+/).filter((w) => w.length > 3);
    Promise.all([query, ...words].map((q) => searchEntities(q, 4).catch(() => null))).then((all) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const hits: SearchHit[] = [];
      for (const r of all) {
        if (!r) continue;
        for (const h of [...r.disease, ...r.gene, ...r.symptom, ...r.drug]) {
          if (!seen.has(h.id)) {
            seen.add(h.id);
            hits.push(h);
          }
        }
        if (hits.length && r === all[0]) break; // the whole query matched; skip per-word matches
      }
      setMatches(hits.slice(0, 12));
    });

    sendChatQuery(query)
      .then((r) => {
        if (cancelled) return;
        setAnswer(r.answer || null);
        setAbout(r.matched_entities.diseases[0] || null);
        setMentioned([...r.matched_entities.diseases, ...r.matched_entities.genes, ...r.matched_entities.drugs]);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{query}</h1>

      <Section id="answer" title="Answer">
        {loading ? (
          <CitedSummary explanation={null} loading />
        ) : answer && about ? (
          <>
            <p className="text-sm text-slate-500 mb-3">
              {answer.source === 'llm' ? 'Answered from the atlas facts about ' : 'The language model is not available, so this is the standard summary for '}
              <a href={href('disease', about.id)} className="text-emerald-800 hover:underline">
                {about.label}
              </a>
              {answer.source === 'llm' ? '.' : '; its page has the full details.'}
            </p>
            <CitedSummary explanation={answer} loading={false} />
          </>
        ) : (
          <p className="text-slate-700">
            The atlas answers questions about the diseases it covers, and no disease was recognised in this question. Try naming a disease, or
            open one of the matches below.
          </p>
        )}
      </Section>

      {mentioned.length > 1 && (
        <Section id="mentioned" title="Mentioned in your question">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {mentioned.map((n) => (
              <li key={n.id}>
                <a href={href(n.type, n.id)} className="text-emerald-800 hover:underline">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {matches.length > 0 && (
        <Section id="matches" title="Matching entries">
          <ul className="space-y-2.5">
            {matches.map((h) => (
              <li key={h.id} className="text-sm">
                <a href={href(h.type, h.id)} className="text-emerald-800 hover:underline font-medium">
                  {h.label}
                </a>
                <div className="text-slate-500">
                  {TYPE_LABEL[h.type]}
                  {h.curated && ' · curated'}
                  {h.detail && ` · ${h.detail}`}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};
