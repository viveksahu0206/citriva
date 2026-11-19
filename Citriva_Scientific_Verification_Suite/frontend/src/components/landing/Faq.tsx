'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'Does Citriva replace human peer review or academic editorial judgment?',
    a: 'Never. Citriva acts as an auditable verification copilot. It extracts cited statements, locates the primary peer-reviewed sources, and applies bounded Natural Language Inference (NLI) to flag discrepancies, overclaims, or mismatched numbers. The final scholarly judgment always remains with researchers and review committees.',
  },
  {
    q: 'How does Citriva prevent LLM hallucination in verification verdicts?',
    a: 'Through three strict architectural non-negotiables: (1) Temperature is pinned to 0; (2) The model is strictly instructed to evaluate only from supplied passages and prohibited from using parametric world knowledge; (3) The exact_quote returned by the engine is verified in code as a character-for-character verbatim substring of the source text. If it fails, confidence is capped at 0.4 and forced into human review.',
  },
  {
    q: 'How are paywalled or closed-access papers handled?',
    a: 'Citriva executes a waterfall retrieval process: DOI -> OpenAlex -> Unpaywall (for legal Open Access PDFs). If only the peer-reviewed abstract is openly accessible, the engine evaluates the claim against the abstract, stamps it "Verified against abstract only", and automatically caps maximum confidence at 0.6.',
  },
  {
    q: 'What triggers the "Needs Human Review" indicator?',
    a: 'A claim is automatically routed for human review if its NLI confidence is below 0.75, or if its verdict is anything other than SUPPORTED (e.g. PARTIALLY_SUPPORTED, CONTRADICTORY, or OUTDATED). Auditors can inspect the context, override verdicts, and record audit notes.',
  },
  {
    q: 'What formats can I export from Citriva?',
    a: 'Citriva compiles complete, publication-grade academic PDF audit reports (via GET /api/v1/jobs/{id}/export?format=pdf). The exported PDF features summary scorecard metrics, claim-by-claim breakdowns, verbatim quotes, and auditor review stamps suitable for grant compliance and journal submissions.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-2">Technical & Editorial Clarifications</p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-[#f0f9ff] sm:text-4xl">
          Frequently Answered Questions
        </h2>
      </div>
      <div className="space-y-3.5">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="glass glass-hover overflow-hidden border-sky-400/20 bg-sky-950/30">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-[#f0f9ff]"
              >
                <span className="text-sm font-semibold">{f.q}</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-sky-400 transition-transform duration-200', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-300',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-xs leading-relaxed text-muted">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
