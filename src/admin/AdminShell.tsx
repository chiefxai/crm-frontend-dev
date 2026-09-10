import React from 'react';
import { Globe2, LayoutDashboard, Building2, Users, PhoneCall, ScrollText, LogOut, Settings } from 'lucide-react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import OverviewPage from './OverviewPage';
import OrganizationsPage from './OrganizationsPage';
import UsersPage from './UsersPage';
import CallsPage from './CallsPage';
import ActivityPage from './ActivityPage';
import SettingsPage from './SettingsPage';

const NAV: { path: string; label: string; icon: React.ElementType }[] = [
  { path: 'overview',       label: 'Overview',           icon: LayoutDashboard },
  { path: 'organizations',  label: 'Organizations',      icon: Building2 },
  { path: 'users',          label: 'Users',              icon: Users },
  { path: 'calls',          label: 'Calls & Recordings', icon: PhoneCall },
  { path: 'activity',       label: 'Activity',           icon: ScrollText },
  { path: 'settings',       label: 'Pricing & Features', icon: Settings },
];

export default function AdminShell({ email, onLogout }: { email: string; onLogout: () => void }) {
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
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              className={({ isActive }) =>
                `w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 mr-3" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 text-xs text-slate-500 truncate">{email}</div>
          <button onClick={onLogout} className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-200">
            <LogOut className="h-4 w-4 mr-3" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"      element={<PageWrap title="Overview"><OverviewPage /></PageWrap>} />
          <Route path="organizations" element={<PageWrap title="Organizations"><OrganizationsPage /></PageWrap>} />
          <Route path="users"         element={<PageWrap title="Users"><UsersPage /></PageWrap>} />
          <Route path="calls"         element={<PageWrap title="Calls & Recordings"><CallsPage /></PageWrap>} />
          <Route path="activity"      element={<PageWrap title="Activity"><ActivityPage /></PageWrap>} />
          <Route path="settings"      element={<PageWrap title="Pricing & Features"><SettingsPage /></PageWrap>} />
          <Route path="*"             element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PageWrap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>
      <div className="p-8">{children}</div>
    </>
  );
}
