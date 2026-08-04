import React, { useState, useEffect } from 'react';
import { apiFetch, clearAuthToken } from './lib/api';
import { loadFromStorage, saveToStorage } from './lib/storage';
import {
  Lead,
  Workflow,
  Campaign,
  CallLog,
  Loan,
  VirtualNumber,
  TeamMember,
  OrganizationSettings,
  UserRole
} from './types';

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

// Placeholder shown only until the real org settings arrive from the
// backend (or during signup, before an org exists at all) — deliberately
// empty, never a fake seeded company.
const EMPTY_ORG_SETTINGS: OrganizationSettings = {
  id: '',
  name: '',
  workspaceName: '',
  subscriptionPlan: 'Starter',
  aiMinutesUsed: 0,
  aiMinutesLimit: 0,
  phoneCharges: 0,
  billingPeriodEnd: '',
  apiKeys: []
};

// UI components imports
import Sidebar from './components/Sidebar';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import LeadManagementView from './components/LeadManagementView';
import WorkflowBuilderView from './components/WorkflowBuilderView';
import CampaignView from './components/CampaignView';
import DialerSimulator from './components/DialerSimulator';
import LoanLifecycleView from './components/LoanLifecycleView';
import SettingsView from './components/SettingsView';
import ContactDirectoryView from './components/ContactDirectoryView';
import CompanyProfileView from './components/CompanyProfileView';
import CustomObjectsView from './components/CustomObjectsView';
import UnifiedInboxView from './components/UnifiedInboxView';
import AgentStudioView from './components/AgentStudioView';
import ComplianceView from './components/ComplianceView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import AuditLogView from './components/AuditLogView';
import BillingView from './components/BillingView';

