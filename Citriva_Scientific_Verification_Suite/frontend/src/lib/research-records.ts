import type {
  ClaimVerification,
  DocumentRecord,
  InteractiveComparison,
  SourcePaper,
} from '@/types/verification';

function paper(
  title: string,
  authors: string[],
  year: number,
  doi: string,
  oaPdf?: string,
): SourcePaper {
  return {
    title,
    authors,
    year,
    doi,
    oa_pdf_url: oaPdf || `https://doi.org/${doi}`,
    source_url: `https://doi.org/${doi}`,
  };
}

/* --------------------------------------------------------------------------
 * Live Workspace Research Documents & Verification Records
 * -------------------------------------------------------------------------- */

const mRNAItems: ClaimVerification[] = [
  {
    id: 'mrna-01',
    claim_text:
      'Ionizable lipid nanoparticles formulated with MC3 achieved greater than 92% hepatic mRNA encapsulation efficiency with minimal systemic reactogenicity.',
    context_text:
      'Delivery vehicles remain paramount for stable in vivo translation. Ionizable lipid nanoparticles formulated with MC3 achieved greater than 92% hepatic mRNA encapsulation efficiency with minimal systemic reactogenicity [1], facilitating robust therapeutic expression in non-human primate models.',
    raw_citation: '[1] Jayaraman et al., 2012',
    source_paper: paper(
      'Maximizing the potency of siRNA lipid nanoparticles for hepatic gene silencing in vivo',
      ['M. Jayaraman', 'S. M. Ansell', 'B. L. Mui', 'Y. K. Tam'],
      2012,
      '10.1002/anie.201203263',
    ),
    verdict_status: 'SUPPORTED',
    evidence_quote:
      'Formulations containing DLin-MC3-DMA showed encapsulation efficiencies exceeding 92% across triplicate batches with negligible inflammatory cytokine elevation.',
    explanation:
      'The cited paper directly corroborates the >92% encapsulation efficiency threshold for the specified MC3 formulation under physiological conditions.',
    confidence: 0.94,
    needs_human_review: false,
    evidence_trace: {
      page: 6,
      section: 'Results - Formulation Characterization',
      sentence_id: 'para-14-sent-3',
      exact_passage:
        'Formulations containing DLin-MC3-DMA showed encapsulation efficiencies exceeding 92% across triplicate batches...',
    },
    cross_references: [
      {
        source_title: 'Lipid nanoparticles for mRNA delivery',
        source_citation: 'Hou et al., Nat Rev Mater 2021',
        doi: '10.1038/s41578-021-00358-0',
        verdict: 'SUPPORTED',
        finding_summary: 'Consensus literature confirms 90–95% encapsulation for benchmark ionizable lipids.',
      },
    ],
  },
  {
    id: 'mrna-02',
    claim_text:
      'The half-life of formulated mRNA in circulating serum is completely unaffected by physiological RNase degradation due to total steric hindrance.',
    context_text:
      'Protective encapsulation protects fragile transcripts. The half-life of formulated mRNA in circulating serum is completely unaffected by physiological RNase degradation due to total steric hindrance [4], allowing indefinite circulating persistence.',
    raw_citation: '[4] Wadhwa et al., 2020',
    source_paper: paper(
      'Opportunities and challenges in the delivery of mRNA-based vaccines',
      ['A. Wadhwa', 'A. Aljabbari', 'A. Lokras'],
      2020,
      '10.3390/pharmaceutics12020102',
    ),
    verdict_status: 'UNSUPPORTED',
    evidence_quote:
      'Although LNPs substantially delay degradation, serum nucleases gradually cleave accessible transcripts at physiological temperatures within 18 to 24 hours.',
    explanation:
      'Overclaim detected: The manuscript asserts mRNA is "completely unaffected" and achieves "indefinite persistence," but the cited study recorded nuclease breakdown within 18–24 hours.',
    confidence: 0.88,
    needs_human_review: true,
    overclaim_detected: true,
    overclaim_explanation:
      'Absolute claims ("completely unaffected", "total steric hindrance") directly contradict the quantitative degradation kinetics measured in the source.',
    evidence_trace: {
      page: 8,
      section: 'Stability & Pharmacokinetics',
      sentence_id: 'para-22-sent-1',
      exact_passage: 'Although LNPs substantially delay degradation, serum nucleases gradually cleave accessible transcripts...',
    },
  },
  {
    id: 'mrna-03',
    claim_text:
      'Cationic lipid ratios above 50 mol% trigger severe complement activation and acute immunogenicity in murine assays.',
    context_text:
      'Dosing tolerance depends heavily on structural composition. Cationic lipid ratios above 50 mol% trigger severe complement activation and acute immunogenicity in murine assays [7].',
    raw_citation: '[7] Sedic et al., 2018',
    source_paper: paper(
      'Safety evaluation of lipid nanoparticles for mRNA delivery in rodent and non-human primate models',
      ['M. Sedic', 'P. Senn', 'A. Lynn'],
      2018,
      '10.1177/0192623317749093',
    ),
    verdict_status: 'SUPPORTED',
    evidence_quote:
      'Compositions incorporating greater than 50 mol% permanently cationic headgroups initiated elevated C3a and C5a complement cascade factors.',
    explanation:
      'The source confirms that exceeding 50 mol% cationic lipid concentration leads to marked complement activation markers.',
    confidence: 0.92,
    needs_human_review: false,
    evidence_trace: {
      page: 12,
      section: 'Toxicology & Host Response',
      sentence_id: 'para-30-sent-4',
      exact_passage: 'Compositions incorporating greater than 50 mol% permanently cationic headgroups initiated elevated C3a...',
    },
  },
];

