"""
Curated layer of Orphagraph Atlas: records entered by hand and checked against public sources.

The imported layer (backend/data/graph.json, built by backend/ingest/build_graph.py) supplies diseases,
genes, HPO phenotypes, Reactome pathways and phenotype similarity. This file adds what those sources do
not cover: drugs, trials, publications, patient groups, research assets, investigators, a few
literature-sourced mechanism edges, and display metadata for selected diseases.

Every record carries its source (PMID, NCT id, FDA application, HGNC, GO or organization website) and the
date it was checked. Disease nodes are merged onto imported ones by their "omim" field; identifier fields
(code, mondo) come from the import. Inheritance modes match the HPO annotations for the OMIM entry.

Evidence tiers used on claim edges:
  CLINICAL_PROVEN         regulatory approval or randomized trial
  CLINICAL_OBSERVATIONAL  retrospective / observational patient data
  CLINICAL_CASE_REPORTS   case reports or small case series
  PRECLINICAL_VALIDATED   animal, cell or invertebrate models
  INFERRED_HYPOTHESIS     proposed by analogy, no direct data found
Non-claim links (an organization's focus, a trial's condition, an investigator's role) use CURATED_RECORD.
"""

from typing import Any, Dict

CHECKED = "2026-10-04"

CURATED: Dict[str, Any] = {
    "nodes": [
        # ==========================================
        # 1. DISEASES (display metadata merged onto imported OMIM entries)
        # ==========================================
        {
            "id": "DIS_NGLY1",
            "type": "disease",
            "label": "NGLY1 Deficiency",
            "omim": "615273",
            "synonyms": ["NGLY1-CDDG", "Congenital Disorder of Deglycosylation 1", "Congenital Disorder of Deglycosylation", "N-glycanase 1 deficiency"],
            "inheritance": "Autosomal recessive",
            "description": "Neurodevelopmental disorder caused by biallelic NGLY1 variants, with global developmental delay, a movement disorder, hypotonia and reduced or absent tears (PMID 24651605).",
        },
        {
            "id": "DIS_STXBP1",
            "type": "disease",
            "label": "STXBP1 Encephalopathy",
            "omim": "612164",
            "synonyms": ["STXBP1-EIEE4", "EIEE4", "STXBP1-related encephalopathy", "STXBP1 encephalopathy", "Syntaxin-binding protein 1 disorder", "MUNC18-1 Encephalopathy"],
            "inheritance": "Autosomal dominant (mostly de novo)",
            "description": "Developmental and epileptic encephalopathy caused by heterozygous STXBP1 (Munc18-1) variants; haploinsufficiency of Munc18-1 impairs synaptic vesicle release (PMID 29538625).",
        },
        {
            "id": "DIS_MECP2",
            "type": "disease",
            "label": "Rett Syndrome",
            "omim": "312750",
            "synonyms": ["Rett syndrome", "Rett disorder", "MECP2-related neurodevelopmental disorder"],
            "inheritance": "X-linked dominant",
            "description": "Neurodevelopmental disorder, mainly in girls, with regression of speech and purposeful hand use after early development, caused by MECP2 variants.",
        },
        {
            "id": "DIS_MPS3",
            "type": "disease",
            "label": "Sanfilippo Syndrome Type A (MPS IIIA)",
            "omim": "252900",
            "synonyms": ["Sanfilippo syndrome", "Mucopolysaccharidosis type IIIA", "MPS IIIA"],
            "inheritance": "Autosomal recessive",
            "description": "Lysosomal storage disorder caused by SGSH deficiency, with heparan sulfate accumulation and progressive childhood neurodegeneration.",
        },
        {
            "id": "DIS_FXN",
            "type": "disease",
            "label": "Friedreich's Ataxia",
            "omim": "229300",
            "synonyms": ["FRDA", "Frataxin deficiency", "Spinocerebellar ataxia Friedreich type"],
            "inheritance": "Autosomal recessive",
            "description": "Progressive neurodegenerative ataxia caused mostly by GAA repeat expansions in FXN that reduce frataxin, a mitochondrial protein involved in iron-sulfur cluster biogenesis.",
        },
        {
            "id": "DIS_SHANK3",
            "type": "disease",
            "label": "Phelan-McDermid Syndrome",
            "omim": "606232",
            "synonyms": ["22q13.3 deletion syndrome", "deletion 22q13.3 syndrome", "22q13 deletion syndrome", "SHANK3 deficiency"],
            "inheritance": "Autosomal dominant (mostly de novo)",
            "description": "Neurodevelopmental disorder caused by 22q13.3 deletions or SHANK3 variants, with neonatal hypotonia, developmental delay and absent or delayed speech.",
        },
        {
            "id": "DIS_CDKL5",
            "type": "disease",
            "label": "CDKL5 Deficiency Disorder",
            "omim": "300672",
            "synonyms": ["CDKL5 deficiency", "Atypical Rett syndrome CDKL5-related"],
            "inheritance": "X-linked dominant",
            "description": "Developmental and epileptic encephalopathy with seizures starting in early infancy, caused by CDKL5 variants.",
        },
        {
            "id": "DIS_CLN3",
            "type": "disease",
            "label": "Batten Disease (CLN3)",
            "omim": "204200",
            "synonyms": ["Juvenile Neuronal Ceroid Lipofuscinosis", "JNCL", "CLN3 disease", "Spielmeyer-Vogt disease"],
            "inheritance": "Autosomal recessive",
            "description": "Juvenile neuronal ceroid lipofuscinosis caused by CLN3 variants, with vision loss in childhood followed by seizures and cognitive and motor decline.",
        },
        # SCN2A variant-effect clusters: curated groupings, not OMIM entries (based on PMID 28379373)
        {
            "id": "DIS_SCN2A_GOF",
            "type": "disease",
            "label": "SCN2A Gain-of-Function (Early Infantile Epilepsy)",
            "code": "SCN2A variant-effect cluster (curated)",
            "description": "SCN2A-related epilepsy with onset before 3 months of age, associated with gain-of-function variants; sodium channel blockers were often associated with seizure reduction (PMID 28379373).",
            "source_pmid": "28379373",
        },
        {
            "id": "DIS_SCN2A_LOF",
            "type": "disease",
            "label": "SCN2A Loss-of-Function (Autism & Late-Onset Seizures)",
            "code": "SCN2A variant-effect cluster (curated)",
            "description": "SCN2A-related disorders with later-onset epilepsy (3 months or older) or autism and intellectual disability, associated with loss-of-function variants; sodium channel blockers were rarely effective (PMID 28379373).",
            "source_pmid": "28379373",
        },
        {
            "id": "DIS_COSTELLO",
            "type": "disease",
            "label": "Costello Syndrome",
            "synonyms": ["Costello syndrome", "HRAS-related Costello syndrome"],
            "omim": "218040",
            "inheritance": "Autosomal dominant (mostly de novo)",
            "description": "RASopathy caused by heterozygous HRAS variants, with hypertrophic cardiomyopathy, distinctive facial features, developmental delay and an increased tumor risk.",
        },
        {
            "id": "DIS_NOONAN",
            "type": "disease",
            "label": "Noonan Syndrome 1",
            "synonyms": ["Noonan syndrome", "PTPN11-related Noonan syndrome"],
            "omim": "163950",
            "inheritance": "Autosomal dominant",
            "description": "RASopathy (OMIM entry for Noonan syndrome type 1, mostly PTPN11) with short stature, congenital heart disease such as pulmonary valve stenosis, and distinctive facial features. Literature claims about Noonan syndrome in general are attached here.",
        },
        {
            "id": "DIS_ATP7A",
            "type": "disease",
            "label": "Menkes Disease",
            "omim": "309400",
            "synonyms": ["Kinky hair disease", "ATP7A-related copper transport disorder"],
            "inheritance": "X-linked recessive",
            "description": "Disorder of copper transport caused by ATP7A variants, with deficient copper-dependent enzymes, neurodegeneration and sparse, twisted hair.",
        },

        # ==========================================
        # 2. GENES (identifiers, location and name from HGNC)
        # ==========================================
        {"id": "GENE_NGLY1", "type": "gene", "label": "NGLY1", "hgnc": "HGNC:17646", "ensembl": "ENSG00000151092", "chromosome": "3p24.2",
         "protein": "N-glycanase 1", "key_variants": ["c.1201A>T (p.R401X): most common allele in the first case series (PMID 24651605)"],
         "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_STXBP1", "type": "gene", "label": "STXBP1", "hgnc": "HGNC:11444", "ensembl": "ENSG00000136854", "chromosome": "9q34.11",
         "protein": "syntaxin binding protein 1", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_MECP2", "type": "gene", "label": "MECP2", "hgnc": "HGNC:6990", "ensembl": "ENSG00000169057", "chromosome": "Xq28",
         "protein": "methyl-CpG binding protein 2", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_SGSH", "type": "gene", "label": "SGSH", "hgnc": "HGNC:10818", "ensembl": "ENSG00000181523", "chromosome": "17q25.3",
         "protein": "N-sulfoglucosamine sulfohydrolase", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_FXN", "type": "gene", "label": "FXN", "hgnc": "HGNC:3951", "ensembl": "ENSG00000165060", "chromosome": "9q21.11",
         "protein": "frataxin", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_SHANK3", "type": "gene", "label": "SHANK3", "hgnc": "HGNC:14294", "ensembl": "ENSG00000251322", "chromosome": "22q13.33",
         "protein": "SH3 and multiple ankyrin repeat domains 3", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_CDKL5", "type": "gene", "label": "CDKL5", "hgnc": "HGNC:11411", "ensembl": "ENSG00000008086", "chromosome": "Xp22.13",
         "protein": "cyclin dependent kinase like 5", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_CLN3", "type": "gene", "label": "CLN3", "hgnc": "HGNC:2074", "ensembl": "ENSG00000188603", "chromosome": "16p12.1",
         "protein": "CLN3 lysosomal/endosomal transmembrane protein, battenin", "source": f"HGNC REST, checked {CHECKED}"},
        {"id": "GENE_ATP7A", "type": "gene", "label": "ATP7A", "hgnc": "HGNC:869", "ensembl": "ENSG00000165240", "chromosome": "Xq21.1",
         "protein": "ATPase copper transporting alpha", "source": f"HGNC REST, checked {CHECKED}"},

        # ==========================================
        # 3. PHENOTYPES referenced by curated edges (labels/specificity come from the HPO import)
        # ==========================================
        {"id": "HP:0000522", "type": "symptom", "label": "Alacrima", "hpo_id": "HP:0000522"},
        {"id": "HP:0001263", "type": "symptom", "label": "Global developmental delay", "hpo_id": "HP:0001263"},
        {"id": "HP:0002487", "type": "symptom", "label": "Hyperkinetic movements", "hpo_id": "HP:0002487"},

        # ==========================================
        # 4. LITERATURE-SOURCED MECHANISMS
        # ==========================================
        {
            "id": "PATH_NRF1_BOUNCEBACK",
            "type": "pathway",
            "label": "Nrf1 (SKN-1A) activation after proteasome dysfunction",
            "source_pmid": "27528192",
            "description": "In C. elegans, activating SKN-1A (the Nrf1 homolog) after proteasome dysfunction requires the peptide N-glycanase PNG-1 (the NGLY1 ortholog) and the protease DDI-1; a conserved mechanism is suggested for mammalian Nrf1 (PMID 27528192).",
        },
        {
            "id": "PATH_NAV12_EXCITABILITY",
            "type": "pathway",
            "label": "Nav1.2 voltage-gated sodium channel activity (SCN2A)",
            "database_id": "GO:0005248",
            "description": "Voltage-gated sodium channel activity (GO:0005248) of Nav1.2, encoded by SCN2A. Gain- and loss-of-function variants change this activity in opposite directions (PMID 28379373).",
        },

        # ==========================================
        # 5. DRUGS
        # ==========================================
        {
            "id": "DRUG_PHENYTOIN",
            "type": "drug",
            "label": "Sodium channel blockers (e.g. Phenytoin)",
            "fda_status": "FDA-approved anticonvulsants",
            "mechanism": "Block voltage-gated sodium channels. In SCN2A-related epilepsy they were often associated with seizure reduction when onset was before 3 months and rarely effective with later onset (PMID 28379373).",
            "target_genes": ["SCN2A"],
        },
        {
            "id": "DRUG_TRAMETINIB",
            "type": "drug",
            "label": "Trametinib (Mekinist)",
            "fda_status": "FDA-approved MEK1/2 inhibitor (oncology indications)",
            "mechanism": "Allosteric MEK1/MEK2 inhibitor. Reported in case reports for cardiac and lymphatic complications of Noonan syndrome (PMID 40041314).",
            "target_genes": ["MAP2K1", "MAP2K2"],
        },
        {
            "id": "DRUG_AURANOFIN",
            "type": "drug",
            "label": "Auranofin",
            "fda_status": "FDA-approved (Rheumatoid Arthritis)",
            "repurposing_confidence": 0.3,
            "evidence_tier": "INFERRED_HYPOTHESIS",
            "mechanism": "Thioredoxin reductase 1 (TrxR1) inhibitor. Proposed for NGLY1 deficiency only by analogy to proteasome stress-response biology; no published NGLY1 data found (PubMed search 'auranofin AND NGLY1', 2026-10-03).",
            "target_genes": ["TXNRD1"],
        },
        {
            "id": "DRUG_4PBA",
            "type": "drug",
            "label": "4-Phenylbutyrate (4-PBA)",
            "fda_status": "FDA-approved as sodium phenylbutyrate (Urea Cycle Disorders)",
            "repurposing_confidence": 0.84,
            "evidence_tier": "PRECLINICAL_VALIDATED",
            "mechanism": "Chemical chaperone; reversed destabilization and aggregation of disease-linked mutant Munc18-1 (STXBP1) in yeast, worm and mouse-neuron models (PMID 30266908). No published NGLY1 data found.",
            "target_genes": [],
        },
        {
            "id": "DRUG_TREHALOSE",
            "type": "drug",
            "label": "Trehalose",
            "fda_status": "Investigational",
            "repurposing_confidence": 0.75,
            "evidence_tier": "PRECLINICAL_VALIDATED",
            "mechanism": "Disaccharide chemical chaperone and autophagy enhancer that activates TFEB (PMID 28165011); rescued mutant Munc18-1 (STXBP1) deficits in model systems (PMID 30266908). No published NGLY1 data found.",
            "target_genes": ["TFEB"],
        },
        # NGLY1 leads below come from published invertebrate drug-repurposing screens.
        {
            "id": "DRUG_ARIPIPRAZOLE",
            "type": "drug",
            "label": "Aripiprazole",
            "fda_status": "FDA-approved (Atypical Antipsychotic)",
            "repurposing_confidence": 0.6,
            "evidence_tier": "PRECLINICAL_VALIDATED",
            "mechanism": "Dopamine receptor partial agonist. The only compound active in all assays and species in NGLY1-deficient worm and fly screens plus a human-cell NRF2 assay (PMID 31615832). Invertebrate-model evidence only.",
            "target_genes": ["DRD2", "HTR1A"],
        },
        {
            "id": "DRUG_LITHIUM",
            "type": "drug",
            "label": "Lithium (GSK3 inhibitor)",
            "fda_status": "FDA-approved (Bipolar Disorder)",
            "repurposing_confidence": 0.55,
            "evidence_tier": "PRECLINICAL_VALIDATED",
            "mechanism": "GSK3 inhibition was predicted by Connectivity Map and validated with lithium, TWS119 and GSK3 knockdown in an NGLY1-deficient Drosophila model (PMID 35653343). Fly-model evidence only.",
            "target_genes": ["GSK3B"],
        },
        {
            "id": "DRUG_TROFINETIDE",
            "type": "drug",
            "label": "Trofinetide (Daybue)",
            "fda_status": "FDA-approved for Rett syndrome (NDA217026, 2023-03-10)",
            "mechanism": "Synthetic analog of glycine-proline-glutamate (GPE), a fragment of IGF-1; how it works in Rett syndrome is not fully understood.",
            "target_genes": [],
            "source": f"Drugs@FDA via openFDA, checked {CHECKED}",
        },
        {
            "id": "DRUG_OMAVELOXOLONE",
            "type": "drug",
            "label": "Omaveloxolone (Skyclarys)",
            "fda_status": "FDA-approved for Friedreich's ataxia (NDA216718, 2023-02-28)",
            "mechanism": "Nrf2 activator; improved neurological function versus placebo in the MOXIe trial (PMID 33068037).",
            "target_genes": ["NFE2L2", "KEAP1"],
            "source": f"Drugs@FDA via openFDA, checked {CHECKED}",
        },
        {
            "id": "DRUG_GANAXOLONE",
            "type": "drug",
            "label": "Ganaxolone (Ztalmy)",
            "fda_status": "FDA-approved for seizures associated with CDKL5 deficiency disorder (NDA215904, 2022-03-18)",
            "mechanism": "Neuroactive steroid; positive allosteric modulator of GABA-A receptors.",
            "target_genes": [],
            "source": f"Drugs@FDA via openFDA, checked {CHECKED}",
        },

        # ==========================================
        # 6. RESEARCH ASSETS (each described in a publication or public registry record)
        # ==========================================
        {
            "id": "ASSET_NGLY1_IPSC",
            "type": "asset",
            "label": "NGLY1 patient-derived iPSC models (published)",
            "asset_type": "Cellular models (iPSC-derived neuromuscular junction platform; midbrain organoids)",
            "availability": "Described in publications; contact the authors about access",
            "custodian": "Hickman JJ group (PMID 36589922); Zheng W group (PMID 36875753)",
            "description": "An iPSC-derived neuromuscular junction platform (PMID 36589922) and patient-derived midbrain organoids (PMID 36875753) for studying NGLY1 deficiency.",
            "source_pmids": ["36589922", "36875753"],
        },
        {
            "id": "ASSET_NATURAL_HISTORY_PROTOCOL",
            "type": "asset",
            "label": "NGLY1 prospective natural-history study design",
            "asset_type": "Clinical study design (public record and published results)",
            "availability": "Study summary and outcome measures public on ClinicalTrials.gov (NCT03834987); results published (PMID 37379343)",
            "custodian": "Stanford University (principal investigator: Maura Ruzhnikov)",
            "description": "Design and outcome measures of the first registered prospective NGLY1 natural-history study, a starting point for new or related natural-history studies.",
            "source_pmids": ["37379343"],
            "source_nct": "NCT03834987",
        },
        {
            "id": "ASSET_GLCNAC_BIOMARKER",
            "type": "asset",
            "label": "GlcNAc-Asn biomarker for NGLY1 deficiency",
            "asset_type": "Biomarker (published)",
            "availability": "Described in publication",
            "custodian": "Mueller WF ... Crawford BE (PMID 34697629)",
            "description": "GlcNAc-Asn reported as a biomarker for NGLY1 deficiency (PMID 34697629).",
            "source_pmids": ["34697629"],
        },
        {
            "id": "ASSET_STXBP1_MOUSE",
            "type": "asset",
            "label": "Stxbp1 haploinsufficient mouse models (published)",
            "asset_type": "Animal model",
            "availability": "Described in publications; contact the authors about access",
            "custodian": "Verhage M group (PMID 29538625)",
            "description": "Mouse models linking Munc18-1 haploinsufficiency and protein instability to cortical hyperexcitability in STXBP1 encephalopathy (PMID 29538625).",
            "source_pmids": ["29538625"],
        },

        # ==========================================
        # 7. INVESTIGATORS (roles taken from trial records or authorship; no personal contact details)
        # ==========================================
        {"id": "KOL_MAURA_RUZHNIKOV", "type": "investigator", "label": "Maura Ruzhnikov, MD", "institution": "Stanford University",
         "role": "Principal investigator, NGLY1 natural-history study (NCT03834987)", "source": f"ClinicalTrials.gov, checked {CHECKED}"},
        {"id": "KOL_GREGORY_ENNS", "type": "investigator", "label": "Gregory Enns", "institution": "Stanford University",
         "role": "First author, first NGLY1 case series (PMID 24651605)", "source": f"PubMed, checked {CHECKED}"},
        {"id": "KOL_INGO_HELBIG", "type": "investigator", "label": "Ingo Helbig, MD", "institution": "Children's Hospital of Philadelphia",
         "role": "Principal investigator, STXBP1 and SYNGAP1 natural-history study (NCT06555965)", "source": f"ClinicalTrials.gov, checked {CHECKED}"},
        {"id": "KOL_EVA_MORAVA", "type": "investigator", "label": "Eva Morava-Kozicz, MD, PhD", "institution": "Icahn School of Medicine at Mount Sinai",
         "role": "Principal investigator, GlcNAc trial in NGLY1-CDDG (NCT05402345)", "source": f"ClinicalTrials.gov, checked {CHECKED}"},

        # ==========================================
        # 8. CLINICAL TRIALS (checked against the ClinicalTrials.gov v2 API)
        # ==========================================
        {
            "id": "TRIAL_NCT03834987",
            "type": "trial",
            "label": "NGLY1 Deficiency: A Prospective Natural History Study",
            "nct_id": "NCT03834987",
            "phase": "Observational / Natural History",
            "status": "Terminated",
            "sponsor": "Stanford University",
            "locations": "Stanford University (Stanford, CA)",
            "intervention": "Neurodevelopmental Assessment",
            "last_verified": "2026-10-03"
        },
        {
            "id": "TRIAL_NCT06199531",
            "type": "trial",
            "label": "Safety and Efficacy of GS-100 Gene Therapy in Patients With NGLY1 Deficiency",
            "nct_id": "NCT06199531",
            "phase": "Phase 3",
            "status": "Active, not recruiting",
            "sponsor": "Grace Science, LLC",
            "locations": "UCSF Benioff Children's Hospital (Oakland, CA), Texas Children's Hospital / Baylor (Houston, TX)",
            "intervention": "GS-100 (gene therapy)",
            "last_verified": "2026-10-03"
        },
        {
            "id": "TRIAL_NCT06555965",
            "type": "trial",
            "label": "STXBP1 and SYNGAP1 Related Disorders Natural History Study",
            "nct_id": "NCT06555965",
            "phase": "Observational / Natural History",
            "status": "Recruiting",
            "sponsor": "Children's Hospital of Philadelphia (collaborator: STXBP1 Foundation)",
            "locations": "CHOP (Philadelphia, PA), Stanford Medicine Children's Health (Palo Alto, CA), Children's Hospital Colorado (Aurora, CO), Weill Cornell Medicine (New York, NY), Texas Children's Hospital (Houston, TX)",
            "intervention": "None (observational natural history)",
            "last_verified": "2026-10-03"
        },
        {
            "id": "TRIAL_NCT05402345",
            "type": "trial",
            "label": "A Study of GlcNAc on Tear Production in NGLY1-CDDG",
            "nct_id": "NCT05402345",
            "phase": "Phase 2",
            "status": "Active, not recruiting",
            "sponsor": "Eva Morava-Kozicz",
            "locations": "Children's Hospital of Philadelphia (Philadelphia, PA), Seattle Children's Hospital (Seattle, WA)",
            "intervention": "GlcNAc (weight-dependent dose) vs placebo (xylose); primary outcome: change in tear production",
            "last_verified": "2026-10-03"
        },

        # ==========================================
        # 9. PATIENT ORGANIZATIONS (links and emails as published on the organizations' websites)
        # ==========================================
        {"id": "GROUP_GRACE_SCIENCE", "type": "patient_group", "label": "Grace Science Foundation", "focus": "NGLY1 Deficiency",
         "country": "United States", "website": "https://www.gracescience.org", "registry_url": "https://www.gracescience.org/patient-registry",
         "contact_url": "https://www.gracescience.org/contact", "last_verified": CHECKED},
        {"id": "GROUP_STXBP1_FOUNDATION", "type": "patient_group", "label": "STXBP1 Foundation", "focus": "STXBP1 Encephalopathy",
         "country": "United States", "website": "https://www.stxbp1disorders.org", "contact_url": "https://www.stxbp1disorders.org/contact",
         "contact_email": "info@stxbp1disorders.org", "last_verified": CHECKED},
        {"id": "GROUP_RETT_FOUNDATION", "type": "patient_group", "label": "International Rett Syndrome Foundation (IRSF)", "focus": "Rett Syndrome (MECP2)",
         "country": "United States", "website": "https://www.rettsyndrome.org", "registry_url": "https://www.rettsyndrome.org/irsf-rett-syndrome-registry/",
         "contact_url": "https://www.rettsyndrome.org/about-irsf/contact-us/", "last_verified": CHECKED},
        {"id": "GROUP_CURE_SANFILIPPO", "type": "patient_group", "label": "Cure Sanfilippo Foundation", "focus": "Sanfilippo Syndrome (MPS III)",
         "country": "United States", "website": "https://curesanfilippofoundation.org", "contact_email": "Contact@CureSanfilippoFoundation.org",
         "last_verified": CHECKED},
        {"id": "GROUP_NOONAN_FOUNDATION", "type": "patient_group", "label": "Noonan Syndrome Foundation", "focus": "Noonan syndrome",
         "country": "United States", "website": "https://www.teamnoonan.org/", "contact_email": "info@teamnoonan.org", "last_verified": CHECKED},
        {"id": "GROUP_RASOPATHIES_NETWORK", "type": "patient_group", "label": "RASopathies Network", "focus": "RASopathies (including Noonan and Costello syndromes)",
         "country": "United States", "website": "https://rasopathiesnet.org/", "contact_url": "https://rasopathiesnet.org/contact-us/",
         "contact_email": "info@rasopathiesnet.org", "last_verified": CHECKED},
        {"id": "GROUP_COSTELLO_FAMILY_NETWORK", "type": "patient_group", "label": "Costello Syndrome Family Network (CSFN)", "focus": "Costello syndrome",
         "country": "United States", "website": "https://costellosyndromeusa.org/", "last_verified": CHECKED},
        {"id": "GROUP_COSTELLO_KIDS", "type": "patient_group", "label": "CostelloKids (International Costello Syndrome Support Group)", "focus": "Costello syndrome",
         "country": "United Kingdom", "website": "https://www.costellokids.com/", "contact_url": "https://www.costellokids.com/contact/", "last_verified": CHECKED},
        {"id": "GROUP_BDSRA", "type": "patient_group", "label": "Batten Disease Support & Research Association (BDSRA Foundation)", "focus": "Batten disease (all types, including CLN3)",
         "country": "United States", "website": "https://bdsrafoundation.org/", "registry_url": "https://bdsrafoundation.org/family-register/",
         "last_verified": CHECKED},
        {"id": "GROUP_BEYOND_BATTEN", "type": "patient_group", "label": "Beyond Batten Disease Foundation", "focus": "CLN3 (juvenile) Batten disease",
         "country": "United States", "website": "https://beyondbatten.org/", "contact_url": "https://beyondbatten.org/contact/",
         "contact_email": "info@beyondbatten.org", "last_verified": CHECKED},
        {"id": "GROUP_FARA", "type": "patient_group", "label": "Friedreich's Ataxia Research Alliance (FARA)", "focus": "Friedreich's ataxia",
         "country": "United States", "website": "https://www.curefa.org/", "contact_url": "https://www.curefa.org/contact-us/",
         "contact_email": "info@curefa.org", "last_verified": CHECKED},
        {"id": "GROUP_IFCR", "type": "patient_group", "label": "International Foundation for CDKL5 Research (IFCR)", "focus": "CDKL5 deficiency disorder",
         "country": "United States", "website": "https://cdkl5.com/", "contact_url": "https://cdkl5.com/contact",
         "contact_email": "info@cdkl5.com", "last_verified": CHECKED},
        {"id": "GROUP_MENKES_INTERNATIONAL", "type": "patient_group", "label": "Menkes International Association", "focus": "Menkes disease",
         "country": "Spain", "website": "https://www.menkesinternational.org/en", "registry_url": "https://www.menkesinternational.org/en/registry",
         "contact_url": "https://www.menkesinternational.org/en/contact", "contact_email": "director@menkesinternational.com", "last_verified": CHECKED},
        {"id": "GROUP_PMSF", "type": "patient_group", "label": "Phelan-McDermid Syndrome Foundation (PMSF)", "focus": "Phelan-McDermid syndrome",
         "country": "United States", "website": "https://pmsf.org/", "registry_url": "https://pmsf.org/datahub/",
         "contact_url": "https://pmsf.org/contact-us/", "contact_email": "info@pmsf.org", "last_verified": CHECKED},
        {"id": "GROUP_FAMILIESCN2A", "type": "patient_group", "label": "FamilieSCN2A Foundation", "focus": "SCN2A-related disorders (gain- and loss-of-function)",
         "country": "United States", "website": "https://www.scn2a.org/", "registry_url": "https://scn2a.iamrare.org/",
         "contact_url": "https://www.scn2a.org/contact-form/", "contact_email": "info@scn2a.org", "last_verified": CHECKED},

        # ==========================================
        # 10. PUBLICATIONS (checked against PubMed; excerpts are paraphrased from the abstract)
        # ==========================================
        {
            "id": "PUB_24651605",
            "type": "publication",
            "label": "Enns et al., 2014 - NGLY1 Deficiency Clinical Delineation",
            "pmid": "24651605",
            "doi": "10.1038/gim.2014.22",
            "journal": "Genetics in Medicine",
            "year": 2014,
            "evidence_score": 0.99,
            "title": "Mutations in NGLY1 cause an inherited disorder of the endoplasmic reticulum-associated degradation pathway.",
            "excerpt": "Case series of 8 patients with N-glycanase 1 deficiency: all had global developmental delay, a movement disorder and hypotonia; hypolacrima or alacrima in 7/8, elevated transaminases in 6/7, microcephaly in 6/8, seizures in 4/8. c.1201A>T (p.R401X) was the most common allele.",
            "last_verified": "2026-10-03"
        },
        {
            "id": "PUB_27528192",
            "type": "publication",
            "label": "Lehrbach & Ruvkun, 2016 - SKN-1A/Nrf1 Activation by DDI-1 (C. elegans)",
            "pmid": "27528192",
            "doi": "10.7554/eLife.17721",
            "journal": "eLife",
            "year": 2016,
            "evidence_score": 0.85,
            "title": "Proteasome dysfunction triggers activation of SKN-1A/Nrf1 by the aspartic protease DDI-1.",
            "excerpt": "Genetic screens in C. elegans show that sensing proteasome dysfunction and activating SKN-1A (Nrf1 homolog) requires ER-traffic regulators, a peptide N-glycanase (PNG-1, the NGLY1 ortholog) and the aspartic protease DDI-1, which cleaves ER-associated SKN-1A. Mammalian Nrf1 is suggested to follow a conserved mechanism.",
            "last_verified": "2026-10-03"
        },
        {
            "id": "PUB_30266908",
            "type": "publication",
            "label": "Guiberson et al., 2018 - Chemical Chaperone Rescue of Munc18-1 (STXBP1)",
            "pmid": "30266908",
            "doi": "10.1038/s41467-018-06507-4",
            "journal": "Nature Communications",
            "year": 2018,
            "evidence_score": 0.91,
            "title": "Mechanism-based rescue of Munc18-1 dysfunction in varied encephalopathies by chemical chaperones.",
            "excerpt": "At least five disease-linked Munc18-1 missense mutations destabilize the protein and cause aggregation that also sequesters wild-type Munc18-1. The chemical chaperones 4-phenylbutyrate, sorbitol and trehalose reversed these deficits in vitro and in yeast, worm and mouse-neuron models.",
            "last_verified": "2026-10-03"
        },
        {
            "id": "PUB_33068037",
            "type": "publication",
            "label": "Lynch et al., 2021 - Omaveloxolone in FA (MOXIe)",
            "pmid": "33068037",
            "doi": "10.1002/ana.25934",
            "journal": "Annals of Neurology",
            "year": 2021,
            "evidence_score": 0.98,
            "title": "Safety and Efficacy of Omaveloxolone in Friedreich Ataxia (MOXIe Study).",
            "excerpt": "Randomized, double-blind, placebo-controlled registrational phase 2 trial (NCT02255435; n=103): omaveloxolone, an Nrf2 activator, improved mFARS versus placebo at 48 weeks (difference -2.40, p=0.014) and was generally well tolerated.",
            "last_verified": "2026-10-03"
        },
        {
            "id": "PUB_31615832",
            "type": "publication",
            "label": "Iyer et al., 2019 - NGLY1 Worm & Fly Drug Screens",
            "pmid": "31615832",
            "doi": "10.1242/dmm.040576",
            "journal": "Disease Models & Mechanisms",
            "year": 2019,
            "evidence_score": 0.75,
            "title": "Drug screens of NGLY1 deficiency in worm and fly models reveal catecholamine, NRF2 and anti-inflammatory-pathway activation as potential clinical approaches.",
            "excerpt": "Phenotypic screens of repurposing and lead-discovery libraries rescued bortezomib-treated NGLY1-deficient worm and fly larvae; 91 validated hits were tested in a human-cell NRF2 assay. Hit classes were polyphenols/NRF2 inducers, catecholamine signalling activators and anti-inflammatories; aripiprazole was the only compound active in all assays and species.",
            "last_verified": "2026-10-03"
        },
        {
            "id": "PUB_35653343",
            "type": "publication",
            "label": "Hope et al., 2022 - NGLY1 Fly Repurposing Screen (Serotonin, GSK3)",
            "pmid": "35653343",
            "doi": "10.1371/journal.pgen.1010228",
            "journal": "PLoS Genetics",
            "year": 2022,
            "evidence_score": 0.75,
            "title": "An in vivo drug repurposing screen and transcriptional analyses reveals the serotonin pathway and GSK3 as major therapeutic targets for NGLY1 deficiency.",
            "excerpt": "In a Drosophila NGLY1 deficiency model, 17 FDA-approved drugs partially rescued lethality, including serotonin and dopamine modulators. Connectivity Map analysis predicted GSK3 inhibition, validated with TWS119, lithium and GSK3 knockdown; GSK3 inhibitors and a serotonin modulator also rescued larval size under proteasome inhibition.",
            "last_verified": "2026-10-03"
        },
        {"id": "PUB_37379343", "type": "publication", "label": "Tong et al., 2023 - NGLY1 Prospective Natural History Study", "pmid": "37379343",
         "doi": "10.1093/hmg/ddad106", "journal": "Human Molecular Genetics", "year": 2023, "evidence_score": 0.9,
         "title": "NGLY1 deficiency: a prospective natural history study.", "last_verified": CHECKED},
        {"id": "PUB_34697629", "type": "publication", "label": "Mueller et al., 2022 - GlcNAc-Asn Biomarker", "pmid": "34697629",
         "doi": "10.1093/jb/mvab111", "journal": "Journal of Biochemistry", "year": 2022, "evidence_score": 0.8,
         "title": "GlcNAc-Asn is a biomarker for NGLY1 deficiency.", "last_verified": CHECKED},
        {"id": "PUB_36589922", "type": "publication", "label": "Sasserath et al., 2022 - iPSC NMJ Platform for NGLY1-CDDG", "pmid": "36589922",
         "doi": "10.1002/adtp.202200009", "journal": "Advanced Therapeutics", "year": 2022, "evidence_score": 0.7,
         "title": "An induced pluripotent stem cell-derived NMJ platform for study of the NGLY1-Congenital Disorder of Deglycosylation.", "last_verified": CHECKED},
        {"id": "PUB_36875753", "type": "publication", "label": "Abbott et al., 2023 - NGLY1 Patient-Derived Midbrain Organoids", "pmid": "36875753",
         "doi": "10.3389/fcell.2023.1039182", "journal": "Frontiers in Cell and Developmental Biology", "year": 2023, "evidence_score": 0.7,
         "title": "Generation and characterization of NGLY1 patient-derived midbrain organoids.", "last_verified": CHECKED},
        {"id": "PUB_29538625", "type": "publication", "label": "Kovacevic et al., 2018 - STXBP1 Haploinsufficiency", "pmid": "29538625",
         "doi": "10.1093/brain/awy046", "journal": "Brain", "year": 2018, "evidence_score": 0.85,
         "title": "Protein instability, haploinsufficiency, and cortical hyper-excitability underlie STXBP1 encephalopathy.", "last_verified": CHECKED},
        {"id": "PUB_28379373", "type": "publication", "label": "Wolff et al., 2017 - SCN2A Heterogeneity and Treatment", "pmid": "28379373",
         "doi": "10.1093/brain/awx054", "journal": "Brain", "year": 2017, "evidence_score": 0.85,
         "title": "Genetic and phenotypic heterogeneity suggest therapeutic implications in SCN2A-related disorders.",
         "excerpt": "Sodium channel blockers were often associated with clinically relevant seizure reduction in early infantile onset (<3 months) SCN2A epilepsy and were rarely effective with later onset; loss-of-function effects were associated with later onset and insufficient response.",
         "last_verified": CHECKED},
        {"id": "PUB_28165011", "type": "publication", "label": "Palmieri et al., 2017 - Trehalose and TFEB in Storage Diseases", "pmid": "28165011",
         "doi": "10.1038/ncomms14338", "journal": "Nature Communications", "year": 2017, "evidence_score": 0.8,
         "title": "mTORC1-independent TFEB activation via Akt inhibition promotes cellular clearance in neurodegenerative storage diseases.",
         "excerpt": "The autophagy enhancer trehalose activates TFEB by diminishing Akt activity; trehalose was administered to a mouse model of Batten disease.",
         "last_verified": CHECKED},
        {"id": "PUB_40041314", "type": "publication", "label": "De Brouchoven et al., 2025 - Trametinib in Noonan Syndrome", "pmid": "40041314",
         "doi": "10.3389/fped.2025.1475143", "journal": "Frontiers in Pediatrics", "year": 2025, "evidence_score": 0.6,
         "title": "Trametinib as a targeted treatment in cardiac and lymphatic presentations of Noonan syndrome.", "last_verified": CHECKED},
        {"id": "PUB_38432396", "type": "publication", "label": "Chaput et al., 2024 - MEK Inhibition for RASopathy HCM", "pmid": "38432396",
         "doi": "10.1016/j.cjca.2024.02.020", "journal": "Canadian Journal of Cardiology", "year": 2024, "evidence_score": 0.6,
         "title": "MEK Inhibition for RASopathy-Associated Hypertrophic Cardiomyopathy: Clinical Application of a Basic Concept.", "last_verified": CHECKED},
    ],

    "edges": [
        # DISEASE -> PHENOTYPES: NGLY1 frequencies from the 8-patient series in Enns et al. 2014 (PMID 24651605)
        {"source": "DIS_NGLY1", "target": "HP:0000522", "relationship": "HAS_PHENOTYPE", "frequency": "Frequent (7/8 hypolacrima or alacrima)", "source_pmid": "24651605", "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "DIS_NGLY1", "target": "HP:0001263", "relationship": "HAS_PHENOTYPE", "frequency": "Frequent (8/8)", "source_pmid": "24651605", "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "DIS_NGLY1", "target": "HP:0002487", "relationship": "HAS_PHENOTYPE", "frequency": "Frequent (8/8 movement disorder)", "source_pmid": "24651605", "evidence_tier": "CLINICAL_OBSERVATIONAL"},

        # GENE -> LITERATURE-SOURCED MECHANISM
        {"source": "GENE_NGLY1", "target": "PATH_NRF1_BOUNCEBACK", "relationship": "REGULATES_PATHWAY", "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "27528192"},

        # DRUG -> DISEASE
        # Unsupported NGLY1 leads: no PubMed hits for drug AND NGLY1 (searched 2026-10-03)
        {"source": "DRUG_AURANOFIN", "target": "PATH_NRF1_BOUNCEBACK", "relationship": "MODULATES_PATHWAY", "evidence_tier": "INFERRED_HYPOTHESIS"},
        {"source": "DRUG_AURANOFIN", "target": "DIS_NGLY1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.3, "evidence_tier": "INFERRED_HYPOTHESIS"},
        {"source": "DRUG_4PBA", "target": "DIS_NGLY1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.3, "evidence_tier": "INFERRED_HYPOTHESIS"},
        {"source": "DRUG_TREHALOSE", "target": "DIS_NGLY1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.3, "evidence_tier": "INFERRED_HYPOTHESIS"},
        # Published model-system evidence
        {"source": "DRUG_4PBA", "target": "DIS_STXBP1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.84, "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "30266908"},
        {"source": "DRUG_TREHALOSE", "target": "DIS_STXBP1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.75, "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "30266908"},
        {"source": "DRUG_TREHALOSE", "target": "DIS_CLN3", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.6, "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "28165011"},
        {"source": "DRUG_ARIPIPRAZOLE", "target": "DIS_NGLY1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.6, "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "31615832"},
        {"source": "DRUG_LITHIUM", "target": "DIS_NGLY1", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.55, "evidence_tier": "PRECLINICAL_VALIDATED", "source_pmid": "35653343"},
        # Human evidence
        {"source": "DRUG_TRAMETINIB", "target": "DIS_NOONAN", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.5, "evidence_tier": "CLINICAL_CASE_REPORTS", "source_pmid": "40041314",
         "mechanism": "Case reports of trametinib for cardiac and lymphatic complications of Noonan syndrome"},
        {"source": "DRUG_TRAMETINIB", "target": "DIS_COSTELLO", "relationship": "REPURPOSING_CANDIDATE", "confidence": 0.4, "evidence_tier": "INFERRED_HYPOTHESIS", "source_pmid": "38432396",
         "mechanism": "MEK inhibition is reported for RASopathy-associated hypertrophic cardiomyopathy; Costello-specific evidence was not checked"},
        {"source": "DRUG_TROFINETIDE", "target": "DIS_MECP2", "relationship": "FDA_APPROVED_INDICATION", "confidence": 0.99, "evidence_tier": "CLINICAL_PROVEN", "approval": "NDA217026"},
        {"source": "DRUG_OMAVELOXOLONE", "target": "DIS_FXN", "relationship": "FDA_APPROVED_INDICATION", "confidence": 0.98, "evidence_tier": "CLINICAL_PROVEN", "approval": "NDA216718"},
        {"source": "DRUG_GANAXOLONE", "target": "DIS_CDKL5", "relationship": "FDA_APPROVED_INDICATION", "confidence": 0.96, "evidence_tier": "CLINICAL_PROVEN", "approval": "NDA215904"},

        # SCN2A variant-effect clusters (PMID 28379373)
        {"source": "DIS_SCN2A_GOF", "target": "GENE_SCN2A", "relationship": "CAUSED_BY_MUTATION", "direction": "gain_of_function", "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373"},
        {"source": "DIS_SCN2A_LOF", "target": "GENE_SCN2A", "relationship": "CAUSED_BY_MUTATION", "direction": "loss_of_function", "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373"},
        {"source": "DIS_SCN2A_GOF", "target": "PATH_NAV12_EXCITABILITY", "relationship": "DISRUPTS_MECHANISM", "direction": "gain_of_function", "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373",
         "mechanism": "Gain-of-function effect on Nav1.2"},
        {"source": "DIS_SCN2A_LOF", "target": "PATH_NAV12_EXCITABILITY", "relationship": "DISRUPTS_MECHANISM", "direction": "loss_of_function", "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373",
         "mechanism": "Loss-of-function effect on Nav1.2"},
        {"source": "DRUG_PHENYTOIN", "target": "DIS_SCN2A_GOF", "relationship": "EFFECTIVE_INDICATION", "confidence": 0.7, "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373",
         "mechanism": "Often associated with clinically relevant seizure reduction when epilepsy onset was before 3 months"},
        {"source": "DRUG_PHENYTOIN", "target": "DIS_SCN2A_LOF", "relationship": "CONTRAINDICATED_WARNING", "confidence": 0.7, "evidence_tier": "CLINICAL_OBSERVATIONAL", "source_pmid": "28379373",
         "mechanism": "Rarely effective in later-onset epilepsies, which were associated with loss-of-function variants (PMID 28379373)"},

        # RESEARCH ASSETS -> DISEASES
        {"source": "ASSET_NGLY1_IPSC", "target": "DIS_NGLY1", "relationship": "VALIDATED_DISEASE_MODEL", "evidence_tier": "CURATED_RECORD", "source_pmid": "36589922"},
        {"source": "ASSET_NATURAL_HISTORY_PROTOCOL", "target": "DIS_NGLY1", "relationship": "REUSABLE_STUDY_DESIGN", "evidence_tier": "CURATED_RECORD", "source_pmid": "37379343"},
        {"source": "ASSET_GLCNAC_BIOMARKER", "target": "DIS_NGLY1", "relationship": "DISEASE_BIOMARKER_ASSAY", "evidence_tier": "CURATED_RECORD", "source_pmid": "34697629"},
        {"source": "ASSET_STXBP1_MOUSE", "target": "DIS_STXBP1", "relationship": "VALIDATED_DISEASE_MODEL", "evidence_tier": "CURATED_RECORD", "source_pmid": "29538625"},

        # INVESTIGATORS -> TRIALS / PAPERS
        {"source": "KOL_MAURA_RUZHNIKOV", "target": "TRIAL_NCT03834987", "relationship": "PRINCIPAL_INVESTIGATOR", "evidence_tier": "CURATED_RECORD"},
        {"source": "KOL_INGO_HELBIG", "target": "TRIAL_NCT06555965", "relationship": "PRINCIPAL_INVESTIGATOR", "evidence_tier": "CURATED_RECORD"},
        {"source": "KOL_EVA_MORAVA", "target": "TRIAL_NCT05402345", "relationship": "PRINCIPAL_INVESTIGATOR", "evidence_tier": "CURATED_RECORD"},
        {"source": "KOL_GREGORY_ENNS", "target": "PUB_24651605", "relationship": "AUTHOR_OF", "evidence_tier": "CURATED_RECORD"},
        {"source": "KOL_GREGORY_ENNS", "target": "DIS_NGLY1", "relationship": "PUBLISHES_ON", "n_papers": 1, "pmids": ["24651605"], "evidence_tier": "CURATED_RECORD"},

        # PATIENT ORGANIZATIONS -> DISEASES
        {"source": "GROUP_GRACE_SCIENCE", "target": "DIS_NGLY1", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_STXBP1_FOUNDATION", "target": "DIS_STXBP1", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_RETT_FOUNDATION", "target": "DIS_MECP2", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_CURE_SANFILIPPO", "target": "DIS_MPS3", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_NOONAN_FOUNDATION", "target": "DIS_NOONAN", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_RASOPATHIES_NETWORK", "target": "DIS_NOONAN", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_RASOPATHIES_NETWORK", "target": "DIS_COSTELLO", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_COSTELLO_FAMILY_NETWORK", "target": "DIS_COSTELLO", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_COSTELLO_KIDS", "target": "DIS_COSTELLO", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_BDSRA", "target": "DIS_CLN3", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_BEYOND_BATTEN", "target": "DIS_CLN3", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_FARA", "target": "DIS_FXN", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_IFCR", "target": "DIS_CDKL5", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_MENKES_INTERNATIONAL", "target": "DIS_ATP7A", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_PMSF", "target": "DIS_SHANK3", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_FAMILIESCN2A", "target": "DIS_SCN2A_GOF", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},
        {"source": "GROUP_FAMILIESCN2A", "target": "DIS_SCN2A_LOF", "relationship": "PATIENT_ADVOCACY_LEADER", "evidence_tier": "CURATED_RECORD"},

        # CLINICAL TRIALS -> DISEASES
        {"source": "DIS_NGLY1", "target": "TRIAL_NCT03834987", "relationship": "INVESTIGATED_IN", "evidence_tier": "CURATED_RECORD"},
        {"source": "DIS_NGLY1", "target": "TRIAL_NCT06199531", "relationship": "INVESTIGATED_IN", "evidence_tier": "CURATED_RECORD"},
        {"source": "DIS_STXBP1", "target": "TRIAL_NCT06555965", "relationship": "INVESTIGATED_IN", "evidence_tier": "CURATED_RECORD"},
        {"source": "DIS_NGLY1", "target": "TRIAL_NCT05402345", "relationship": "INVESTIGATED_IN", "evidence_tier": "CURATED_RECORD"},
        {"source": "TRIAL_NCT05402345", "target": "HP:0000522", "relationship": "PRIMARY_OUTCOME_TARGETS", "evidence_tier": "CURATED_RECORD"},

        # PUBLICATIONS -> NODES THEY SUPPORT
        {"source": "PUB_24651605", "target": "DIS_NGLY1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.99, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_24651605", "target": "GENE_NGLY1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.99, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        # C. elegans genetics: supports the NGLY1/Nrf1 mechanism, not any drug (no auranofin data in this paper)
        {"source": "PUB_27528192", "target": "PATH_NRF1_BOUNCEBACK", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_30266908", "target": "DRUG_4PBA", "relationship": "SUPPORTS_EVIDENCE", "score": 0.91, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_30266908", "target": "DRUG_TREHALOSE", "relationship": "SUPPORTS_EVIDENCE", "score": 0.91, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_30266908", "target": "DIS_STXBP1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.91, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_33068037", "target": "DIS_FXN", "relationship": "SUPPORTS_EVIDENCE", "score": 0.98, "evidence_tier": "CLINICAL_PROVEN"},
        {"source": "PUB_33068037", "target": "DRUG_OMAVELOXOLONE", "relationship": "SUPPORTS_EVIDENCE", "score": 0.98, "evidence_tier": "CLINICAL_PROVEN"},
        {"source": "PUB_31615832", "target": "DRUG_ARIPIPRAZOLE", "relationship": "SUPPORTS_EVIDENCE", "score": 0.75, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_31615832", "target": "DIS_NGLY1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.75, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_35653343", "target": "DRUG_LITHIUM", "relationship": "SUPPORTS_EVIDENCE", "score": 0.75, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_35653343", "target": "DIS_NGLY1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.75, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_37379343", "target": "DIS_NGLY1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.9, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_37379343", "target": "ASSET_NATURAL_HISTORY_PROTOCOL", "relationship": "SUPPORTS_EVIDENCE", "score": 0.9, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_34697629", "target": "ASSET_GLCNAC_BIOMARKER", "relationship": "SUPPORTS_EVIDENCE", "score": 0.8, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_36589922", "target": "ASSET_NGLY1_IPSC", "relationship": "SUPPORTS_EVIDENCE", "score": 0.7, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_36875753", "target": "ASSET_NGLY1_IPSC", "relationship": "SUPPORTS_EVIDENCE", "score": 0.7, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_29538625", "target": "ASSET_STXBP1_MOUSE", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_29538625", "target": "DIS_STXBP1", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_28379373", "target": "DIS_SCN2A_GOF", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_28379373", "target": "DIS_SCN2A_LOF", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_28379373", "target": "DRUG_PHENYTOIN", "relationship": "SUPPORTS_EVIDENCE", "score": 0.85, "evidence_tier": "CLINICAL_OBSERVATIONAL"},
        {"source": "PUB_28165011", "target": "DRUG_TREHALOSE", "relationship": "SUPPORTS_EVIDENCE", "score": 0.8, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_28165011", "target": "DIS_CLN3", "relationship": "SUPPORTS_EVIDENCE", "score": 0.8, "evidence_tier": "PRECLINICAL_VALIDATED"},
        {"source": "PUB_40041314", "target": "DRUG_TRAMETINIB", "relationship": "SUPPORTS_EVIDENCE", "score": 0.6, "evidence_tier": "CLINICAL_CASE_REPORTS"},
        {"source": "PUB_40041314", "target": "DIS_NOONAN", "relationship": "SUPPORTS_EVIDENCE", "score": 0.6, "evidence_tier": "CLINICAL_CASE_REPORTS"},
        {"source": "PUB_38432396", "target": "DRUG_TRAMETINIB", "relationship": "SUPPORTS_EVIDENCE", "score": 0.6, "evidence_tier": "CLINICAL_CASE_REPORTS"},
    ]
}
