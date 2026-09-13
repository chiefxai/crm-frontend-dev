import React, { useState, useEffect } from 'react';
import {
  Settings,
  Phone,
  Users,
  CreditCard,
  Key,
  Trash2,
  CheckCircle,
  FileText,
  Clock,
  Shield,
  Activity,
  UserPlus,
  DollarSign,
  Briefcase,
  Loader2,
  Flag,
  Hash,
  ScrollText,
  Plus,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useRefresh } from '../lib/RefreshContext';
import { VirtualNumber, TeamMember, OrganizationSettings, UserRole } from '../types';
import { COST_PER_MINUTE_INR_FALLBACK, formatInr } from '../lib/pricing';
import { FEATURE_REGISTRY } from '../features/feature-flags/registry';
import FlagGroupPicker from './ui/FlagGroupPicker';
import IconButton from './ui/IconButton';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Modal from './ui/Modal';
import DataTable, { Column } from './ui/DataTable';

interface SettingsViewProps {
  virtualNumbers: VirtualNumber[];
  setVirtualNumbers: React.Dispatch<React.SetStateAction<VirtualNumber[]>>;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  orgSettings: OrganizationSettings;
  setOrgSettings: React.Dispatch<React.SetStateAction<OrganizationSettings>>;
  costPerMinuteInr?: number;
  activeSubTab?: 'numbers' | 'team' | 'billing' | 'api';
  setActiveSubTab?: (sub: string) => void;
  currentUserEmail?: string;
}

interface AuditEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function ProviderBadge({ provider }: { provider: string }) {
  const p = (provider || '').toLowerCase();
  if (p === 'twilio') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <svg viewBox="0 0 60 60" className="h-3 w-3 shrink-0" fill="none"><circle cx="30" cy="30" r="30" fill="#F22F46"/><circle cx="30" cy="18" r="5" fill="white"/><circle cx="30" cy="42" r="5" fill="white"/><circle cx="18" cy="30" r="5" fill="white"/><circle cx="42" cy="30" r="5" fill="white"/></svg>
        Twilio
      </span>
    );
  }
  if (p === 'vobiz.ai' || p === 'vobiz') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
        <span className="h-3 w-3 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-[8px] shrink-0">V</span>
        Vobiz.ai
      </span>
    );
  }
  if (p === 'telecmi') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
        <span className="h-3 w-3 rounded bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-[8px] shrink-0">T</span>
        TeleCMI
      </span>
    );
  }
  return <span className="text-xs font-mono text-slate-500">{provider}</span>;
}