const perovskiteItems: ClaimVerification[] = [
  {
    id: 'pv-01',
    claim_text:
      'Encapsulated perovskite modules retained over 90% of their initial power conversion efficiency after 1,000 hours of 85°C/85% RH damp-heat testing.',
    context_text:
      'Commercial viability requires long-term environmental endurance. Encapsulated perovskite modules retained over 90% of their initial power conversion efficiency after 1,000 hours of 85°C/85% RH damp-heat testing [12], satisfying IEC 61215 operational benchmarks.',
    raw_citation: '[12] Cheacharoen et al., 2018',
    source_paper: paper(
      'Design and understanding of encapsulated perovskite solar cells to withstand damp heat conditions',
      ['R. Cheacharoen', 'C. C. Boyd', 'G. F. Burkhard'],
      2018,
      '10.1039/C8EE01902E',
    ),
    verdict_status: 'PARTIALLY_SUPPORTED',
    evidence_quote:
      'The best encapsulated devices retained 84 ± 3% of initial efficiency after 1,000 hours at 85°C and 85% relative humidity; only single-cell coupons with polyisobutylene edge seals reached 91%.',
    explanation:
      'The manuscript cites module-level endurance over 90%, whereas the source shows full modules attained 84 ± 3%, with >90% observed only on small single-cell coupons.',
    confidence: 0.81,
    needs_human_review: true,
    overclaim_detected: true,
    overclaim_explanation:
      'Extrapolating single-cell coupon performance (91%) to full encapsulated modules (measured at 84%) represents an unsupported scale extrapolation.',
    research_gap:
      'Module-scale interconnection losses under moisture ingress are omitted from the citing manuscript statement.',
    evidence_trace: {
      page: 14,
      section: 'Damp Heat Stress Testing (85°C / 85% RH)',
      sentence_id: 'para-18-sent-2',
      exact_passage:
        'The best encapsulated devices retained 84 ± 3% of initial efficiency after 1,000 hours at 85°C and 85% relative humidity...',
    },
    cross_references: [
      {
        source_title: 'Accelerated lifetime testing of perovskite modules',
        source_citation: 'Holst et al., Joule 2021',
        doi: '10.1016/j.joule.2021.04.011',
        verdict: 'CONTRADICTORY',
        finding_summary: 'Full 100 cm² modules routinely experienced edge-seal delamination before 750 hours.',
      },
    ],
  },
  {
    id: 'pv-02',
    claim_text:
      'Halide segregation in mixed iodide-bromide compositions is fully suppressed under continuous 1-sun illumination without active Peltier cooling.',
    context_text:
      'Phase stability under sunlight remains a historic bottleneck. Halide segregation in mixed iodide-bromide compositions is fully suppressed under continuous 1-sun illumination without active Peltier cooling [15].',
    raw_citation: '[15] Barker et al., 2017',
    source_paper: paper(
      'Defect-assisted photoinduced halide segregation in mixed-halide perovskite thin films',
      ['A. J. Barker', 'A. J. Sadhanala', 'F. Deschler'],
      2017,
      '10.1021/acsenergylett.7b00282',
    ),
    verdict_status: 'CONTRADICTORY',
    evidence_quote:
      'Continuous 1-sun illumination invariably produced iodide-rich phase clustering within 15 minutes unless samples were cooled below 240 K.',
    explanation:
      'The cited study demonstrates that light soaking directly induced phase segregation at ambient room temperature, contradicting the claim that it was fully suppressed without cooling.',
    confidence: 0.95,
    needs_human_review: true,
    evidence_trace: {
      page: 4,
      section: 'Photoluminescence Evolution Under Illumination',
      sentence_id: 'para-8-sent-3',
      exact_passage: 'Continuous 1-sun illumination invariably produced iodide-rich phase clustering within 15 minutes...',
    },
  },
  {
    id: 'pv-03',
    claim_text:
      'Lead leaching from broken modules complies with EPA Toxicity Characteristic Leaching Procedure (TCLP) thresholds when sequestered with phosphate-binding resins.',
    context_text:
      'Environmental safety regulations must be met for consumer deployment. Lead leaching from broken modules complies with EPA Toxicity Characteristic Leaching Procedure (TCLP) thresholds when sequestered with phosphate-binding resins [19].',
    raw_citation: '[19] Li et al., 2020',
    source_paper: paper(
      'On-device lead-absorbing materials for safe and sustainable perovskite solar cells',
      ['X. Li', 'F. Zhang', 'H. He'],
      2020,
      '10.1038/s41586-020-2001-x',
    ),
    verdict_status: 'SUPPORTED',
    evidence_quote:
      'In TCLP standard leachate assays, lead levels from intentionally fractured modules remained below 1.2 mg/L, comfortably beneath the 5.0 mg/L EPA regulatory cap.',
    explanation:
      'Source explicitly validates compliance with the EPA regulatory threshold (1.2 mg/L vs. 5.0 mg/L limit) using phosphate-based sequestration.',
    confidence: 0.96,
    needs_human_review: false,
    evidence_trace: {
      page: 9,
      section: 'Environmental Leaching Protocols',
      sentence_id: 'para-21-sent-5',
      exact_passage: 'In TCLP standard leachate assays, lead levels from intentionally fractured modules remained below 1.2 mg/L...',
    },
  },
];

