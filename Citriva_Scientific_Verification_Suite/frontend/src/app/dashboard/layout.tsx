'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardProvider from '@/components/dashboard/DashboardProvider';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import ReportDrawer from '@/components/dashboard/ReportDrawer';
import { useSession } from '@/lib/useSession';
import { signOut } from '@/lib/supabase';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userLabel = user?.email || 'Dr. Researcher (Workspace)';

  async function handleSignOut() {
    await signOut().catch(() => {});
    router.push('/');
  }

  return (
    <div className="flex min-h-screen bg-[#030914] text-[#f0f9ff]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userLabel={userLabel}
        onSignOut={handleSignOut}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <ReportDrawer />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
