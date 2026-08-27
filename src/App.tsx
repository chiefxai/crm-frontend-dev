import React, { useState, useEffect } from 'react';
import { apiFetch, clearAuthToken, getAuthToken, getApiBase } from './lib/api';
import { loadFromStorage, saveToStorage } from './lib/storage';
import { recordToLead, leadToRecordPatch, leadToRecordCreate } from './lib/objectContacts';
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
import CallLogsView from './components/CallLogsView';
import CompanyProfileView from './components/CompanyProfileView';
import CustomObjectsView from './components/CustomObjectsView';
import UnifiedInboxView from './components/UnifiedInboxView';
import AgentStudioView from './components/AgentStudioView';
import ComplianceView from './components/ComplianceView';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import AuditLogView from './components/AuditLogView';
import EnquiriesView from './components/EnquiriesView';
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
  const [dialerTasks, setDialerTasks] = useState<any[]>(() =>
    loadFromStorage<any[]>('chiefx_dialer_tasks', [])
  );
  // Non-lending orgs have no `leads` table rows at all — their real
  // contacts live as Industry Objects records instead. When set, `leads`
  // is populated from this object's records (mapped via
  // lib/objectContacts.ts) and synced back to it instead of /api/leads,
  // so the Voice Simulator (and anything else reading `leads`) has real
  // data to work with for every industry, not just lending.
  const [primaryObject, setPrimaryObject] = useState<{ key: string; stages: { id: string; key: string; label: string }[]; fields: { id: string; key: string; label: string; type: string; required?: boolean }[] } | null>(null);

  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Live call notifications — set when a real inbound/outbound call is in
  // progress (from the org-scoped /api/logs-stream SSE connection below),
  // cleared when it completes. Not a simulation: this only fires for real
  // Twilio/Vobiz call events from server.js/vobizProxy.js/twilioProxy.js.
  const [liveCallBanner, setLiveCallBanner] = useState<{ message: string; startedAt: number } | null>(null);

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
          resMe,
          resDialerTasks
        ] = await Promise.all([
          apiFetch('/api/leads').then(r => r.json()),
          apiFetch('/api/workflows').then(r => r.json()),
          apiFetch('/api/campaigns').then(r => r.json()),
          apiFetch('/api/call-logs').then(r => r.json()),
          apiFetch('/api/loans').then(r => r.json()),
          apiFetch('/api/settings/numbers').then(r => r.json()),
          apiFetch('/api/settings/team').then(r => r.json()),
          apiFetch('/api/settings/org').then(r => r.json()),
          apiFetch('/api/auth/me').then(r => r.json()),
          // Falls back to [] rather than reject the whole Promise.all if a
          // not-yet-restarted backend doesn't have this route yet, so a
          // missing route can't silently block every other tab's real data.
          apiFetch('/api/dialer-tasks').then(r => r.json()).catch(() => [])
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
        // Merge over EMPTY_ORG_SETTINGS rather than replacing wholesale —
        // the backend only returns fields that were ever explicitly set on
        // this org, so a freshly created/consolidated org can omit e.g.
        // phoneCharges/apiKeys entirely, and SettingsView calls
        // .toFixed()/.map() on those unconditionally.
        if (resOrg && Object.keys(resOrg).length > 0) setOrgSettings({ ...EMPTY_ORG_SETTINGS, ...resOrg });
        if (resMe && resMe.user) setCurrentUser(resMe.user);
        if (Array.isArray(resDialerTasks)) setDialerTasks(resDialerTasks);

        // Non-lending org: bridge its real Industry Objects records into
        // `leads` instead of leaving it permanently empty (resLeads above
        // is always [] for these orgs — the leads table is lending-only).
        const industry = (resOrg && resOrg.industry) || orgSettings.industry;
        if (industry && industry !== 'lending') {
          try {
            const objects = await apiFetch('/api/objects').then(r => r.json());
            const primary = Array.isArray(objects) ? objects[0] : null;
            if (primary) {
              const records = await apiFetch(`/api/objects/${primary.key}/records`).then(r => r.json());
              setLeads(Array.isArray(records) ? records.map((r: any) => recordToLead(r, primary.stages)) : []);
              setPrimaryObject({ key: primary.key, stages: primary.stages, fields: primary.fields || [] });
            }
          } catch (err) {
            console.warn("Failed to load Industry Objects records:", err);
          }
        } else {
          setPrimaryObject(null);
        }
      } catch (err) {
        console.warn("Failed to fetch backend data, using local fallbacks:", err);
      } finally {
        setHasLoaded(true);
      }
    };
    loadBackendData();
  }, [isAuthenticated]);

  // Live call events — real inbound/outbound calls only, org-scoped server
  // side (see server.js's broadcastLog + /api/logs-stream). Shows a banner
  // while a call is in progress and pushes completed calls straight into
  // `callLogs` state as they finish, without waiting for a page refresh.
  useEffect(() => {
    if (!isAuthenticated || !hasLoaded) return;
    const token = getAuthToken();
    if (!token) return;

    const source = new EventSource(`${getApiBase()}/api/logs-stream?token=${encodeURIComponent(token)}`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'call_started') {
          setLiveCallBanner({ message: `Incoming call from ${data.callerNumber || 'unknown number'}…`, startedAt: Date.now() });
        } else if (data.type === 'call_completed') {
          setLiveCallBanner(null);
          if (data.callLog) {
            setCallLogs((prev) => [data.callLog, ...prev]);
          }
        }
      } catch {
        // non-JSON keepalive/init messages — ignore
      }
    };
    source.onerror = () => {
      // EventSource auto-reconnects on its own; nothing to do here beyond
      // not crashing the app if the tunnel/backend is briefly unreachable.
    };
    return () => source.close();
  }, [isAuthenticated, hasLoaded]);

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
    const lendingOnlyTabs = new Set(['leads', 'campaigns', 'loans']);
    // "objects" (the old separate "Contacts" tab) is retired — Contact
    // Directory covers every industry now — so redirect away from it too
    // if a stale activeTab from before this change is still pointing there.
    if ((!isLending && lendingOnlyTabs.has(activeTab)) || activeTab === 'objects') {
      setActiveTab('dashboard');
    }
  }, [orgSettings.industry, activeTab]);

  useEffect(() => {
    saveToStorage('chiefx_leads', leads);
    if (!hasLoaded) return;
    if (primaryObject) {
      // Non-lending org — `leads` here are really Industry Objects
      // records (see the load effect above). Patch each one back to its
      // real record instead of /api/leads/sync, which would write into
      // the (unused, for this org) lending leads table.
      leads.forEach((lead) => {
        // Contacts added via LeadManagementView/CSV import get a
        // client-generated "L-<n>" id (see handleAddLead) that was never
        // a real object_records row — PATCHing that id 404s silently, so
        // the new contact only ever lived in local/localStorage state and
        // never actually reached the database. Create it for real first,
        // then swap in the record's actual id so every later edit PATCHes
        // correctly.
        if (lead.id.startsWith('L-')) {
          apiFetch(`/api/objects/${primaryObject.key}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadToRecordCreate(lead, primaryObject.fields))
          })
            .then(r => r.json())
            .then(record => {
              if (record?.id) {
                setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, id: record.id } : l)));
              }
            })
            .catch(err => console.error("Error creating object record:", err));
        } else {
          apiFetch(`/api/objects/${primaryObject.key}/records/${lead.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadToRecordPatch(lead, primaryObject.stages))
          }).catch(err => console.error("Error syncing object record:", err));
        }
      });
    } else {
      apiFetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leads)
      }).catch(err => console.error("Error syncing leads:", err));
    }
  }, [leads, hasLoaded, primaryObject]);

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
    saveToStorage('chiefx_dialer_tasks', dialerTasks);
    if (hasLoaded) {
      apiFetch('/api/dialer-tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dialerTasks)
      }).catch(err => console.error("Error syncing dialer tasks:", err));
    }
  }, [dialerTasks, hasLoaded]);

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
      }).then(async (res) => {
        if (res.ok) return;
        // A number already owned by another org gets rejected here — the
        // Connect button that triggered this only checked the channels-
        // connect response, not this sync, so without surfacing the error
        // and re-pulling server truth the UI kept showing the rejected
        // number as if it had actually saved.
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to save virtual number(s) — reverting to last saved state.');
        const fresh = await apiFetch('/api/settings/numbers').then((r) => r.json()).catch(() => null);
        if (Array.isArray(fresh)) setVirtualNumbers(fresh);
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
    setOrgSettings({ ...EMPTY_ORG_SETTINGS, ...org });
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
            industry={orgSettings.industry}
          />
        );
      case 'call-logs':
        return <CallLogsView callLogs={callLogs} />;
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
            tasks={dialerTasks}
            setTasks={setDialerTasks}
            companyName={orgSettings.workspaceName}
            teamMembers={teamMembers}
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
      case 'enquiries':
        return <EnquiriesView />;
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
        {liveCallBanner && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
            {liveCallBanner.message}
          </div>
        )}
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