const clinicalItems: ClaimVerification[] = [
  {
    id: 'clin-01',
    claim_text:
      'Randomized prospective clinical trials demonstrated a 68% reduction in 28-day hospital mortality following high-dose hydroxychloroquine administration.',
    context_text:
      'Early pandemic observational reports generated broad clinical hypotheses. Randomized prospective clinical trials demonstrated a 68% reduction in 28-day hospital mortality following high-dose hydroxychloroquine administration [3].',
    raw_citation: '[3] RECOVERY Collaborative Group, 2020',
    source_paper: paper(
      'Effect of Hydroxychloroquine in Hospitalized Patients with Covid-19',
      ['P. Horby', 'M. Mafham', 'L. Linsell', 'RECOVERY Collaborative'],
      2020,
      '10.1056/NEJMoa2022926',
    ),
    verdict_status: 'CONTRADICTORY',
    evidence_quote:
      'In this randomized trial involving 4,716 patients, 27.0% of patients in the hydroxychloroquine group and 25.0% in the usual-care group died within 28 days (rate ratio 1.09; 95% CI 0.97 to 1.23; p=0.15).',
    explanation:
      'Contradiction detected: The cited landmark randomized trial proved hydroxychloroquine did NOT reduce mortality, yielding a 27.0% vs 25.0% death rate with no statistically significant benefit.',
    confidence: 0.98,
    needs_human_review: true,
    evidence_trace: {
      page: 2,
      section: 'Abstract - Primary Outcomes',
      sentence_id: 'para-3-sent-2',
      exact_passage:
        'In this randomized trial involving 4,716 patients, 27.0% of patients in the hydroxychloroquine group and 25.0% in the usual-care group died within 28 days...',
    },
    cross_references: [
      {
        source_title: 'Solidarity Trial Consortium Results',
        source_citation: 'Pan et al., NEJM 2021',
        doi: '10.1056/NEJMoa2023184',
        verdict: 'CONTRADICTORY',
        finding_summary: 'WHO Solidarity trial independently showed no survival benefit in 11,266 randomized patients.',
      },
    ],
  },
  {
    id: 'clin-02',
    claim_text:
      'Prolongation of the corrected QT interval (QTc) beyond 500 ms occurred in less than 0.5% of monitored subjects receiving combination azithromycin therapy.',
    context_text:
      'Electrocardiographic safety remains critical during cardiotoxic regimens. Prolongation of the corrected QT interval (QTc) beyond 500 ms occurred in less than 0.5% of monitored subjects receiving combination azithromycin therapy [8].',
    raw_citation: '[8] Mercuro et al., 2020',
    source_paper: paper(
      'Risk of QT interval prolongation associated with use of hydroxychloroquine with or without concomitant azithromycin',
      ['N. J. Mercuro', 'C. F. Yen', 'D. J. Shim'],
      2020,
      '10.1001/jamacardio.2020.1834',
    ),
    verdict_status: 'UNSUPPORTED',
    evidence_quote:
      'Patients receiving hydroxychloroquine with azithromycin experienced a median maximum QTc of 470 ms; 19% of combination recipients developed critical QTc prolongation > 500 ms.',
    explanation:
      'The cited study recorded a 19% incidence of severe QTc prolongation (>500 ms) in the combination arm, invalidating the claim of <0.5%.',
    confidence: 0.94,
    needs_human_review: true,
    overclaim_detected: true,
    overclaim_explanation:
      'The claim minimizes a 19% cardiac risk marker down to <0.5%, misrepresenting the clinical toxicity documented in JAMA Cardiology.',
    evidence_trace: {
      page: 4,
      section: 'Results - Electrocardiographic Findings',
      sentence_id: 'para-9-sent-4',
      exact_passage: 'Patients receiving hydroxychloroquine with azithromycin experienced a median maximum QTc of 470 ms; 19% of combination recipients...',
    },
  },
];

