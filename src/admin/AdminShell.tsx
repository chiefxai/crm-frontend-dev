import React, { useState } from 'react';
import { Globe2, LayoutDashboard, Building2, Users, PhoneCall, ScrollText, LogOut, Settings } from 'lucide-react';
import OverviewPage from './OverviewPage';
import OrganizationsPage from './OrganizationsPage';
import UsersPage from './UsersPage';
import CallsPage from './CallsPage';
import ActivityPage from './ActivityPage';
import SettingsPage from './SettingsPage';

type Page = 'overview' | 'organizations' | 'users' | 'calls' | 'activity' | 'settings';

const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'calls', label: 'Calls & Recordings', icon: PhoneCall },
  { id: 'activity', label: 'Activity', icon: ScrollText },
  { id: 'settings', label: 'Pricing & Features', icon: Settings }
];

const PAGE_TITLES: Record<Page, string> = {
  overview: 'Overview',
  organizations: 'Organizations',
  users: 'Users',
  calls: 'Calls & Recordings',
  activity: 'Activity',
  settings: 'Pricing & Features'
};

export default function AdminShell({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('overview');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      <aside className="w-60 bg-slate-950 text-slate-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Globe2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">ChiefXAI</div>
            <div className="text-[9px] text-amber-500 uppercase tracking-widest mt-0.5">Platform Admin</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 text-xs text-slate-500 truncate">{email}</div>
          <button onClick={onLogout} className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-200">
            <LogOut className="h-4 w-4 mr-3" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-800">{PAGE_TITLES[page]}</h1>
        </div>
        <div className="p-8">
          {page === 'overview' && <OverviewPage />}
          {page === 'organizations' && <OrganizationsPage />}
          {page === 'users' && <UsersPage />}
          {page === 'calls' && <CallsPage />}
          {page === 'activity' && <ActivityPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
