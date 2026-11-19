import Brand from '@/components/Brand';
import TrustBanner from '@/components/TrustBanner';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8">
      <TrustBanner />
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sky-400/15 pt-6 text-xs text-muted">
        <Brand />
        <div className="flex items-center gap-6">
          <span>Domain: Research Technology & Academic Integrity</span>
          <span>© {new Date().getFullYear()} Citriva Workspace</span>
        </div>
      </div>
    </footer>
  );
}