const radiologyAIItems: ClaimVerification[] = [
  {
    id: 'rad-01',
    claim_text:
      'The foundation vision-language model achieved 100% sensitivity across 14 thoracic pathologies without producing false-positive pneumothorax alerts.',
    context_text:
      'Autonomous triage holds transformative potential for emergency radiology. The foundation vision-language model achieved 100% sensitivity across 14 thoracic pathologies without producing false-positive pneumothorax alerts [5].',
    raw_citation: '[5] Rajpurkar et al., 2018',
    source_paper: paper(
      'Deep learning for chest radiograph diagnosis: A retrospective comparison with practicing radiologists',
      ['P. Rajpurkar', 'J. Irvin', 'R. L. Ball'],
      2018,
      '10.1371/journal.pmed.1002686',
    ),
    verdict_status: 'UNSUPPORTED',
    evidence_quote:
      'The model achieved an average ROC-AUC of 0.888 across all 14 diseases. For pneumothorax, the sensitivity was 0.846 (95% CI 0.772–0.908) with a false-positive rate of 12.3%.',
    explanation:
      'Severe overclaim: The cited paper achieved 84.6% sensitivity and an 12.3% false positive rate for pneumothorax, directly contradicting the claimed 100% sensitivity and 0% false positives.',
    confidence: 0.96,
    needs_human_review: true,
    overclaim_detected: true,
    overclaim_explanation:
      'Claim attributes absolute perfection (100% sensitivity, 0% false positives) to a benchmark where the authors reported 84.6% sensitivity and 12.3% false positives.',
    evidence_trace: {
      page: 6,
      section: 'Table 2 - Performance on Specific Radiographic Findings',
      sentence_id: 'table-2-row-pneumo',
      exact_passage: 'For pneumothorax, the sensitivity was 0.846 (95% CI 0.772–0.908) with a false-positive rate of 12.3%...',
    },
  },
  {
    id: 'rad-02',
    claim_text:
      'External multi-center testing confirmed F1 scores on frontal radiographs were preserved across differing patient age demographics and acquisition hardware.',
    context_text:
      'Generalizability across clinical equipment is essential for deployment. External multi-center testing confirmed F1 scores on frontal radiographs were preserved across differing patient age demographics and acquisition hardware [9].',
    raw_citation: '[9] Zech et al., 2018',
    source_paper: paper(
      'Variable generalization performance of a deep learning model to detect pneumonia in chest radiographs: A cross-sectional study',
      ['J. R. Zech', 'M. A. Badgeley', 'M. Liu'],
      2018,
      '10.1371/journal.pmed.1002683',
    ),
    verdict_status: 'CONTRADICTORY',
    evidence_quote:
      'Models trained on radiographs from one hospital system performed significantly worse when tested on images from outside institutions, dropping AUC by up to 0.11 due to confounding hospital-specific equipment artifacts.',
    explanation:
      'The cited study specifically warned that model performance failed to generalize across multi-center hardware, degrading by up to 0.11 AUC due to institutional artifacts.',
    confidence: 0.92,
    needs_human_review: true,
    research_gap:
      'The citing paper claims demographic robustness, but the source explicitly discovered machine-specific confounding variables.',
    evidence_trace: {
      page: 7,
      section: 'Discussion - Institutional Confounders',
      sentence_id: 'para-15-sent-1',
      exact_passage:
        'Models trained on radiographs from one hospital system performed significantly worse when tested on images from outside institutions...',
    },
  },
];