export default function SettingsView({
  virtualNumbers,
  setVirtualNumbers,
  teamMembers,
  setTeamMembers,
  orgSettings,
  setOrgSettings,
  costPerMinuteInr = COST_PER_MINUTE_INR_FALLBACK,
  activeSubTab: activeSubTabProp,
  setActiveSubTab: setActiveSubTabProp,
  currentUserEmail,
}: SettingsViewProps) {
  // Use prop-controlled sub-tab when provided (driven by sidebar), fall back to internal state.
  const [_internalSubTab, _setInternalSubTab] = useState<'numbers' | 'team' | 'billing' | 'api'>('numbers');
  const subTab = (activeSubTabProp as 'numbers' | 'team' | 'billing' | 'api') || _internalSubTab;
  const setSubTab = (v: 'numbers' | 'team' | 'billing' | 'api') => {
    _setInternalSubTab(v);
    setActiveSubTabProp?.(v);
  };

  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const loadAuditLogs = () => {
    apiFetch('/api/audit-log')
      .then((r) => r.json())
      .then((list: AuditEntry[]) => setAuditLogs(Array.isArray(list) ? list : []))
      .catch(() => setAuditLogs([]));
  };
  useEffect(() => {
    if (subTab === 'api') loadAuditLogs();
  }, [subTab]);


  // Per-org telephony credentials — lets this org use its own Twilio/Vobiz
  // account for real outbound calls instead of the single shared account
  // configured in the server's .env. See services/channelsRoutes.js
  // (POST /api/channels/twilio, /api/channels/vobiz) and how server.js's
  // /api/twilio/call and /api/vobiz/call prefer these when connected.
  // Connecting an account and registering its number as a dialable virtual
  // line used to be two separate steps (connect credentials, then "Provision
  // Virtual Call-center Line" for the same number) — combined into one
  // action here since the common case is exactly one number per account.
  const [connectProvider, setConnectProvider] = useState<'twilio' | 'vobiz' | 'telecmi'>('twilio');
  const [connectedChannels, setConnectedChannels] = useState<{ type: string; externalId: string; config: any }[]>([]);
  const loadChannels = () => {
    apiFetch('/api/channels').then((r) => r.json()).then((list) => setConnectedChannels(Array.isArray(list) ? list : [])).catch(() => {});
  };
  useEffect(() => {
    if (subTab === 'numbers') loadChannels();
  }, [subTab]);

  // Adds/updates the virtual-number entry for a just-connected number so it
  // shows up in the numbers list and the Voice Simulator's dial dropdown
  // without a separate "provision" step.
  const upsertVirtualNumber = (number: string, friendlyName: string, provider: 'Twilio' | 'Vobiz.ai' | 'TeleCMI') => {
    const existing = virtualNumbers.find((n) => n.number === number);
    if (existing) {
      setVirtualNumbers(virtualNumbers.map((n) => n.number === number ? { ...n, friendlyName, provider, status: 'Active' } : n));
    } else {
      setVirtualNumbers([...virtualNumbers, {
        // Was `VN-${400 + virtualNumbers.length + 1}` — collided across
        // orgs (the id column is a global PK, not per-org) and even within
        // one org whenever the local list was stale, causing the sync's
        // insert to fail with a duplicate-key error and silently revert
        // the number the user just added. Crypto-random suffix instead.
        id: `VN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        number, provider, status: 'Active', friendlyName,
        routingUrl: 'https://api.chiefxai.com/voice/webhook-dynamic',
        incomingCallCount: 0, outgoingCallCount: 0
      }]);
    }
  };

  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [twilioLabel, setTwilioLabel] = useState('');
  const [savingTwilio, setSavingTwilio] = useState(false);
  const handleConnectTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioSid.trim() || !twilioToken.trim() || !twilioPhone.trim()) return;
    setSavingTwilio(true);
    try {
      const res = await apiFetch('/api/channels/twilio', {
        method: 'POST',
        body: JSON.stringify({ accountSid: twilioSid.trim(), authToken: twilioToken.trim(), phoneNumber: twilioPhone.trim() })
      });
      if (res.ok) {
        upsertVirtualNumber(twilioPhone.trim(), twilioLabel.trim() || 'Twilio Line', 'Twilio');
        setTwilioSid(''); setTwilioToken(''); setTwilioPhone(''); setTwilioLabel('');
        loadChannels();
      } else {
        alert((await res.json()).error || 'Failed to connect Twilio account');
      }
    } catch {
      alert('Network error — check your connection.');
    } finally {
      setSavingTwilio(false);
    }
  };

  const [vobizAuthId, setVobizAuthId] = useState('');
  const [vobizToken, setVobizToken] = useState('');
  const [vobizPhone, setVobizPhone] = useState('');
  const [vobizLabel, setVobizLabel] = useState('');
  const [savingVobiz, setSavingVobiz] = useState(false);
  const handleConnectVobiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vobizAuthId.trim() || !vobizToken.trim() || !vobizPhone.trim()) return;
    setSavingVobiz(true);
    try {
      const res = await apiFetch('/api/channels/vobiz', {
        method: 'POST',
        body: JSON.stringify({ authId: vobizAuthId.trim(), authToken: vobizToken.trim(), phoneNumber: vobizPhone.trim() })
      });
      if (res.ok) {
        upsertVirtualNumber(vobizPhone.trim(), vobizLabel.trim() || 'Vobiz.ai Line', 'Vobiz.ai');
        setVobizAuthId(''); setVobizToken(''); setVobizPhone(''); setVobizLabel('');
        loadChannels();
      } else {
        alert((await res.json()).error || 'Failed to connect Vobiz.ai account');
      }
    } catch {
      alert('Network error — check your connection.');
    } finally {
      setSavingVobiz(false);
    }
  };

  const [telecmiAppId, setTelecmiAppId] = useState('');
  const [telecmiSecret, setTelecmiSecret] = useState('');
  const [telecmiPhone, setTelecmiPhone] = useState('');
  const [telecmiLabel, setTelecmiLabel] = useState('');
  const [savingTelecmi, setSavingTelecmi] = useState(false);
  const handleConnectTelecmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telecmiAppId.trim() || !telecmiSecret.trim() || !telecmiPhone.trim()) return;
    setSavingTelecmi(true);
    try {
      const res = await apiFetch('/api/channels/piopiy', {
        method: 'POST',
        body: JSON.stringify({ appId: telecmiAppId.trim(), appSecret: telecmiSecret.trim(), phoneNumber: telecmiPhone.trim() })
      });
      if (res.ok) {
        upsertVirtualNumber(telecmiPhone.trim(), telecmiLabel.trim() || 'TeleCMI Line', 'TeleCMI');
        setTelecmiAppId(''); setTelecmiSecret(''); setTelecmiPhone(''); setTelecmiLabel('');
        loadChannels();
      } else {
        alert((await res.json()).error || 'Failed to connect TeleCMI account');
      }
    } catch {
      alert('Network error — check your connection.');
    } finally {
      setSavingTelecmi(false);
    }
  };

  // Disconnects the org's own Twilio/Vobiz account — separate from
  // deleting a virtual_numbers row (handleDeleteNumber above). Without
  // this, the actual credentials outbound calls fall back to
  // (channelsEngine.getChannel) stayed connected forever, so a "deleted"
  // number kept showing "Connected: <number>" on this card and kept being
  // used to place calls.
  const [disconnectingChannel, setDisconnectingChannel] = useState<string | null>(null);
  const handleDisconnectChannel = async (type: 'twilio' | 'vobiz') => {
    setDisconnectingChannel(type);
    try {
      const res = await apiFetch(`/api/channels/${type}`, { method: 'DELETE' });
      if (res.ok) {
        setConnectedChannels(connectedChannels.filter((c) => c.type !== type));
      } else {
        alert((await res.json().catch(() => ({}))).error || `Failed to disconnect ${type}.`);
      }
    } finally {
      setDisconnectingChannel(null);
    }
  };

  const twilioChannel = connectedChannels.find((c) => c.type === 'twilio');
  const vobizChannel = connectedChannels.find((c) => c.type === 'vobiz');
  const telecmiChannel = connectedChannels.find((c) => c.type === 'piopiy');

  // Org-level allowed feature flags (set by super admin at org creation)
  const [orgAllowedFlags, setOrgAllowedFlags] = useState<string[]>([]);
  useEffect(() => {
    if (subTab !== 'team') return;
    apiFetch('/api/settings/org')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data?.featureFlags)) setOrgAllowedFlags(data.featureFlags); })
      .catch(() => {});
  }, [subTab]);

  // Team Member states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Loan Agent');
  const [newStaffFeatures, setNewStaffFeatures] = useState<string[]>([]);
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffAddMsg, setStaffAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Feature flag editing for existing team members
  const [editFlagsFor, setEditFlagsFor] = useState<string | null>(null); // member id
  const [editFlagsValue, setEditFlagsValue] = useState<string[]>([]);
  const [savingFlags, setSavingFlags] = useState(false);

  const openFlagEditor = (member: TeamMember) => {
    setEditFlagsFor(member.id);
    setEditFlagsValue(member.featureFlags || []);
  };

  const handleSaveFlags = async (memberId: string) => {
    setSavingFlags(true);
    try {
      const res = await apiFetch(`/api/settings/team/${memberId}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags: editFlagsValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to update feature flags');
        return;
      }
      const updated = await res.json();
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, featureFlags: updated.featureFlags || editFlagsValue } : m));
      setEditFlagsFor(null);
    } catch {
      alert('Could not reach the server');
    } finally {
      setSavingFlags(false);
    }
  };

  // Delete virtual line — calls the dedicated DELETE route directly instead
  // of relying on the whole-array /api/settings/numbers/sync effect, since
  // deleting the LAST remaining number sends an empty array that's
  // indistinguishable from a sync bug and gets silently ignored by
  // db.replaceAll's own guard against accidental data wipes.
  const handleDeleteNumber = async (numId: string) => {
    const previous = virtualNumbers;
    setVirtualNumbers(virtualNumbers.filter((n) => n.id !== numId));
    try {
      const res = await apiFetch(`/api/settings/numbers/${encodeURIComponent(numId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || 'Failed to delete number.');
        setVirtualNumbers(previous);
      }
    } catch (err) {
      alert('Failed to delete number — check your connection and try again.');
      setVirtualNumbers(previous);
    }
  };

  // Add Staff Member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    setAddingStaff(true);
    setStaffAddMsg(null);
    try {
      const res = await apiFetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          phone: newStaffPhone || undefined,
          role: newStaffRole,
          featureFlags: newStaffFeatures,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffAddMsg({ type: 'error', text: data.error || 'Failed to add member' });
        return;
      }
      setTeamMembers((prev) => [...prev, data]);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffFeatures([]);
      setStaffAddMsg({
        type: 'success',
        text: data.credsSent
          ? `${newStaffName} added — credentials sent to ${newStaffEmail}`
          : `${newStaffName} added successfully`,
      });
    } catch {
      setStaffAddMsg({ type: 'error', text: 'Could not reach the server' });
    } finally {
      setAddingStaff(false);
    }
  };

  const toggleFeature = (key: string) =>
    setNewStaffFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  // Remove staff member permanently
  const handleRemoveStaff = async (staffId: string, name: string, memberEmail: string, memberRole: string) => {
    const isSelf = currentUserEmail && memberEmail.toLowerCase() === currentUserEmail.toLowerCase();
    if (isSelf && memberRole === 'Organization Admin') {
      alert(
        `You cannot remove yourself as Org Admin.\n\nTo leave: first reassign the "Organization Admin" role to another team member, then ask them to remove your account.`
      );
      return;
    }
    if (!window.confirm(`Remove ${name} from the team? This cannot be undone.`)) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== staffId));
    apiFetch(`/api/settings/team/${staffId}`, { method: 'DELETE' })
      .catch((err) => console.error('Failed to remove staff member:', err));
  };

  // Deactivate Staff member — optimistic local update + immediate PATCH to backend
  const handleToggleStaffStatus = (staffId: string) => {
    const updated = teamMembers.map((m) => {
      if (m.id === staffId) {
        return {
          ...m,
          status: m.status === 'Active' ? ('Inactive' as const) : ('Active' as const)
        };
      }
      return m;
    });
    setTeamMembers(updated);
    const member = updated.find(m => m.id === staffId);
    if (member) {
      apiFetch(`/api/settings/team/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: member.status }),
      }).catch(err => console.error('Failed to update staff status:', err));
    }
  };

  const globalRefresh = useRefresh();
  const handlePageRefresh = () => {
    if (subTab === 'numbers') loadChannels();
    else if (subTab === 'api') loadAuditLogs();
    globalRefresh?.();
  };

  return (
    <PageShell title="Administration" subtitle="Configure virtual telephone lines, distribute agent permissions, and manage security settings." onRefresh={handlePageRefresh}>
      <div className="col-span-12 space-y-6">

          {/* Subtab: Virtual numbers */}
          {subTab === 'numbers' && (
            <div className="space-y-6">
              <Widget
                title="Virtual Numbers"
                subtitle="Telephone lines connected to this organization's AI calling infrastructure."
                icon={Hash}
                accent="#6366f1"
                padding="none"
                action={
                  <button
                    onClick={() => setShowProviderForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Provider
                  </button>
                }
              >
                {virtualNumbers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                      <Phone className="h-5 w-5 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No virtual numbers yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Click "Add Provider" to connect your Twilio or Vobiz.ai account and provision your first virtual line.</p>
                  </div>
                ) : (() => {
                  const columns: Column<VirtualNumber>[] = [
                    {
                      key: 'number',
                      header: 'Telephone Number',
                      cell: (num) => (
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Phone className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-[var(--text-primary)]">{num.number}</p>
                            {num.friendlyName && <p className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-0.5">{num.friendlyName}</p>}
                          </div>
                        </div>
                      ),
                    },
                    { key: 'provider', header: 'Gateway Provider', cell: (num) => <ProviderBadge provider={num.provider} /> },
                    { key: 'load', header: 'Dial Load (In / Out)', cell: (num) => <span className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">{num.incomingCallCount} in / {num.outgoingCallCount} out</span> },
                    {
                      key: 'status',
                      header: 'Status',
                      align: 'right',
                      cell: (num) => (
                        <div className="flex items-center justify-end gap-3">
                          {num.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[var(--bg-subtle)] text-slate-500 dark:text-[var(--text-muted)] border border-slate-200 dark:border-[var(--border)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                          <button onClick={() => handleDeleteNumber(num.id)} className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Delete number">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ),
                    },
                  ];
                  return (
                    <DataTable
                      bare
                      resizable
                      paginated
                      columns={columns}
                      rows={virtualNumbers}
                      rowKey={(num) => num.id}
                    />
                  );
                })()}
              </Widget>

              {/* Add Provider overlay modal */}
              {showProviderForm && (
                <Modal
                  open
                  onClose={() => setShowProviderForm(false)}
                  title="Add Virtual Number"
                  subtitle="Choose your telephony provider and enter your credentials to register a virtual number."
                  maxWidth="max-w-lg"
                >
                  <div className="space-y-5">
                    {/* Provider selector */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Select Provider</p>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          {
                            id: 'twilio',
                            label: 'Twilio',
                            connected: !!twilioChannel,
                            selectedBg: 'bg-red-50 border-red-400',
                            logo: (
                              <svg viewBox="0 0 60 60" className="h-8 w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="30" cy="30" r="30" fill="#F22F46"/>
                                <circle cx="30" cy="18" r="5" fill="white"/>
                                <circle cx="30" cy="42" r="5" fill="white"/>
                                <circle cx="18" cy="30" r="5" fill="white"/>
                                <circle cx="42" cy="30" r="5" fill="white"/>
                              </svg>
                            ),
                          },
                          {
                            id: 'vobiz',
                            label: 'Vobiz.ai',
                            connected: !!vobizChannel,
                            selectedBg: 'bg-purple-50 border-purple-400',
                            logo: (
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">V</div>
                            ),
                          },
                          {
                            id: 'telecmi',
                            label: 'TeleCMI',
                            connected: !!telecmiChannel,
                            selectedBg: 'bg-teal-50 border-teal-400',
                            logo: (
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-base shadow-sm">T</div>
                            ),
                          },
                        ] as const).map(({ id, label, connected, selectedBg, logo }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setConnectProvider(id)}
                            className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all cursor-pointer ${
                              connectProvider === id
                                ? selectedBg
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {logo}
                            <span className="text-xs font-semibold text-slate-700">{label}</span>
                            {connected && (
                              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" title="Connected" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100" />

                    {/* Per-provider form */}
                    {connectProvider === 'twilio' && (
                      <form onSubmit={(e) => { handleConnectTwilio(e); setShowProviderForm(false); }} className="space-y-4">
                        {twilioChannel && (
                          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>Active: <span className="font-semibold">{twilioChannel.externalId}</span></span>
                            </div>
                            <button type="button" onClick={() => handleDisconnectChannel('twilio')} disabled={disconnectingChannel === 'twilio'} className="text-rose-500 hover:text-rose-600 font-semibold text-xs disabled:opacity-50 cursor-pointer">
                              {disconnectingChannel === 'twilio' ? 'Disconnecting…' : 'Disconnect'}
                            </button>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Account SID</label>
                            <input type="text" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Auth Token</label>
                            <input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="••••••••••••••••••••••••••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                              <input type="text" value={twilioPhone} onChange={(e) => setTwilioPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label <span className="text-slate-400 font-normal">(optional)</span></label>
                              <input type="text" value={twilioLabel} onChange={(e) => setTwilioLabel(e.target.value)} placeholder="e.g. Sales Line" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-slate-400">Repeat to add another number.</p>
                          <button type="submit" disabled={savingTwilio} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-all cursor-pointer shadow-sm">
                            {savingTwilio ? 'Connecting…' : twilioChannel ? 'Update Number' : 'Connect Twilio'}
                          </button>
                        </div>
                      </form>
                    )}

                    {connectProvider === 'vobiz' && (
                      <form onSubmit={(e) => { handleConnectVobiz(e); setShowProviderForm(false); }} className="space-y-4">
                        {vobizChannel && (
                          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>Active: <span className="font-semibold">{vobizChannel.externalId}</span></span>
                            </div>
                            <button type="button" onClick={() => handleDisconnectChannel('vobiz')} disabled={disconnectingChannel === 'vobiz'} className="text-rose-500 hover:text-rose-600 font-semibold text-xs disabled:opacity-50 cursor-pointer">
                              {disconnectingChannel === 'vobiz' ? 'Disconnecting…' : 'Disconnect'}
                            </button>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Auth ID</label>
                            <input type="text" value={vobizAuthId} onChange={(e) => setVobizAuthId(e.target.value)} placeholder="Your Vobiz.ai Auth ID" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Auth Token</label>
                            <input type="password" value={vobizToken} onChange={(e) => setVobizToken(e.target.value)} placeholder="••••••••••••••••••••••••••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                              <input type="text" value={vobizPhone} onChange={(e) => setVobizPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label <span className="text-slate-400 font-normal">(optional)</span></label>
                              <input type="text" value={vobizLabel} onChange={(e) => setVobizLabel(e.target.value)} placeholder="e.g. Support Line" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-slate-400">Repeat to add another number.</p>
                          <button type="submit" disabled={savingVobiz} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-all cursor-pointer shadow-sm">
                            {savingVobiz ? 'Connecting…' : vobizChannel ? 'Update Number' : 'Connect Vobiz.ai'}
                          </button>
                        </div>
                      </form>
                    )}

                    {connectProvider === 'telecmi' && (
                      <form onSubmit={(e) => { handleConnectTelecmi(e); setShowProviderForm(false); }} className="space-y-4">
                        {telecmiChannel && (
                          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>Active: <span className="font-semibold">{telecmiChannel.externalId}</span></span>
                            </div>
                            <button type="button" onClick={() => handleDisconnectChannel('piopiy')} disabled={disconnectingChannel === 'piopiy'} className="text-rose-500 hover:text-rose-600 font-semibold text-xs disabled:opacity-50 cursor-pointer">
                              {disconnectingChannel === 'piopiy' ? 'Disconnecting…' : 'Disconnect'}
                            </button>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">App ID</label>
                            <input type="text" value={telecmiAppId} onChange={(e) => setTelecmiAppId(e.target.value)} placeholder="Your TeleCMI App ID" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">App Secret</label>
                            <input type="password" value={telecmiSecret} onChange={(e) => setTelecmiSecret(e.target.value)} placeholder="••••••••••••••••••••••••••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                              <input type="text" value={telecmiPhone} onChange={(e) => setTelecmiPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Label <span className="text-slate-400 font-normal">(optional)</span></label>
                              <input type="text" value={telecmiLabel} onChange={(e) => setTelecmiLabel(e.target.value)} placeholder="e.g. TeleCMI Line" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-slate-400">Repeat to add another number.</p>
                          <button type="submit" disabled={savingTelecmi} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-all cursor-pointer shadow-sm">
                            {savingTelecmi ? 'Connecting…' : telecmiChannel ? 'Update Number' : 'Connect TeleCMI'}
                          </button>
                        </div>
                      </form>
                    )}

                    {!connectProvider && (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                        <Phone className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">Select a provider above to continue</p>
                      </div>
                    )}
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* Subtab: Team matrix */}
          {subTab === 'team' && (
            <div className="space-y-6">
              {staffAddMsg && (
                <div className={`px-4 py-2.5 rounded-lg text-xs font-medium ${staffAddMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {staffAddMsg.text}
                </div>
              )}

              {/* Team list */}
              <Widget
                title="Team Matrix"
                subtitle="All team members and their access levels."
                icon={Users}
                accent="#6366f1"
                padding="none"
                action={<IconButton icon={Plus} label="Add Member" onClick={() => setShowAddStaff(true)} />}
              >
                {(() => {
                  const columns: Column<TeamMember>[] = [
                    {
                      key: 'member',
                      header: 'Enlisted Representative',
                      cell: (member) => (
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-[var(--text-primary)]">{member.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] mt-0.5">{member.email}</p>
                          {member.phone && (
                            <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] mt-0.5">{member.phone}</p>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'role',
                      header: 'Administrative Role',
                      cell: (member) => (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                          {member.role}
                        </span>
                      ),
                    },
                    {
                      key: 'access',
                      header: 'Feature Access',
                      cell: (member) => member.role === 'Organization Admin' || member.role === 'Super Admin' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Flag className="h-3 w-3" />
                          Full Access
                        </span>
                      ) : (
                        <button
                          onClick={() => editFlagsFor === member.id ? setEditFlagsFor(null) : openFlagEditor(member)}
                          className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                        >
                          <Flag className="h-3 w-3" />
                          {(member.featureFlags || []).length} granted
                        </button>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'CRM Status',
                      align: 'right',
                      cell: (member) => (
                        <button
                          onClick={() => handleToggleStaffStatus(member.id)}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            member.status === 'Active'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-emerald-700 dark:text-emerald-400 hover:text-rose-700 dark:hover:text-rose-400 border border-emerald-200 dark:border-emerald-500/30 hover:border-rose-200 dark:hover:border-rose-500/30'
                              : 'bg-slate-100 dark:bg-[var(--bg-subtle)] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-600 dark:text-[var(--text-secondary)] hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-[var(--border)]'
                          }`}
                        >
                          {member.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      align: 'right',
                      cell: (member) => {
                        const isSelf = currentUserEmail && member.email.toLowerCase() === currentUserEmail.toLowerCase();
                        const isSelfAdmin = isSelf && member.role === 'Organization Admin';
                        return (
                          <button
                            onClick={() => handleRemoveStaff(member.id, member.name, member.email, member.role)}
                            title={isSelfAdmin ? 'Hand over Org Admin role first, then ask the new admin to remove your account' : undefined}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                              isSelfAdmin
                                ? 'bg-slate-50 dark:bg-[var(--bg-subtle)] text-slate-300 dark:text-[var(--text-muted)] border-slate-200 dark:border-[var(--border)] cursor-not-allowed'
                                : 'bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border-rose-200 dark:border-rose-500/30'
                            }`}
                          >
                            {isSelfAdmin ? 'Cannot Remove' : 'Remove'}
                          </button>
                        );
                      },
                    },
                  ];
                  return (
                    <DataTable
                      bare
                      resizable
                      paginated
                      columns={columns}
                      rows={teamMembers}
                      rowKey={(member) => member.id}
                      isRowExpanded={(member) => editFlagsFor === member.id}
                      renderExpandedRow={(member) => (
                        <div className="px-6 pb-4 pt-0 bg-indigo-50/40 dark:bg-indigo-500/5">
                          <div className="border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4 bg-white dark:bg-[var(--bg-surface)] space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Feature Access — {member.name}
                            </p>
                            <FlagGroupPicker
                              availableKeys={orgAllowedFlags}
                              onApply={(keys) => setEditFlagsValue(keys)}
                            />
                            <div className="flex flex-wrap gap-2">
                              {FEATURE_REGISTRY.filter(f => orgAllowedFlags.includes(f.key)).map((flag) => {
                                const active = editFlagsValue.includes(flag.key);
                                return (
                                  <button
                                    key={flag.key}
                                    type="button"
                                    onClick={() =>
                                      setEditFlagsValue(prev =>
                                        prev.includes(flag.key)
                                          ? prev.filter(k => k !== flag.key)
                                          : [...prev, flag.key]
                                      )
                                    }
                                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                      active
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white dark:bg-[var(--bg-subtle)] text-slate-500 dark:text-[var(--text-secondary)] border-slate-200 dark:border-[var(--border)] hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                    }`}
                                  >
                                    {flag.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setEditFlagsFor(null)}
                                className="text-xs text-slate-400 dark:text-[var(--text-muted)] hover:text-slate-600 dark:hover:text-[var(--text-primary)] font-medium px-3 py-1.5 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveFlags(member.id)}
                                disabled={savingFlags}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-4 py-1.5 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                {savingFlags ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Save Access
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    />
                  );
                })()}
              </Widget>

              {/* Add Member overlay modal */}
              {showAddStaff && (
                <Modal
                  open
                  onClose={() => setShowAddStaff(false)}
                  title="Add Team Member"
                  subtitle="A Keycloak account is created automatically and credentials are emailed to the new member."
                  maxWidth="max-w-lg"
                >
                    <form onSubmit={(e) => { handleAddStaff(e); if (!staffAddMsg || staffAddMsg.type === 'success') setShowAddStaff(false); }} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                            <input type="text" required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Jane Smith" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                            <input type="email" required value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="jane@company.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label>
                            <input type="tel" value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                            <select value={newStaffRole} onChange={(e: any) => setNewStaffRole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
                              <option value="Sales Manager">Sales Manager</option>
                              <option value="Loan Agent">Loan Agent</option>
                              <option value="Collection Agent">Collection Agent</option>
                              <option value="AI Agent Manager">AI Agent Manager</option>
                            </select>
                          </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Grant Feature Access</p>
                          {orgAllowedFlags.length === 0 && (
                            <p className="text-[10px] text-slate-400 mb-2">No features available — super admin has not granted any features to this org.</p>
                          )}
                          <FlagGroupPicker
                            availableKeys={orgAllowedFlags}
                            onApply={(keys) => setNewStaffFeatures(keys)}
                            className="mb-3"
                          />
                          <div className="flex flex-wrap gap-2">
                            {FEATURE_REGISTRY.filter(f => orgAllowedFlags.includes(f.key)).map((flag) => {
                              const active = newStaffFeatures.includes(flag.key);
                              return (
                                <button key={flag.key} type="button" onClick={() => toggleFeature(flag.key)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                                  {flag.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button type="button" onClick={() => setShowAddStaff(false)} className="text-xs text-slate-400 hover:text-slate-600 font-medium px-3 py-2 cursor-pointer">Cancel</button>
                          <button type="submit" disabled={addingStaff} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-5 py-2 transition-all cursor-pointer flex items-center gap-2">
                            {addingStaff ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                            {addingStaff ? 'Adding…' : 'Add Member'}
                          </button>
                        </div>
                      </form>
                </Modal>
              )}
            </div>
          )}

          {/* Subtab: Billing info */}
          {subTab === 'billing' && (
            <div className="space-y-6">
              <Widget title="AI Voice Usage This Period" icon={CreditCard} accent="#10b981" padding="md">
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Minutes Consumed</span>
                    <strong className="text-md text-slate-800 font-mono">{orgSettings.aiMinutesUsed.toFixed(2)}</strong>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Voice Cost (₹{costPerMinuteInr}/min)</span>
                    <strong className="text-md text-slate-800 font-mono">{formatInr(orgSettings.aiMinutesUsed * costPerMinuteInr)}</strong>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Charges</span>
                    <strong className="text-md text-slate-800 font-mono">${orgSettings.phoneCharges.toFixed(2)}</strong>
                  </div>
                </div>
              </Widget>
            </div>
          )}

          {/* Subtab: API details & Audit Logs */}
          {subTab === 'api' && (
            <div className="space-y-6">
              <Widget title="Third-Party Gateway API Credentials" subtitle="Configure active server tokens utilized by automated calling triggers and OCR engines." icon={Key} accent="#6366f1" padding="md">
                <div className="space-y-3.5">
                  {orgSettings.apiKeys.map((k, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-700">{k.service}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Last accessed {new Date(k.lastUsed).toLocaleString()}</p>
                      </div>
                      <strong className="font-mono text-slate-600">{k.key}</strong>
                    </div>
                  ))}
                </div>
              </Widget>

              {/* Security audit logs */}
              <Widget
                title="Administrative Audit Trail"
                icon={ScrollText}
                accent="#6366f1"
                padding="none"
                action={
                  <span className="text-[10px] font-mono text-slate-400 dark:text-[var(--text-muted)]">Total events: {auditLogs.length}</span>
                }
              >
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 dark:text-[var(--text-muted)] text-xs">No admin actions recorded yet.</div>
                ) : (
                  <DataTable
                    bare
                    resizable
                    paginated
                    columns={[
                      { key: 'action', header: 'Action', cell: (log: AuditEntry) => <span className="font-medium text-slate-700 dark:text-[var(--text-primary)] font-mono text-xs">{log.action}</span> },
                      { key: 'actor', header: 'Actor', cell: (log: AuditEntry) => <span className="text-slate-400 dark:text-[var(--text-muted)] font-mono text-xs">{log.actorEmail || '—'}</span> },
                      { key: 'time', header: 'Time', align: 'right', cell: (log: AuditEntry) => <span className="text-[9px] text-slate-400 dark:text-[var(--text-muted)] font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span> },
                    ]}
                    rows={auditLogs}
                    rowKey={(log) => log.id}
                  />
                )}
              </Widget>
            </div>
          )}

      </div>
    </PageShell>
  );
}
