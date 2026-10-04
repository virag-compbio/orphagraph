import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  BookOpen, 
  ArrowUpRight, 
  CheckCircle2, 
  Activity, 
  Pill, 
  ShieldCheck,
  User
} from 'lucide-react';
import { sendChatQuery } from '../services/api';
import { ExplanationPanel } from './ExplanationPanel';

export const AICopilot: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content?: string;
    data?: any;
  }>>([
    {
      role: 'assistant',
      content: "Ask about one of the diseases in the atlas (about 160 rare monogenic diseases). Answers are written by a local model from atlas facts, and every sentence cites the facts it uses."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "What are repurposing leads for NGLY1 deficiency?",
    "How does Trofinetide work in Rett Syndrome (MECP2)?",
    "What trials exist for STXBP1 Encephalopathy?",
    "What resources exist for Menkes disease?"
  ];

  const handleSubmit = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await sendChatQuery(q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          data: response
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I encountered an error querying the knowledge graph. Please check your backend connection."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-135px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">Atlas Q&amp;A</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md">
                Cited answers
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Query diseases, genes, phenotypes, and multi-hop drug repurposing pathways.
            </p>
          </div>
        </div>
      </div>

      {/* Message Chat Flow */}
      <div className="flex-1 bg-white/70 border border-slate-200 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                  : 'bg-slate-50/90 border border-slate-200 text-slate-800 rounded-tl-none space-y-3'
              }`}
            >
              {msg.content && <div className="prose prose-invert prose-xs">{msg.content}</div>}

              {msg.data && (
                <div className="space-y-3">
                  {msg.data.answer && <ExplanationPanel explanation={msg.data.answer} loading={false} title="Answer" />}
                  {/* Key Insights */}
                  {msg.data.insights && (
                    <div className="space-y-1.5">
                      {msg.data.insights.map((ins: string, idx: number) => (
                        <p key={idx} className="text-slate-700 leading-relaxed">
                          {ins}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Actionable Steps */}
                  {msg.data.actionable_steps && msg.data.actionable_steps.length > 0 && (
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                        Actionable Next Steps
                      </span>
                      <ul className="space-y-1 text-emerald-800">
                        {msg.data.actionable_steps.map((step: string, sidx: number) => (
                          <li key={sidx} className="flex items-start space-x-1.5">
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence Citations */}
                  {msg.data.evidence_citations && msg.data.evidence_citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block flex items-center space-x-1">
                        <BookOpen className="h-3 w-3 text-blue-600" />
                        <span>Evidence Citations ({msg.data.evidence_citations.length})</span>
                      </span>
                      <div className="space-y-1">
                        {msg.data.evidence_citations.map((cite: any, cidx: number) => (
                          <a
                            key={cidx}
                            href={`https://pubmed.ncbi.nlm.nih.gov/${cite.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] text-blue-700 transition-colors"
                          >
                            <div className="font-semibold">{cite.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {cite.journal} ({cite.year}) • PMID:{cite.pmid}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
            <span>Collecting atlas facts and writing a cited answer with the local model...</span>
          </div>
        )}
      </div>

      {/* Starter Prompts */}
      <div className="flex flex-wrap gap-1.5">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSubmit(p)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xl flex items-center space-x-2">
        <input
          type="text"
          placeholder="Ask a question about rare disease mechanisms, drug repurposing, or trials..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !query.trim()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors shadow-md shadow-emerald-600/20"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