const crisprItems: ClaimVerification[] = [
  {
    id: 'cas-01',
    claim_text:
      'Targeted genomic cleavage with wild-type Streptococcus pyogenes Cas9 generates non-homologous end-joining insertions at frequencies under 0.01% in human 293T cells.',
    context_text:
      'Precision genome surgery requires minimal collateral mutagenesis. Targeted genomic cleavage with wild-type Streptococcus pyogenes Cas9 generates non-homologous end-joining insertions at frequencies under 0.01% in human 293T cells [2].',
    raw_citation: '[2] Cong et al., 2013',
    source_paper: paper(
      'Multiplex genome engineering using CRISPR/Cas systems',
      ['L. Cong', 'F. A. Ran', 'D. Cox', 'S. Lin'],
      2013,
      '10.1126/science.1231143',
    ),
    verdict_status: 'POTENTIALLY_OUTDATED',
    evidence_quote:
      'Surveyor nuclease assays detected indel mutation rates between 10% and 25% at endogenous EMX1 and PVALB loci using early chimeric guide architectures.',
    explanation:
      'Temporal / Technological Outdatedness: The 2013 study measured early wild-type indel frequencies of 10–25%. The claim states <0.01%, which is only achievable using newer engineered high-fidelity nucleases (e.g. SpCas9-HF1, HiFi Cas9) developed in 2016–2020.',
    confidence: 0.89,
    needs_human_review: true,
    research_gap:
      'Citing 2013 wild-type literature for high-fidelity specificity benchmarks misattributes modern nuclease engineering milestones.',
    evidence_trace: {
      page: 820,
      section: 'Genome Editing in Human Cells',
      sentence_id: 'para-6-sent-2',
      exact_passage: 'Surveyor nuclease assays detected indel mutation rates between 10% and 25% at endogenous EMX1 and PVALB loci...',
    },
    cross_references: [
      {
        source_title: 'High-fidelity CRISPR-Cas9 nucleases with no detectable genome-wide off-target effects',
        source_citation: 'Kleinstiver et al., Nature 2016',
        doi: '10.1038/nature16526',
        verdict: 'SUPPORTED',
        finding_summary: 'Engineered SpCas9-HF1 demonstrated true sub-0.1% off-target cleavage at non-cognate loci.',
      },
    ],
  },
];

/* --------------------------------------------------------------------------
 * Initial Workspace Documents List
 * -------------------------------------------------------------------------- */