export default function App() {
  // Authentication & Session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadFromStorage<boolean>('chiefx_auth', false)
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    loadFromStorage<CurrentUser | null>('chiefx_user', null)
  );
  const [activeTab, setActiveTab] = useState<string>(() =>
    loadFromStorage<string>('chiefx_tab', 'dashboard')
  );

  // CRM DB states — default to empty, NOT the built-in demo/seed data.
  // These get populated for real from the backend right after login (see
  // the effect below); a fresh browser session should show real empty
  // states, never fabricated leads/calls/etc. that look like this org's
  // own data. loadFromStorage still restores a returning user's last-seen
  // real data if present.
  const [leads, setLeads] = useState<Lead[]>(() =>
    loadFromStorage<Lead[]>('chiefx_leads', [])
  );
  const [workflows, setWorkflows] = useState<Workflow[]>(() =>
    loadFromStorage<Workflow[]>('chiefx_workflows', [])
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(() =>
    loadFromStorage<Campaign[]>('chiefx_campaigns', [])
  );
  const [callLogs, setCallLogs] = useState<CallLog[]>(() =>
    loadFromStorage<CallLog[]>('chiefx_calllogs', [])
  );
  const [loans, setLoans] = useState<Loan[]>(() =>
    loadFromStorage<Loan[]>('chiefx_loans', [])
  );
  const [virtualNumbers, setVirtualNumbers] = useState<VirtualNumber[]>(() =>
    loadFromStorage<VirtualNumber[]>('chiefx_numbers', [])
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    loadFromStorage<TeamMember[]>('chiefx_team', [])
  );
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(() =>
    loadFromStorage<OrganizationSettings>('chiefx_org', EMPTY_ORG_SETTINGS)
  );

  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Load database content once authenticated (every backend CRM route now
  // requires a session — see services/auth.js)
  useEffect(() => {
    if (!isAuthenticated) return;
    setHasLoaded(false);
    const loadBackendData = async () => {
      try {
        const [
          resLeads,
          resWorkflows,
          resCampaigns,
          resCallLogs,
          resLoans,
          resNumbers,
          resTeam,
          resOrg,
          resMe
        ] = await Promise.all([
          apiFetch('/api/leads').then(r => r.json()),
          apiFetch('/api/workflows').then(r => r.json()),
          apiFetch('/api/campaigns').then(r => r.json()),
          apiFetch('/api/call-logs').then(r => r.json()),
          apiFetch('/api/loans').then(r => r.json()),
          apiFetch('/api/settings/numbers').then(r => r.json()),
          apiFetch('/api/settings/team').then(r => r.json()),
          apiFetch('/api/settings/org').then(r => r.json()),
          apiFetch('/api/auth/me').then(r => r.json())
        ]);

        // Trust the backend's answer even when it's an empty array — that's
        // a real, correct "this org has none of these yet," not a signal to
        // keep showing the built-in demo/seed data. The old `.length > 0`
        // guards meant every brand-new org silently displayed the same
        // fake seeded leads/calls/etc. forever, looking like real data that
        // belonged to them. Arrays are only ever swapped out wholesale here
        // (never merged), so an empty real answer must render as empty.
        if (Array.isArray(resLeads)) setLeads(resLeads);
        if (Array.isArray(resWorkflows)) setWorkflows(resWorkflows);
        if (Array.isArray(resCampaigns)) setCampaigns(resCampaigns);
        if (Array.isArray(resCallLogs)) setCallLogs(resCallLogs);
        if (Array.isArray(resLoans)) setLoans(resLoans);
        if (Array.isArray(resNumbers)) setVirtualNumbers(resNumbers);
        if (Array.isArray(resTeam)) setTeamMembers(resTeam);
        if (resOrg && Object.keys(resOrg).length > 0) setOrgSettings(resOrg);
        if (resMe && resMe.user) setCurrentUser(resMe.user);
      } catch (err) {
        console.warn("Failed to fetch backend data, using local fallbacks:", err);
      } finally {
        setHasLoaded(true);
      }
    };
    loadBackendData();
  }, [isAuthenticated]);

  // Synchronization persistence effects
  useEffect(() => {
    saveToStorage('chiefx_auth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    saveToStorage('chiefx_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage('chiefx_tab', activeTab);
  }, [activeTab]);

  // If a non-lending org somehow lands on a lending-only screen (e.g. a
  // stale activeTab restored from a previous session, or the org's
  // industry changed), redirect to the dashboard rather than showing a
  // hidden/irrelevant view.
  useEffect(() => {
    const isLending = !orgSettings.industry || orgSettings.industry === 'lending';
    const lendingOnlyTabs = new Set(['leads', 'contacts', 'campaigns', 'loans']);
    if (!isLending && lendingOnlyTabs.has(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [orgSettings.industry, activeTab]);

  useEffect(() => {
    saveToStorage('chiefx_leads', leads);
    if (hasLoaded) {
      apiFetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leads)
      }).catch(err => console.error("Error syncing leads:", err));
    }
  }, [leads, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_workflows', workflows);
    if (hasLoaded) {
      apiFetch('/api/workflows/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflows)
      }).catch(err => console.error("Error syncing workflows:", err));
    }
  }, [workflows, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_campaigns', campaigns);
    if (hasLoaded) {
      apiFetch('/api/campaigns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaigns)
      }).catch(err => console.error("Error syncing campaigns:", err));
    }
  }, [campaigns, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_calllogs', callLogs);
    if (hasLoaded) {
      apiFetch('/api/call-logs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callLogs)
      }).catch(err => console.error("Error syncing call logs:", err));
    }
  }, [callLogs, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_loans', loans);
    if (hasLoaded) {
      apiFetch('/api/loans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loans)
      }).catch(err => console.error("Error syncing loans:", err));
    }
  }, [loans, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_numbers', virtualNumbers);
    if (hasLoaded) {
      apiFetch('/api/settings/numbers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(virtualNumbers)
      }).catch(err => console.error("Error syncing virtual numbers:", err));
    }
  }, [virtualNumbers, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_team', teamMembers);
    if (hasLoaded) {
      apiFetch('/api/settings/team/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamMembers)
      }).catch(err => console.error("Error syncing team members:", err));
    }
  }, [teamMembers, hasLoaded]);

  useEffect(() => {
    saveToStorage('chiefx_org', orgSettings);
    if (hasLoaded) {
      apiFetch('/api/settings/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgSettings)
      }).catch(err => console.error("Error syncing org settings:", err));
    }
  }, [orgSettings, hasLoaded]);

  // Handle Onboarding Completion
  const handleAuthSuccess = (org: OrganizationSettings) => {
    setOrgSettings(org);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  // Switch workspace content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            leads={leads}
            campaigns={campaigns}
            callLogs={callLogs}
            loans={loans}
            orgSettings={orgSettings}
          />
        );
      case 'leads':
        return (
          <LeadManagementView
            leads={leads}
            setLeads={setLeads}
            callLogs={callLogs}
            teamMembers={teamMembers}
          />
        );
      case 'contacts':
        return (
          <ContactDirectoryView
            leads={leads}
            setLeads={setLeads}
          />
        );
      case 'workflows':
        return (
          <WorkflowBuilderView
            workflows={workflows}
            setWorkflows={setWorkflows}
            leads={leads}
          />
        );
      case 'campaigns':
        return (
          <CampaignView
            campaigns={campaigns}
            setCampaigns={setCampaigns}
            workflows={workflows}
            totalLeadsCount={leads.length}
          />
        );
      case 'dialer':
        return (
          <DialerSimulator
            leads={leads}
            callLogs={callLogs}
            setCallLogs={setCallLogs}
            leadsDatabase={leads}
            setLeadsDatabase={setLeads}
            virtualNumbers={virtualNumbers}
            setVirtualNumbers={setVirtualNumbers}
          />
        );
      case 'loans':
        return (
          <LoanLifecycleView
            loans={loans}
            setLoans={setLoans}
            leads={leads}
            currentUserLabel={currentUser?.name || currentUser?.email || 'Unknown user'}
          />
        );
      case 'objects':
        return <CustomObjectsView />;
      case 'inbox':
        return <UnifiedInboxView />;
      case 'agent-studio':
        return <AgentStudioView />;
      case 'compliance':
        return <ComplianceView />;
      case 'knowledge':
        return <KnowledgeBaseView />;
      case 'audit-log':
        return <AuditLogView />;
      case 'billing':
        return <BillingView />;
      case 'company':
        return (
          <CompanyProfileView
            orgSettings={orgSettings}
            setOrgSettings={setOrgSettings}
          />
        );
      case 'settings':
        return (
          <SettingsView
            virtualNumbers={virtualNumbers}
            setVirtualNumbers={setVirtualNumbers}
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            orgSettings={orgSettings}
            setOrgSettings={setOrgSettings}
          />
        );
      default:
        return (
          <div className="p-8 font-sans">
            <h2 className="text-xl font-bold">Content under active construction</h2>
          </div>
        );
    }
  };

  // Onboarding Gate Routing
  if (!isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} currentOrg={orgSettings} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/50">
      {/* Sidebar Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser?.role ?? null}
        organizationName={orgSettings.name}
        industry={orgSettings.industry}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Global Floating Header */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">workspace:</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded text-blue-600 bg-blue-50">
              {orgSettings.workspaceName}.chief.ai
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400">Representative:</span>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-slate-700">
                {currentUser?.name || currentUser?.email || 'Loading…'}
              </span>
              {currentUser?.role && (
                <span className="text-[9px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {currentUser.role}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                clearAuthToken();
                setIsAuthenticated(false);
                setCurrentUser(null);
                saveToStorage('chiefx_auth', false);
                saveToStorage('chiefx_user', null);
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Selected Dashboard view content container */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
