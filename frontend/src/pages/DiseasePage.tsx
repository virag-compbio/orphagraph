import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, Printer } from 'lucide-react';
import { ActionDossier, Explanation, PersonaType, PERSONAS } from '../types';
import { fetchActionDossier, fetchJourneyExplanation } from '../services/api';
import { href } from '../router';
import { withBold } from '../utils/richText';
import { EvidenceTierBadge } from '../components/EvidenceTierBadge';
import { CitedSummary } from '../components/disease/CitedSummary';
import { PathwayDetails } from '../components/disease/PathwayDetails';
import { Section, Empty, ExtLink, pubmed } from '../components/disease/Section';

const SECTIONS = [
  { id: 'summary', title: 'Summary' },
  { id: 'treatments', title: 'Treatments & studies' },
  { id: 'connected', title: 'Connected diseases' },
  { id: 'literature', title: 'Literature' },
  { id: 'leads', title: 'Repurposing leads' },
  { id: 'resources', title: 'Resources & people' },
  { id: 'organizations', title: 'Patient organizations' },
  { id: 'next', title: 'Next steps' },
];

export const DiseasePage: React.FC<{ diseaseId: string; persona: PersonaType }> = ({ diseaseId, persona }) => {
  const [dossier, setDossier] = useState<ActionDossier | null>(null);
  const [error, setError] = useState(false);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  useEffect(() => {
    setDossier(null);
    setError(false);
    fetchActionDossier(diseaseId, false).then(setDossier).catch(() => setError(true));
  }, [diseaseId]);

  useEffect(() => {
    let cancelled = false;
    setExplanation(null);
    setExplaining(true);
    fetchJourneyExplanation(diseaseId, persona)
      .then((e) => !cancelled && setExplanation(e))
      .catch(() => !cancelled && setExplanation(null))
      .finally(() => !cancelled && setExplaining(false));
    return () => {
      cancelled = true;
    };
  }, [diseaseId, persona]);

  useEffect(() => {
    if (dossier) document.title = `${dossier.disease.label} · Orphagraph Atlas`;
  }, [dossier]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-600">
        <p className="text-lg text-slate-900">No disease with this id is in the atlas.</p>
        <p className="mt-2 text-sm">Try searching for it by name, gene or OMIM number above.</p>
      </div>
    );
  }
  if (!dossier) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-sm text-slate-500">Loading…</div>;
  }

  const d = dossier.disease;
  const j = dossier.marias_journey;
  const m = j.step2_mechanism;
  const curated = !d.id.startsWith('DIS_OMIM_');
  const mechanismNeighbours = m.related_diseases.filter((r) => r.basis === 'mechanism');
  const phenotypeNeighbours = m.related_diseases.filter((r) => r.basis === 'phenotype');
  const trials = dossier.patient_actions.active_clinical_trials;
  const groups = dossier.patient_actions.support_and_advocacy_groups;
  const genes = dossier.researcher_actions.causal_genes;
  const audience = PERSONAS.find((p) => p.id === persona)?.label;

  const copyEmail = () => {
    navigator.clipboard.writeText(j.step4_action.draft_proposal_email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const downloadDossier = () => {
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `OrphagraphAtlas_${d.code || d.id}.json`.replace(/[^A-Za-z0-9_.-]/g, '_');
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const orphaNum = d.code?.startsWith('ORPHA:') ? d.code.slice(6) : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-12">
      <article className="max-w-3xl">
        {/* Title */}
        <header className="pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{d.label}</h1>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            {orphaNum && <ExtLink href={`https://www.orpha.net/en/disease/detail/${orphaNum}`}>{d.code}</ExtLink>}
            {d.omim && <ExtLink href={`https://omim.org/entry/${d.omim}`}>OMIM {d.omim}</ExtLink>}
            {d.inheritance && <span>{d.inheritance}</span>}
            {genes.length > 0 && (
              <span>
                Gene{genes.length > 1 ? 's' : ''}{' '}
                {genes.map((g, i) => (
                  <React.Fragment key={g.id}>
                    {i > 0 && ', '}
                    <a href={href('gene', g.id)} className="text-emerald-800 hover:underline">
                      {g.label}
                    </a>
                  </React.Fragment>
                ))}
              </span>
            )}
          </div>
          {(d.description || d.omim_name) && <p className="mt-3 text-slate-700 leading-relaxed">{d.description || d.omim_name}</p>}
          {dossier.phenotypes.length > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="text-slate-500">Key symptoms: </span>
              {(showAllSymptoms ? dossier.phenotypes : dossier.phenotypes.slice(0, 8)).map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && ', '}
                  <a href={href('symptom', p.id)} className="text-emerald-800 hover:underline">
                    {p.label}
                  </a>
                </React.Fragment>
              ))}
              {dossier.phenotypes.length > 8 && (
                <button onClick={() => setShowAllSymptoms(!showAllSymptoms)} className="ml-2 text-slate-500 hover:text-slate-900">
                  {showAllSymptoms ? 'show fewer' : `all ${dossier.phenotypes.length}`}
                </button>
              )}
            </p>
          )}
          {!curated && (
            <p className="mt-3 text-sm text-slate-500">
              Imported from HPO and OMIM. Trials, resources and patient organizations are curated for 13 diseases only, so most sections below are
              computed links.
            </p>
          )}
        </header>

        <Section id="summary" title="Summary" note={audience ? `Written for: ${audience}. Change this with "Explain for" above.` : undefined}>
          <CitedSummary explanation={explanation} loading={explaining} audience={audience} />
        </Section>

        <Section id="treatments" title="Treatments & studies">
          <p className="text-slate-700">{j.step1_diagnosis.treatment_line}</p>
          {trials.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {trials.map((t) => (
                <li key={t.nct_id}>
                  <ExtLink href={t.action_url} className="font-medium">
                    {t.trial_title}
                  </ExtLink>
                  <div className="mt-0.5 text-sm text-slate-500 flex flex-wrap gap-x-2">
                    <span>{t.nct_id}</span>
                    {t.phase && <span>· {t.phase}</span>}
                    <span>
                      ·{' '}
                      <span className={t.is_recruiting ? 'text-emerald-700 font-medium' : ''}>{t.status}</span>
                    </span>
                    {t.sponsor && <span>· {t.sponsor}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No registered studies are recorded for this condition in the atlas.</p>
          )}
        </Section>

        <Section id="connected" title="Connected diseases" note="Linked by a shared biological pathway, not by name.">
          {mechanismNeighbours.length > 0 ? (
            <div className="space-y-4">
              <PathwayDetails mechanism={m} />
              <ul className="space-y-2.5">
                {mechanismNeighbours.map((r) => (
                  <li key={r.disease_id} className="text-sm">
                    <a href={href('disease', r.disease_id)} className="text-emerald-800 hover:underline font-medium">
                      {r.label}
                    </a>
                    <div className="text-slate-500">
                      {r.shared_genes.length > 0 && <>same gene {r.shared_genes.join(', ')} · </>}
                      via {r.shared_pathways.slice(0, 2).join('; ')}
                      {r.shared_pathways.length > 2 && ` and ${r.shared_pathways.length - 2} more`}
                      {r.phenotype_similarity > 0 && <> · phenotype similarity {r.phenotype_similarity.toFixed(2)}</>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty>No shared pathway with another disease is recorded in the atlas.</Empty>
          )}

          {m.counterexamples.map((c) => (
            <div key={c.disease_id} className="mt-4 flex gap-2.5 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-amber-900">
                <a href={href('disease', c.disease_id)} className="font-medium underline">
                  {c.label}
                </a>{' '}
                affects the same pathway ({c.pathway}) in the opposite direction ({c.their_direction.replace(/_/g, ' ')} vs{' '}
                {c.this_direction.replace(/_/g, ' ')}). Do not pool treatment strategy with it.
              </p>
            </div>
          ))}

          {phenotypeNeighbours.length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-slate-700">
                {phenotypeNeighbours.length} similar-looking disease{phenotypeNeighbours.length > 1 ? 's' : ''}{' '}
                <span className="text-slate-500">(similar symptoms; not evidence of a shared mechanism)</span>
              </summary>
              <ul className="mt-3 space-y-2.5">
                {phenotypeNeighbours.map((r) => (
                  <li key={r.disease_id}>
                    <a href={href('disease', r.disease_id)} className="text-emerald-800 hover:underline">
                      {r.label}
                    </a>
                    <div className="text-slate-500">
                      {r.shared_phenotypes.slice(0, 3).map((p) => p.label).join(', ')} · similarity {r.phenotype_similarity.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>

        <Section
          id="literature"
          title="Literature"
          note={
            m.literature.claims.length
              ? `${m.literature.claims.length} claim${m.literature.claims.length > 1 ? 's' : ''} from ${m.literature.n_papers} PubMed paper${
                  m.literature.n_papers > 1 ? 's' : ''
                }, extracted by the local model; every quote was checked word for word against the abstract.`
              : undefined
          }
        >
          {m.literature.claims.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-700">Show claims and quotes</summary>
              <ul className="mt-3 space-y-3">
                {m.literature.claims.map((c, i) => (
                  <li key={i}>
                    <div className="text-slate-800">
                      {c.subject} <span className="text-slate-500">{c.relation}</span> {c.object}
                      {c.contradicts && <span className="ml-2 text-red-700">contradicts a recorded claim</span>}
                    </div>
                    {c.evidence.slice(0, 2).map((ev) => (
                      <div key={ev.pmid} className="mt-0.5 text-slate-500">
                        <span className="italic">“{ev.quote}”</span> <ExtLink href={pubmed(ev.pmid)}>PMID {ev.pmid}</ExtLink>
                        {ev.year ? ` (${ev.year})` : ''}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <Empty>No literature claims were extracted for this condition.</Empty>
          )}
        </Section>

        <Section id="leads" title="Repurposing leads" note="Existing drugs linked to this condition, with the strength of the evidence behind each link.">
          {m.repurposing_leads.length > 0 ? (
            <ul className="space-y-3">
              {m.repurposing_leads.map((drug) => (
                <li key={drug.id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <a href={href('drug', drug.id)} className="text-emerald-800 hover:underline font-medium">
                      {drug.label}
                    </a>
                    <div className="text-slate-500">
                      {drug.fda_status}
                      {drug.source_pmid && (
                        <>
                          {' · '}
                          <ExtLink href={pubmed(drug.source_pmid)}>PMID {drug.source_pmid}</ExtLink>
                        </>
                      )}
                    </div>
                  </div>
                  <EvidenceTierBadge tier={drug.evidence_tier} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No repurposing candidate is recorded for this condition.</Empty>
          )}
          {m.contraindications.map((c, i) => (
            <div key={i} className="mt-4 flex gap-2.5 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
              <p className="text-red-900">
                <span className="font-medium">Caution: {c.label}.</span> {c.reason}
              </p>
            </div>
          ))}
        </Section>

        <Section id="resources" title="Resources & people" note="Linked to this condition or to diseases that share its pathway. Resources built for another disease need expert review before reuse.">
          <h3 className="text-sm font-medium text-slate-900">Research resources</h3>
          {j.step3_assets.reusable_assets.length > 0 ? (
            <ul className="mt-2 space-y-3">
              {j.step3_assets.reusable_assets.map((a, i) => (
                <li key={i} className="text-sm">
                  <div className="text-slate-900">{a.name}</div>
                  <div className="text-slate-500">
                    {a.type} · {a.custodian} · built for {a.for_disease}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">None linked yet.</p>
          )}
          <h3 className="mt-6 text-sm font-medium text-slate-900">People</h3>
          {j.step3_assets.key_collaborators.length > 0 ? (
            <ul className="mt-2 space-y-3">
              {j.step3_assets.key_collaborators.map((k, i) => (
                <li key={i} className="text-sm">
                  <div className="text-slate-900">
                    {k.name}
                    {k.institution && (
                      <span className="text-slate-500" title={k.institution}>
                        , {k.institution.length > 70 ? `${k.institution.slice(0, 68).trimEnd()}…` : k.institution}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500">
                    {k.connection}
                    {k.papers.length > 0 && (
                      <>
                        {' · '}
                        {k.papers.slice(0, 3).map((p, pi) => (
                          <React.Fragment key={p}>
                            {pi > 0 && ', '}
                            <ExtLink href={pubmed(p)}>PMID {p}</ExtLink>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                    {k.other_diseases.length > 0 && <> · also works on {k.other_diseases.join(', ')}</>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">None linked yet.</p>
          )}
        </Section>

        <Section id="organizations" title="Patient organizations">
          {groups.length > 0 ? (
            <ul className="space-y-3">
              {groups.map((g) => (
                <li key={g.name} className="text-sm">
                  <ExtLink href={g.website} className="font-medium">
                    {g.name}
                  </ExtLink>
                  <span className="text-slate-500"> · {g.country}</span>
                  <div className="text-slate-500 flex flex-wrap gap-x-3">
                    {g.registry_url && <ExtLink href={g.registry_url}>Patient registry</ExtLink>}
                    {g.contact_url && <ExtLink href={g.contact_url}>Contact</ExtLink>}
                    {g.contact && <span>{g.contact}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No patient organization is linked in the atlas. The NORD, Global Genes and Orphanet directories list more.</Empty>
          )}
        </Section>

        <Section id="next" title="Next steps" note="Each step names something found above; gaps are stated rather than filled in.">
          <ol className="list-decimal pl-5 space-y-2 text-slate-700 marker:text-slate-400">
            {j.step4_action.action_this_week.map((a, i) => (
              <li key={i}>{withBold(a.replace(/^\d+\.\s*/, ''))}</li>
            ))}
          </ol>
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer text-slate-700">Draft outreach email</summary>
            <div className="mt-3 relative">
              <button
                onClick={copyEmail}
                className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 hover:bg-slate-50"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 rounded-xl p-4 pr-20 leading-relaxed">
                {j.step4_action.draft_proposal_email}
              </pre>
            </div>
          </details>
          <div className="mt-5 flex flex-wrap gap-2 print:hidden">
            <button onClick={downloadDossier} className="inline-flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 rounded-full px-3.5 py-1.5 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Download dossier (JSON)
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm text-slate-700 border border-slate-300 rounded-full px-3.5 py-1.5 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </Section>
      </article>

      {/* On this page */}
      <nav className="hidden lg:block print:hidden">
        <div className="sticky top-24 text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">On this page</div>
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-slate-500 hover:text-slate-900"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};