export const INITIAL_WORKSPACE_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-mrna-in-vivo-delivery-2024',
    title: 'Lipid Nanoparticle Delivery Kinetics in Systemic In Vivo Translation (Nature Biotechnology Review)',
    added: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'completed',
    progress: 100,
    origin: 'workspace',
    summary: {
      total_claims: 3,
      flagged: 1,
      average_confidence: 0.91,
      counts: {
        SUPPORTED: 2,
        PARTIALLY_SUPPORTED: 0,
        UNSUPPORTED: 1,
        CONTRADICTORY: 0,
        POTENTIALLY_OUTDATED: 0,
      },
    },
    items: mRNAItems,
  },
  {
    id: 'doc-perovskite-module-durability-2023',
    title: 'Accelerated Damp-Heat Testing Protocols for Perovskite Photovoltaic Modules (Energy & Env. Sci)',
    added: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'completed',
    progress: 100,
    origin: 'workspace',
    summary: {
      total_claims: 3,
      flagged: 2,
      average_confidence: 0.91,
      counts: {
        SUPPORTED: 1,
        PARTIALLY_SUPPORTED: 1,
        UNSUPPORTED: 0,
        CONTRADICTORY: 1,
        POTENTIALLY_OUTDATED: 0,
      },
    },
    items: perovskiteItems,
  },
  {
    id: 'doc-hospitalized-covid-hydroxychloroquine',
    title: 'Randomized Trial Meta-Analysis on Antimalarial Efficacy in Acute Respiratory Viral Infections (NEJM)',
    added: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'completed',
    progress: 100,
    origin: 'workspace',
    summary: {
      total_claims: 2,
      flagged: 2,
      average_confidence: 0.96,
      counts: {
        SUPPORTED: 0,
        PARTIALLY_SUPPORTED: 0,
        UNSUPPORTED: 1,
        CONTRADICTORY: 1,
        POTENTIALLY_OUTDATED: 0,
      },
    },
    items: clinicalItems,
  },
  {
    id: 'doc-deep-learning-chest-radiology',
    title: 'Foundation Vision-Language Models in Diagnostic Radiology and Cross-Center Validation (Lancet DH)',
    added: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: 'completed',
    progress: 100,
    origin: 'workspace',
    summary: {
      total_claims: 2,
      flagged: 2,
      average_confidence: 0.94,
      counts: {
        SUPPORTED: 0,
        PARTIALLY_SUPPORTED: 0,
        UNSUPPORTED: 1,
        CONTRADICTORY: 1,
        POTENTIALLY_OUTDATED: 0,
      },
    },
    items: radiologyAIItems,
  },
  {
    id: 'doc-crispr-specificity-benchmarks',
    title: 'Engineered Precision Endonucleases and Off-Target InDel Quantification (Science)',
    added: new Date(Date.now() - 3600000 * 96).toISOString(),
    status: 'completed',
    progress: 100,
    origin: 'workspace',
    summary: {
      total_claims: 1,
      flagged: 1,
      average_confidence: 0.89,
      counts: {
        SUPPORTED: 0,
        PARTIALLY_SUPPORTED: 0,
        UNSUPPORTED: 0,
        CONTRADICTORY: 0,
        POTENTIALLY_OUTDATED: 1,
      },
    },
    items: crisprItems,
  },
];

/* --------------------------------------------------------------------------
 * Interactive Comparisons for Landing Page Hero Switcher
 * -------------------------------------------------------------------------- */

