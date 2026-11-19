import { GitCompare, SearchCode, AlertOctagon, MapPin, Sparkles } from 'lucide-react';

const INNOVATION_PILLARS = [
  {
    icon: GitCompare,
    badge: 'Pillar 1',
    title: 'Cross-Reference Verification',
    summary: 'Compares a claim with multiple related research findings to identify inconsistent conclusions.',
    detail: 'Cross-queries consensus literature across OpenAlex and Semantic Scholar graphs to detect when a paper cites a solitary outlier study while ignoring broader scientific replication failure.',
    metric: 'Multi-Graph Consensus',
  },
  {
    icon: SearchCode,
    badge: 'Pillar 2',
    title: 'Research Gap Identification',
    summary: 'Highlights information in the claim that is not sufficiently covered by the cited paper.',
    detail: 'Pinpoints boundary mismatches where a paper claims a methodology solves a broad problem, but the source only tested a narrow sub-condition or toy domain.',
    metric: 'Boundary Scope Mapping',
  },
  {
    icon: AlertOctagon,
    badge: 'Pillar 3',
    title: 'Overclaim Detection',
    summary: 'Identifies when a researcher makes conclusions stronger than the actual experimental results.',
    detail: 'Evaluates rhetorical hyperbole against statistical results—detecting absolute assertions like "eliminates all errors" or "100% precision" when experimental data documented confidence intervals and error rates.',
    metric: 'Statistical NLI Audit',
  },
  {
    icon: MapPin,
    badge: 'Pillar 4',
    title: 'Evidence Traceability',
    summary: 'Allows users to trace every verification result back to its original research-paper sentence.',
    detail: 'Enforces code-level verbatim quote substring verification. If the cited quote cannot be found verbatim in the source PDF text, confidence is capped at 0.4 and flagged for human review.',
    metric: 'Verbatim Substring Guarantee',
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:py-20">
      <div className="mb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 mb-4">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-200">
            Core Scientific Innovations
          </span>
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-[#f0f9ff] sm:text-4xl lg:text-5xl">
          Four Breakthrough Verification Pillars
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Citriva goes far beyond simple citation existence lookups. It performs full natural language inference between the claim and the cited experimental evidence.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {INNOVATION_PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="glass glass-hover p-6 flex flex-col justify-between border-sky-400/20 bg-sky-950/35 relative group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-300 shadow-[0_0_15px_-3px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-transform">
                  <pillar.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-sky-400/20 bg-sky-400/5 text-sky-300">
                  {pillar.badge}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#f0f9ff] mb-2">
                {pillar.title}
              </h3>
              <p className="text-xs font-medium text-sky-200/90 leading-relaxed mb-3">
                {pillar.summary}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {pillar.detail}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-sky-400/15 flex items-center justify-between">
              <span className="font-mono text-[10px] text-sky-400/80 uppercase tracking-wider">
                Guardrail
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#f0f9ff]">
                {pillar.metric}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
