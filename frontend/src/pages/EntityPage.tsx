import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fetchEntity, EntityProfile, DiseaseRef } from '../services/api';
import { href } from '../router';
import { EvidenceTierBadge } from '../components/EvidenceTierBadge';
import { Section, Empty, ExtLink, pubmed } from '../components/disease/Section';

type EntityType = 'gene' | 'symptom' | 'drug';

const RELATIONSHIP_LABEL: Record<string, string> = {
  FDA_APPROVED_INDICATION: 'FDA-approved for this condition',
  REPURPOSING_CANDIDATE: 'Repurposing candidate',
  EFFECTIVE_INDICATION: 'Reported effective',
};

const DiseaseLink: React.FC<{ d: DiseaseRef }> = ({ d }) => (
  <a href={href('disease', d.id)} className="text-emerald-800 hover:underline font-medium">
    {d.label}
  </a>
);

const Quotes: React.FC<{ evidence?: DiseaseRef['literature'] }> = ({ evidence }) =>
  evidence && evidence.length ? (
    <div className="mt-0.5 text-slate-500">
      {evidence.slice(0, 1).map((ev) => (
        <span key={ev.pmid}>
          Literature: <span className="italic">“{ev.quote}”</span> <ExtLink href={pubmed(ev.pmid)}>PMID {ev.pmid}</ExtLink>
        </span>
      ))}
    </div>
  ) : null;