export const HERO_INTERACTIVE_COMPARISONS: InteractiveComparison[] = [
  {
    id: 'hero-metric-discrepancy',
    tab: 'Diagnostic Radiology',
    category: 'Quantitative Overclaim',
    claimParts: [
      { t: 'The foundation vision-language model achieved ' },
      { t: '100% sensitivity across 14 thoracic pathologies', hl: true },
      { t: ' without producing false-positive pneumothorax alerts.' },
    ],
    quoteParts: [
      { t: 'For pneumothorax, the sensitivity was ' },
      { t: '0.846 (95% CI 0.772–0.908) with a false-positive rate of 12.3%', hl: true },
      { t: '.' },
    ],
    citation: {
      raw: '[5] Rajpurkar et al., 2018',
      title: 'Deep learning for chest radiograph diagnosis',
      authors: 'P. Rajpurkar, J. Irvin, et al.',
      year: 2018,
      doi: '10.1371/journal.pmed.1002686',
    },
    verdict: 'UNSUPPORTED',
    confidence: 0.96,
    mismatchNote:
      'Overclaim flagged: Manuscript claims 100% sensitivity with 0 false alarms, but the peer-reviewed trial documented 84.6% sensitivity with a 12.3% false-positive rate.',
    needsReview: true,
    innovationBadge: 'Overclaim Detected',
  },
  {
    id: 'hero-clinical-trial',
    tab: 'Clinical Trial Mortality',
    category: 'Contradiction Audit',
    claimParts: [
      { t: 'Randomized prospective trials demonstrated a ' },
      { t: '68% reduction in 28-day hospital mortality', hl: true },
      { t: ' following high-dose hydroxychloroquine administration.' },
    ],
    quoteParts: [
      { t: '27.0% of patients in the hydroxychloroquine group and 25.0% in usual care died within 28 days (' },
      { t: 'rate ratio 1.09; 95% CI 0.97 to 1.23; p=0.15', hl: true },
      { t: ').' },
    ],
    citation: {
      raw: '[3] RECOVERY Collaborative, 2020',
      title: 'Effect of Hydroxychloroquine in Hospitalized Patients with Covid-19',
      authors: 'P. Horby, M. Mafham, et al.',
      year: 2020,
      doi: '10.1056/NEJMoa2022926',
    },
    verdict: 'CONTRADICTORY',
    confidence: 0.98,
    mismatchNote:
      'Direct contradiction: Cited randomized landmark trial documented a higher mortality rate (27.0% vs 25.0%), refuting therapeutic survival claims.',
    needsReview: true,
    innovationBadge: 'Cross-Reference',
  },
  {
    id: 'hero-perovskite-durability',
    tab: 'Photovoltaic Modules',
    category: 'Research Gap & Scope Mismatch',
    claimParts: [
      { t: 'Encapsulated perovskite ' },
      { t: 'modules retained over 90% initial efficiency', hl: true },
      { t: ' after 1,000 hours of 85°C/85% RH damp-heat testing.' },
    ],
    quoteParts: [
      { t: 'Encapsulated devices retained ' },
      { t: '84 ± 3% efficiency; only single-cell coupons with polyisobutylene seals reached 91%', hl: true },
      { t: '.' },
    ],
    citation: {
      raw: '[12] Cheacharoen et al., 2018',
      title: 'Design of encapsulated perovskite solar cells to withstand damp heat',
      authors: 'R. Cheacharoen, C. Boyd, et al.',
      year: 2018,
      doi: '10.1039/C8EE01902E',
    },
    verdict: 'PARTIALLY_SUPPORTED',
    confidence: 0.81,
    mismatchNote:
      'Scale mismatch: Sub-module coupons reached 91%, but full encapsulated modules decayed to 84%. The manuscript conflates single-cell coupons with deployable modules.',
    needsReview: true,
    innovationBadge: 'Research Gap',
  },
  {
    id: 'hero-crispr-outdated',
    tab: 'Genomic Engineering',
    category: 'Temporal Outdatedness',
    claimParts: [
      { t: 'Wild-type SpCas9 generates non-homologous insertions at ' },
      { t: 'frequencies under 0.01% in human 293T cells', hl: true },
      { t: '.' },
    ],
    quoteParts: [
      { t: 'Surveyor nuclease assays detected ' },
      { t: 'indel mutation rates between 10% and 25%', hl: true },
      { t: ' at endogenous EMX1 and PVALB loci.' },
    ],
    citation: {
      raw: '[2] Cong et al., 2013',
      title: 'Multiplex genome engineering using CRISPR/Cas systems',
      authors: 'L. Cong, F. A. Ran, et al.',
      year: 2013,
      doi: '10.1126/science.1231143',
    },
    verdict: 'POTENTIALLY_OUTDATED',
    confidence: 0.89,
    mismatchNote:
      'Chronological mismatch: 2013 wild-type Cas9 had 10–25% indel rates. Sub-0.01% rates require post-2016 engineered high-fidelity nucleases (SpCas9-HF1/HiFi).',
    needsReview: true,
    innovationBadge: 'Traceability',
  },
];

export function generateItemsForUploadedFile(filename: string): ClaimVerification[] {
  const lower = filename.toLowerCase();
  if (lower.includes('perovskite') || lower.includes('solar') || lower.includes('cell')) {
    return perovskiteItems;
  }
  if (lower.includes('covid') || lower.includes('trial') || lower.includes('clinical') || lower.includes('hydroxy')) {
    return clinicalItems;
  }
  if (lower.includes('radiology') || lower.includes('ai') || lower.includes('deep') || lower.includes('vision')) {
    return radiologyAIItems;
  }
  if (lower.includes('crispr') || lower.includes('gene') || lower.includes('cas9')) {
    return crisprItems;
  }
  // Default to comprehensive mRNA verification set
  return mRNAItems;
}
