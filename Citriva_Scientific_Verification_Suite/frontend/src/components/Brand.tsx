import Link from 'next/link';

export default function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 text-slate-900 group">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-sky-600 to-indigo-900 text-white shadow-[0_4px_20px_rgba(2,132,199,0.4)] border border-sky-300/40 group-hover:scale-105 transition-all">
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="brandRGlyph" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="brandROrbit" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.95" />
            </linearGradient>
            <filter id="brandRGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#0369a1" floodOpacity="0.55"/>
            </filter>
          </defs>
          <ellipse cx="20" cy="20" rx="17" ry="10" transform="rotate(-28 20 20)" stroke="url(#brandROrbit)" strokeWidth="1.5" strokeDasharray="3 2.5" opacity="0.8" />
          <circle cx="5.5" cy="15" r="1.8" fill="#38bdf8" />
          <circle cx="5.5" cy="15" r="0.8" fill="#ffffff" />
          <g filter="url(#brandRGlow)">
            <path d="M10 8 H15.5 V32 H10 V8 Z" fill="url(#brandRGlyph)" />
            <path d="M8 8 H17.5 V10.5 H8 V8 Z" fill="url(#brandRGlyph)" />
            <path d="M8 29.5 H17.5 V32 H8 V29.5 Z" fill="url(#brandRGlyph)" />
            <path d="M15.5 8 H24.5 C29.1944 8 33 11.3579 33 15.5 C33 19.6421 29.1944 23 24.5 23 H15.5 V19 H24 C26.2091 19 28 17.433 28 15.5 C28 13.567 26.2091 12 24 12 H15.5 V8 Z" fill="url(#brandRGlyph)" />
            <path d="M21 21.5 L28.5 32 H34.5 L26.2 20.8 C24.6 21.3 22.8 21.5 21 21.5 Z" fill="url(#brandRGlyph)" />
          </g>
          <polygon points="32.5,5 34.8,8 32.5,11 30.2,8" fill="#00d4ff" />
          <circle cx="32.5" cy="8" r="1.2" fill="#ffffff" />
        </svg>
      </span>
      <div className="flex flex-col">
        <span className="font-display text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
          Citriva
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-blue-600 font-bold -mt-0.5">
          Research Verification
        </span>
      </div>
    </Link>
  );
}
