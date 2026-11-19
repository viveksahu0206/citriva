'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Files,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  GitCompare,
  Search,
  AlertOctagon,
  MapPin,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload Manuscript', icon: UploadCloud },
  { href: '/dashboard/documents', label: 'Documents', icon: Files },
  { href: '/dashboard/reports', label: 'Audit Reports', icon: BarChart3 },
];

const FEATURES = [
  {
    title: '1. Cross-Reference',
    desc: 'Multi-paper consensus',
    icon: GitCompare,
    badge: 'Consensus',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    title: '2. Research Gap',
    desc: 'Experimental scope check',
    icon: Search,
    badge: 'Scope',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    title: '3. Overclaim Audit',
    desc: 'Statistical hyperbole',
    icon: AlertOctagon,
    badge: 'NLI',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    title: '4. Evidence Trace',
    desc: 'Verbatim character quotes',
    icon: MapPin,
    badge: 'Grounding',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
];

export default function Sidebar({
  open,
  onClose,
  userLabel,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  userLabel: string;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          'glass fixed inset-y-3 left-3 z-40 flex w-72 flex-col p-4 transition-transform duration-300 border-blue-200 bg-white/95 shadow-xl lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:translate-x-0 overflow-y-auto',
          open ? 'translate-x-0' : '-translate-x-[110%]',
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <Brand href="/dashboard" />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 📍 HIGHLIGHTED LEFT DOCK FEATURES */}
        <div className="mb-5 rounded-2xl border-2 border-blue-300 bg-gradient-to-b from-blue-50/90 to-white p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-900">
                Core Features
              </span>
            </div>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800">
              4 Active
            </span>
          </div>

          <div className="space-y-1.5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-2 rounded-xl border border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('p-1.5 rounded-lg border text-xs', feat.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                        {feat.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {feat.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Dashboard views">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold block px-2 mb-1.5">
            Workspace Nav
          </span>
          {NAV.map((item) => {
            const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
                  active
                    ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-sm'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-blue-100 pt-3 mt-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Return to Homepage
          </Link>

          <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-300 bg-white text-blue-700 shadow-xs">
              <UserCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900" title={userLabel}>
                {userLabel}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-blue-800 font-semibold">
                  Auditor Mode
                </span>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