// Gene, symptom and drug pages: what the node is, and which diseases it links to, with sources.
export const EntityPage: React.FC<{ type: EntityType; id: string }> = ({ type, id }) => {
  const [profile, setProfile] = useState<EntityProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setProfile(null);
    setError(false);
    fetchEntity(id)
      .then((p) => (p.node.type === type ? setProfile(p) : setError(true)))
      .catch(() => setError(true));
  }, [id, type]);

  useEffect(() => {
    if (profile) document.title = `${profile.node.label} · Orphagraph Atlas`;
  }, [profile]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-600">
        <p className="text-lg text-slate-900">Nothing with this id is in the atlas.</p>
        <p className="mt-2 text-sm">Try searching for it by name above.</p>
      </div>
    );
  }
  if (!profile) return <div className="max-w-3xl mx-auto px-4 py-16 text-sm text-slate-500">Loading…</div>;

  const n = profile.node;
  const kind = { gene: 'Gene', symptom: 'Symptom (HPO term)', drug: 'Drug' }[type];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <header className="pb-6">
        <div className="text-sm text-slate-500">{kind}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{n.label}</h1>

        {type === 'gene' && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            {n.protein && <span>{n.protein}</span>}
            {n.chromosome && <span>Chromosome {n.chromosome}</span>}
            {n.hgnc && <ExtLink href={`https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${n.hgnc}`}>{n.hgnc}</ExtLink>}
            {n.ensembl && <ExtLink href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${n.ensembl}`}>{n.ensembl}</ExtLink>}
            {n.ncbi_gene && <ExtLink href={`https://www.ncbi.nlm.nih.gov/gene/${n.ncbi_gene}`}>NCBI Gene {n.ncbi_gene}</ExtLink>}
          </div>
        )}
        {type === 'symptom' && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            {n.hpo_id && <ExtLink href={`https://hpo.jax.org/browse/term/${n.hpo_id}`}>{n.hpo_id}</ExtLink>}
            {n.informativeness && <span>Specificity: {n.informativeness}</span>}
          </div>
        )}
        {type === 'drug' && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            {n.fda_status && <span>{n.fda_status}</span>}
            {n.target_genes && n.target_genes.length > 0 && <span>Targets {n.target_genes.join(', ')}</span>}
          </div>
        )}

        {(n.function || n.mechanism || n.description) && (
          <p className="mt-3 text-slate-700 leading-relaxed">{n.function || n.mechanism || n.description}</p>
        )}
        {type === 'gene' && n.key_variants && n.key_variants.length > 0 && (
          <p className="mt-2 text-sm text-slate-600">Key variants: {n.key_variants.join('; ')}</p>
        )}
      </header>

      {type === 'gene' && (
        <>
          <Section id="diseases" title="Diseases caused by variants in this gene">
            {profile.diseases.length ? (
              <ul className="space-y-2.5 text-sm">
                {profile.diseases.map((d) => (
                  <li key={d.id}>
                    <DiseaseLink d={d} />
                    <div className="text-slate-500">
                      {d.source ? `From ${d.source}` : 'From the literature only'}
                      {d.direction && ` · ${d.direction.replace(/_/g, ' ')}`}
                      {d.source_pmid && (
                        <>
                          {' · '}
                          <ExtLink href={pubmed(d.source_pmid)}>PMID {d.source_pmid}</ExtLink>
                        </>
                      )}
                    </div>
                    <Quotes evidence={d.literature} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No disease is linked to this gene in the atlas.</Empty>
            )}
          </Section>
          <Section id="pathways" title="Pathways" note="Reactome pathways the gene takes part in, smallest (most specific) first.">
            {profile.pathways && profile.pathways.length ? (
              <ul className="space-y-1.5 text-sm">
                {profile.pathways.map((p) => {
                  const reactome = p.database_id?.startsWith('REACTOME:') ? p.database_id.slice(9) : undefined;
                  return (
                    <li key={p.id} className="text-slate-800">
                      {reactome ? <ExtLink href={`https://reactome.org/content/detail/${reactome}`}>{p.label}</ExtLink> : p.label}
                      {p.size ? <span className="text-slate-500"> · {p.size} genes</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>No pathway is recorded for this gene (pathways with more than 40 genes are not used).</Empty>
            )}
          </Section>
          {profile.drugs && profile.drugs.length > 0 && (
            <Section id="drugs" title="Drugs targeting this gene">
              <p className="text-sm text-slate-700">{profile.drugs.join(', ')}</p>
            </Section>
          )}
        </>
      )}

      {type === 'symptom' && (
        <Section
          id="diseases"
          title="Diseases with this symptom"
          note="Annotated with this exact HPO term in the atlas; diseases annotated only with a more specific term are not listed."
        >
          {profile.diseases.length ? (
            <ul className="space-y-2.5 text-sm">
              {profile.diseases.map((d) => (
                <li key={d.id}>
                  <DiseaseLink d={d} />
                  <div className="text-slate-500">
                    {d.annotated ? (d.frequency ? `HPO annotation · frequency ${d.frequency}` : 'HPO annotation') : 'From the literature only'}
                  </div>
                  <Quotes evidence={d.literature} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No disease is annotated with this term in the atlas.</Empty>
          )}
        </Section>
      )}

      {type === 'drug' && (
        <>
          <Section id="diseases" title="Linked diseases" note="Each link with the strength of its evidence.">
            {profile.diseases.length ? (
              <ul className="space-y-3 text-sm">
                {profile.diseases.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-4">
                    <div>
                      <DiseaseLink d={d} />
                      <div className="text-slate-500">
                        {RELATIONSHIP_LABEL[d.relationship || ''] || d.relationship}
                        {d.approval && <> · {d.approval}</>}
                        {d.source_pmid && (
                          <>
                            {' · '}
                            <ExtLink href={pubmed(d.source_pmid)}>PMID {d.source_pmid}</ExtLink>
                          </>
                        )}
                      </div>
                      {d.note && <div className="text-slate-500">{d.note}</div>}
                    </div>
                    <EvidenceTierBadge tier={d.evidence_tier} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No disease is linked to this drug in the atlas.</Empty>
            )}
          </Section>
          {profile.cautions && profile.cautions.length > 0 && (
            <Section id="cautions" title="Cautions">
              {profile.cautions.map((c) => (
                <div key={c.id} className="flex gap-2.5 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                  <p className="text-red-900">
                    <a href={href('disease', c.id)} className="font-medium underline">
                      {c.label}
                    </a>
                    : {c.note}
                  </p>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {profile.papers.length > 0 && (
        <Section id="papers" title="Papers in the atlas">
          <p className="text-sm text-slate-700 flex flex-wrap gap-x-3 gap-y-1">
            {profile.papers.map((p) => (
              <ExtLink key={p} href={pubmed(p)}>
                PMID {p}
              </ExtLink>
            ))}
          </p>
        </Section>
      )}
    </div>
  );
};
