'use client';

import { useEffect } from 'react';

export default function AmbientBackground() {
  useEffect(() => {
    let rafId: number | null = null;

    const handlePointerMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = `${e.clientX}px`;
        const y = `${e.clientY}px`;
        document.documentElement.style.setProperty('--cursor-x', x);
        document.documentElement.style.setProperty('--cursor-y', y);
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Abyssal deep blue base glow */}
      <div
        className="absolute -left-48 -top-48 h-[720px] w-[720px] rounded-full blur-[120px] transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 70%)',
        }}
      />

      {/* Cobalt / Indigo lower layer */}
      <div
        className="absolute -bottom-48 -right-36 h-[800px] w-[800px] rounded-full blur-[130px] transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.09) 0%, rgba(59, 130, 246, 0.06) 60%, transparent 75%)',
        }}
      />

      {/* Electric cyan center highlight */}
      <div
        className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[100px]"
        style={{
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.11) 0%, rgba(56, 189, 248, 0.04) 55%, transparent 70%)',
        }}
      />

      {/* Dynamic Cursor-Reactive Glow Field */}
      <div
        className="absolute h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] opacity-75 mix-blend-screen transition-opacity duration-300"
        style={{
          left: 'var(--cursor-x, 50vw)',
          top: 'var(--cursor-y, 30vh)',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(14, 165, 233, 0.06) 40%, transparent 70%)',
        }}
      />
    </div>
  );
}
