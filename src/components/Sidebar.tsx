import React from 'react';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  PhoneCall,
  Volume2,
  FileSpreadsheet,
  Settings,
  Shield,
  Briefcase,
  Layers,
  CircleDot,
  Contact,
  Building2,
  Boxes,
  Inbox,
  Sparkles,
  ShieldBan,
  BookOpen,
  ScrollText,
  CreditCard,
  History,
  MessageCircleQuestion,
  BarChart3
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole | null;
  organizationName: string;
  industry: string;
}

// Lending-specific screens (the original hardcoded Lead/Loan/Campaign
// system in db.js) — only relevant for orgs on the "lending" vertical.
const LENDING_ONLY_TAB_IDS = new Set(['leads', 'campaigns', 'loans']);

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  organizationName,
  industry
}: SidebarProps) {
  const isLending = !industry || industry === 'lending';

  // Sidebar header tagline — was hardcoded "Loan CRM Platform" for every
  // org regardless of industry. Real per-industry labels, matching
  // industryPacks.js's listIndustries() naming.
  const INDUSTRY_TAGLINES: Record<string, string> = {
    lending: 'Loan CRM Platform',
    real_estate: 'Real Estate CRM Platform',
    healthcare: 'Healthcare CRM Platform',
    education: 'Education CRM Platform',
    ecommerce: 'E-commerce CRM Platform',
    automotive: 'Automotive CRM Platform',
    field_services: 'Field Services CRM Platform',
    it_sales: 'IT Sales CRM Platform'
  };
  const tagline = INDUSTRY_TAGLINES[industry] || 'AI CRM Platform';

  const allMenuItems = [
    { id: 'dashboard', label: 'Executive Desk', icon: LayoutDashboard },
    { id: 'leads', label: 'Lead CRM', icon: Users },
    { id: 'contacts', label: 'Contact Directory', icon: Contact },
    // Disabled for now (not yet configured/used) — uncomment to re-enable.
    // { id: 'workflows', label: 'Workflow Builder', icon: GitBranch },
    { id: 'campaigns', label: 'AI Campaigns', icon: Briefcase },
    { id: 'dialer', label: 'Voice Simulator', icon: PhoneCall },
    { id: 'call-logs', label: 'Call Logs', icon: History },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'inbox', label: 'Unified Inbox', icon: Inbox },
    { id: 'agent-studio', label: 'Agent Studio', icon: Sparkles },
    { id: 'compliance', label: 'Compliance', icon: ShieldBan },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'enquiries', label: 'Enquiries', icon: MessageCircleQuestion },
    { id: 'audit-log', label: 'Audit Log', icon: ScrollText },
    { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
    { id: 'loans', label: 'Loan Lifecycle', icon: Layers },
    { id: 'objects', label: 'Contacts', icon: Boxes },
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'settings', label: 'Administration', icon: Settings }
  ];

  // "Contact Directory" now works for every industry — non-lending orgs'
  // contacts are their real Industry Objects records, bridged into the
  // same `leads` state (see src/lib/objectContacts.ts). The separate
  // "Contacts" (objects) tab is retired so there's one contact list, not
  // two screens showing the same underlying data.
  const menuItems = allMenuItems.filter((item) => {
    if (item.id === 'objects') return false;
    if (LENDING_ONLY_TAB_IDS.has(item.id)) return isLending;
    return true;
  });

  return (
    <aside id="sidebar-container" className="w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 h-screen shrink-0 font-sans">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg bg-blue-600 shadow-blue-600/20 text-white">
            <Layers className="h-5.5 w-5.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold font-display tracking-tight leading-none text-slate-900 truncate">{organizationName || 'ChiefXAI'}</h1>
            <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">
              {tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Organization Badge */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-700 truncate max-w-[150px]">🏢 {organizationName}</span>
        <div className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workspace</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Real, backend-enforced role — read-only, no client-side simulation */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold mb-2">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span>Signed in as</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
            Role: <strong className="text-blue-700 font-semibold">{userRole || 'Unknown'}</strong>
          </span>
        </div>
      </div>
    </aside>
  );
}
