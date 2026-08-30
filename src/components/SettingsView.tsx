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
  Briefcase
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { VirtualNumber, TeamMember, OrganizationSettings, UserRole } from '../types';
import { COST_PER_MINUTE_INR_FALLBACK, formatInr } from '../lib/pricing';

interface SettingsViewProps {
  virtualNumbers: VirtualNumber[];
  setVirtualNumbers: React.Dispatch<React.SetStateAction<VirtualNumber[]>>;
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  orgSettings: OrganizationSettings;
  setOrgSettings: React.Dispatch<React.SetStateAction<OrganizationSettings>>;
  costPerMinuteInr?: number;
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

export default function SettingsView({
  virtualNumbers,
  setVirtualNumbers,
  teamMembers,
  setTeamMembers,
  orgSettings,
  setOrgSettings,
  costPerMinuteInr = COST_PER_MINUTE_INR_FALLBACK
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<'numbers' | 'team' | 'billing' | 'api'>('numbers');

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  useEffect(() => {
    if (subTab !== 'api') return;
    apiFetch('/api/audit-log')
      .then((r) => r.json())
      .then((list: AuditEntry[]) => setAuditLogs(Array.isArray(list) ? list : []))
      .catch(() => setAuditLogs([]));
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
  const [connectProvider, setConnectProvider] = useState<'twilio' | 'vobiz'>('twilio');
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
  const upsertVirtualNumber = (number: string, friendlyName: string, provider: 'Twilio' | 'Vobiz.ai') => {
    const existing = virtualNumbers.find((n) => n.number === number);
    if (existing) {
      setVirtualNumbers(virtualNumbers.map((n) => n.number === number ? { ...n, friendlyName, provider, status: 'Active' } : n));
    } else {
      setVirtualNumbers([...virtualNumbers, {
        id: `VN-${400 + virtualNumbers.length + 1}`,
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
    const res = await apiFetch('/api/channels/twilio', {
      method: 'POST',
      body: JSON.stringify({ accountSid: twilioSid.trim(), authToken: twilioToken.trim(), phoneNumber: twilioPhone.trim() })
    });
    setSavingTwilio(false);
    if (res.ok) {
      upsertVirtualNumber(twilioPhone.trim(), twilioLabel.trim() || 'Twilio Line', 'Twilio');
      setTwilioSid(''); setTwilioToken(''); setTwilioPhone(''); setTwilioLabel('');
      loadChannels();
    } else {
      alert((await res.json()).error || 'Failed to connect Twilio account');
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
    const res = await apiFetch('/api/channels/vobiz', {
      method: 'POST',
      body: JSON.stringify({ authId: vobizAuthId.trim(), authToken: vobizToken.trim(), phoneNumber: vobizPhone.trim() })
    });
    setSavingVobiz(false);
    if (res.ok) {
      upsertVirtualNumber(vobizPhone.trim(), vobizLabel.trim() || 'Vobiz.ai Line', 'Vobiz.ai');
      setVobizAuthId(''); setVobizToken(''); setVobizPhone(''); setVobizLabel('');
      loadChannels();
    } else {
      alert((await res.json()).error || 'Failed to connect Vobiz.ai account');
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

  // Team Member states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Loan Agent');

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
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;

    const added: TeamMember = {
      id: `T-${200 + teamMembers.length + 1}`,
      name: newStaffName,
      email: newStaffEmail,
      phone: newStaffPhone || undefined,
      role: newStaffRole,
      status: 'Active',
      performanceScore: 90,
      assignedLeadsCount: 0
    };

    setTeamMembers([...teamMembers, added]);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
  };

  // Deactivate Staff member
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
  };

  return (
    <div id="administration-settings-view" className="p-8 space-y-6 overflow-y-auto h-screen w-full font-sans">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-slate-800">Administration Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure virtual telephone lines, distribute agent permissions, audit invoice logs, and view security records.</p>
      </div>

      {/* Settings Rail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar Rail */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-1.5 self-start">
          <button
            onClick={() => setSubTab('numbers')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'numbers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Phone className="h-4 w-4 mr-3" /> Virtual Numbers
          </button>
          <button
            onClick={() => setSubTab('team')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'team' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4 mr-3" /> Staff & Teams
          </button>
          <button
            onClick={() => setSubTab('billing')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="h-4 w-4 mr-3" /> Billing & Usage
          </button>
          <button
            onClick={() => setSubTab('api')}
            className={`w-full flex items-center px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'api' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Key className="h-4 w-4 mr-3" /> API Credentials
          </button>
        </div>

        {/* Content Box */}
        <div className="lg:col-span-3 space-y-6">
          {/* Subtab: Virtual numbers */}
          {subTab === 'numbers' && (
            <div className="space-y-6">
              {/* Own telephony account connection — one provider at a time */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Your Calling Provider Account</h4>
                  {(connectProvider === 'twilio' ? twilioChannel : vobizChannel) && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Connected</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-3">Connect your own account so calls use your credentials, not a shared default.</p>

                <select
                  value={connectProvider}
                  onChange={(e) => setConnectProvider(e.target.value as 'twilio' | 'vobiz')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none mb-3"
                >
                  <option value="twilio">Twilio</option>
                  <option value="vobiz">Vobiz.ai</option>
                </select>

                {connectProvider === 'twilio' ? (
                  <form onSubmit={handleConnectTwilio} className="space-y-2">
                    {twilioChannel && (
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] text-emerald-600">Connected: {twilioChannel.externalId}</p>
                        <button
                          type="button"
                          onClick={() => handleDisconnectChannel('twilio')}
                          disabled={disconnectingChannel === 'twilio'}
                          className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                        >
                          {disconnectingChannel === 'twilio' ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      </div>
                    )}
                    <input type="text" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="Account SID" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="Auth Token" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="text" value={twilioPhone} onChange={(e) => setTwilioPhone(e.target.value)} placeholder="+1 (800) 000-0000" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="text" value={twilioLabel} onChange={(e) => setTwilioLabel(e.target.value)} placeholder="Friendly name (e.g. Sales Line)" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <button type="submit" disabled={savingTwilio} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-all cursor-pointer">
                      {savingTwilio ? 'Connecting…' : twilioChannel ? 'Update Twilio Account' : 'Connect Twilio Account'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConnectVobiz} className="space-y-2">
                    {vobizChannel && (
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] text-emerald-600">Connected: {vobizChannel.externalId}</p>
                        <button
                          type="button"
                          onClick={() => handleDisconnectChannel('vobiz')}
                          disabled={disconnectingChannel === 'vobiz'}
                          className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                        >
                          {disconnectingChannel === 'vobiz' ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      </div>
                    )}
                    <input type="text" value={vobizAuthId} onChange={(e) => setVobizAuthId(e.target.value)} placeholder="Auth ID" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="password" value={vobizToken} onChange={(e) => setVobizToken(e.target.value)} placeholder="Auth Token" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="text" value={vobizPhone} onChange={(e) => setVobizPhone(e.target.value)} placeholder="+1 (800) 000-0000" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <input type="text" value={vobizLabel} onChange={(e) => setVobizLabel(e.target.value)} placeholder="Friendly name (e.g. Sales Line)" className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                    <button type="submit" disabled={savingVobiz} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-all cursor-pointer">
                      {savingVobiz ? 'Connecting…' : vobizChannel ? 'Update Vobiz.ai Account' : 'Connect Vobiz.ai Account'}
                    </button>
                  </form>
                )}
                <p className="text-[10px] text-slate-400 mt-3">Have more than one number on this account? Submit this form again with the additional number — it'll be added alongside the first, without needing a separate "provision" step.</p>
              </div>

              {/* Numbers list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="p-4 px-6">Telephone Number</th>
                      <th className="p-4 px-6">Gateway Provider</th>
                      <th className="p-4 px-6">Dial Load (In/Out)</th>
                      <th className="p-4 px-6 text-right">Channel Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {virtualNumbers.map((num) => (
                      <tr key={num.id} className="hover:bg-slate-50/40">
                        <td className="p-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-800">{num.number}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{num.friendlyName}</p>
                          </div>
                        </td>
                        <td className="p-4 px-6 font-mono text-xs">{num.provider}</td>
                        <td className="p-4 px-6 text-xs text-slate-500">
                          {num.incomingCallCount} Incoming / {num.outgoingCallCount} Outbound
                        </td>
                        <td className="p-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <span className={`h-2.5 w-2.5 rounded-full ${num.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            <button
                              onClick={() => handleDeleteNumber(num.id)}
                              className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab: Team matrix */}
          {subTab === 'team' && (
            <div className="space-y-6">
              {/* Add staff form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Add Associate Team Member</h4>
                  <p className="text-xs text-slate-400 mt-1">Assign appropriate workflow role profiles and credit credentials to new staff.</p>
                </div>
                <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Full Name"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="name@chiefxai.com"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e: any) => setNewStaffRole(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Loan Agent">Loan Agent</option>
                    <option value="Collection Agent">Collection Agent</option>
                    <option value="AI Agent Manager">AI Agent Manager</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Enlist Member
                  </button>
                </form>
              </div>

              {/* Team list */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="p-4 px-6">Enlisted Representative</th>
                      <th className="p-4 px-6">Administrative Role</th>
                      <th className="p-4 px-6">Quality Rating</th>
                      <th className="p-4 px-6 text-right">CRM Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/40">
                        <td className="p-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-800">{member.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{member.email}</p>
                            {member.phone && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{member.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {member.role}
                          </span>
                        </td>
                        <td className="p-4 px-6">
                          <span className="font-bold text-slate-700 font-mono">{member.performanceScore} / 100</span>
                        </td>
                        <td className="p-4 px-6 text-right">
                          <button
                            onClick={() => handleToggleStaffStatus(member.id)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border border-emerald-200 hover:border-rose-200'
                                : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200'
                            }`}
                          >
                            {member.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab: Billing info */}
          {subTab === 'billing' && (
            <div className="space-y-6">
              {/* Usage */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 font-display">AI Voice Usage This Period</h4>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Minutes Consumed</span>
                    <strong className="text-md text-slate-800 font-mono">{orgSettings.aiMinutesUsed}</strong>
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
              </div>
            </div>
          )}

          {/* Subtab: API details & Audit Logs */}
          {subTab === 'api' && (
            <div className="space-y-6">
              {/* Credentials */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 font-display">Third-Party Gateway API Credentials</h4>
                  <p className="text-xs text-slate-400 mt-1">Configure active server tokens utilized by automated calling triggers and OCR engines.</p>
                </div>
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
              </div>

              {/* Security audit logs */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-display flex items-center">
                    <Shield className="h-4.5 w-4.5 mr-2 text-indigo-500" /> Administrative Audit Trail
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Total events logged: {auditLogs.length}</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs text-slate-600 font-mono">
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No admin actions recorded yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/40">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-700">{log.action}</p>
                          <p className="text-[10px] text-slate-400">Actor: {log.actorEmail || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 mt-1">{new Date(log.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
