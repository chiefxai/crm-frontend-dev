import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  FileSpreadsheet,
  Database,
  Check,
  X,
  AlertCircle,
  DollarSign,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Lead, CallLog } from '../types';
import { getPlayableRecordingUrl } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import KpiCard from './ui/KpiCard';
import Modal from './ui/Modal';
import FilterBar from './ui/FilterBar';

// Real calls come in as raw digit strings (e.g. "919384813556" — country
// code glued straight onto the 10-digit number, no separators) since
// that's the exact format Vobiz/Twilio webhooks hand us as caller ID.
// Manually-entered/CSV-imported contacts often already have their own
// formatting (e.g. "+1 (555) 000-0000") — only reformat the bare-digit
// case so we don't mangle those.
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10 && digits === phone) return `+91 ${digits}`;
  return phone;
}

interface ContactDirectoryViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  industry?: string;
  callLogs?: CallLog[];
}

export default function ContactDirectoryView({
  leads,
  setLeads,
  industry,
  callLogs = []
}: ContactDirectoryViewProps) {
  // Loan-specific fields (employer/income/credit score/DTI) only make
  // sense for lending — every other industry's contacts are real Industry
  // Objects records bridged into this same Lead shape (see
  // src/lib/objectContacts.ts), so those fields are hidden rather than
  // asking e.g. an automotive org to fill in a "credit score" for a test
  // drive contact. financialInfo still gets a harmless default under the
  // hood so existing lending-only code paths keep working unchanged.
  const isLending = !industry || industry === 'lending';
  // Navigation & filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Single Contact Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAmount, setFormAmount] = useState('25000');
  const [formSource, setFormSource] = useState('Manual Entry');
  const [formEmployer, setFormEmployer] = useState('');
  const [formIncome, setFormIncome] = useState('6000');
  const [formCredit, setFormCredit] = useState('720');
  const [formDti, setFormDti] = useState('0.25');
  const [formNotes, setFormNotes] = useState('');

  // Bulk Upload State
  const [pastedData, setPastedData] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Lead>[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter contacts
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.financialInfo?.employer || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  // Unique sources for filter dropdown
  const uniqueSources = ['All', ...Array.from(new Set(leads.map((l) => l.source)))];

  // Stats calculation
  const totalContacts = leads.length;
  const bulkUploadedCount = leads.filter((l) => l.source.includes('CSV') || l.source.includes('Bulk')).length;
  const avgAmountRequested = leads.length > 0
    ? Math.round(leads.reduce((acc, l) => acc + l.amountRequested, 0) / leads.length)
    : 0;
  const highCreditCount = leads.filter((l) => (l.financialInfo?.creditScore || 0) >= 700).length;

  // Handle open individual add modal
  const openAddModal = () => {
    setEditingLead(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAmount('25000');
    setFormSource('Manual Entry');
    setFormEmployer('');
    setFormIncome('6000');
    setFormCredit('720');
    setFormDti('0.25');
    setFormNotes('Registered individually.');
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormPhone(lead.phone);
    setFormEmail(lead.email);
    setFormAmount(lead.amountRequested.toString());
    setFormSource(lead.source);
    setFormEmployer(lead.financialInfo?.employer || '');
    setFormIncome((lead.financialInfo?.monthlyIncome || 6000).toString());
    setFormCredit((lead.financialInfo?.creditScore || 720).toString());
    setFormDti((lead.financialInfo?.debtToIncome || 0.25).toString());
    setFormNotes(lead.notes || '');
    setIsAddModalOpen(true);
  };

  // Submit single/edited lead
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) {
      alert('Please fill out required fields: Name, Phone, and Email.');
      return;
    }

    if (editingLead) {
      // Edit mode
      const updatedLeads = leads.map((l) => {
        if (l.id === editingLead.id) {
          return {
            ...l,
            name: formName,
            phone: formPhone,
            email: formEmail,
            amountRequested: parseFloat(formAmount) || 0,
            source: formSource,
            notes: formNotes,
            financialInfo: {
              employer: formEmployer || 'Self-Employed',
              monthlyIncome: parseFloat(formIncome) || 0,
              creditScore: parseInt(formCredit) || 700,
              debtToIncome: parseFloat(formDti) || 0.3
            }
          };
        }
        return l;
      });
      setLeads(updatedLeads);
    } else {
      // Create mode
      const newLead: Lead = {
        id: `L-${100 + leads.length + 1}`,
        name: formName,
        phone: formPhone,
        email: formEmail,
        amountRequested: parseFloat(formAmount) || 0,
        score: 0,
        source: formSource,
        status: 'New',
        tags: ['Unassigned'],
        createdAt: new Date().toISOString(),
        notes: formNotes,
        financialInfo: {
          employer: formEmployer || 'Self-Employed',
          monthlyIncome: parseFloat(formIncome) || 0,
          creditScore: parseInt(formCredit) || 700,
          debtToIncome: parseFloat(formDti) || 0.3
        }
      };
      setLeads([newLead, ...leads]);
    }
    setIsAddModalOpen(false);
  };

  // Delete lead
  const handleDeleteContact = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} from your contact directory?`)) {
      setLeads(leads.filter((l) => l.id !== id));
    }
  };

  // Helper: Parse raw CSV text
  const parseCSVText = (text: string) => {
    setParsingError(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setParsingError('CSV must include at least a header row and one data row.');
        setParsedPreview([]);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
      
      // Basic validation of required headers
      const hasName = headers.includes('name');
      const hasPhone = headers.includes('phone');
      const hasEmail = headers.includes('email');

      if (!hasName || !hasPhone || !hasEmail) {
        setParsingError('CSV columns must include: "name", "phone", and "email". Other optional keys: amount, employer, income, credit, dti');
        setParsedPreview([]);
        return;
      }

      const previewList: Partial<Lead>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple comma split (doesn't handle commas inside quotes for simplicity but is good for standard inputs)
        const cols = lines[i].split(',').map((c) => c.trim());
        const rowObj: any = {};
        
        headers.forEach((header, index) => {
          if (cols[index] !== undefined) {
            rowObj[header] = cols[index];
          }
        });

        previewList.push({
          id: `TEMP-${i}`,
          name: rowObj.name || `Lead #${i}`,
          phone: rowObj.phone || 'N/A',
          email: rowObj.email || 'N/A',
          amountRequested: parseFloat(rowObj.amount) || 20000,
          source: 'Bulk Import',
          status: 'New',
          tags: ['Bulk Uploaded'],
          createdAt: new Date().toISOString(),
          notes: 'Bulk uploaded into CRM database.',
          financialInfo: {
            employer: rowObj.employer || 'Unspecified',
            monthlyIncome: parseFloat(rowObj.income) || 5000,
            creditScore: parseInt(rowObj.credit) || 680,
            debtToIncome: parseFloat(rowObj.dti) || 0.3
          }
        });
      }

      setParsedPreview(previewList);
    } catch (err: any) {
      setParsingError(`Parsing error: ${err.message}`);
      setParsedPreview([]);
    }
  };

  // CSV File reader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setPastedData(text);
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  // Confirm Bulk Upload
  const handleConfirmBulkUpload = () => {
    if (parsedPreview.length === 0) {
      alert('No valid contacts to import.');
      return;
    }

    const startIdNumber = 100 + leads.length + 1;
    const finalLeadsToImport: Lead[] = parsedPreview.map((item, idx) => {
      return {
        id: `L-${startIdNumber + idx}`,
        name: item.name || 'Anonymous Contact',
        phone: item.phone || '+1 (555) 000-0000',
        email: item.email || 'imported@email.com',
        amountRequested: item.amountRequested || 25000,
        score: 0,
        source: 'CSV Bulk Upload',
        status: 'New',
        tags: ['Bulk Uploaded'],
        createdAt: new Date().toISOString(),
        notes: item.notes || 'Bulk uploaded via CSV parser.',
        financialInfo: {
          employer: item.financialInfo?.employer || 'Unspecified',
          monthlyIncome: item.financialInfo?.monthlyIncome || 5000,
          creditScore: item.financialInfo?.creditScore || 700,
          debtToIncome: item.financialInfo?.debtToIncome || 0.3
        }
      };
    });

    setLeads([...finalLeadsToImport, ...leads]);
    setIsBulkModalOpen(false);
    setPastedData('');
    setParsedPreview([]);
    alert(`Successfully parsed and bulk uploaded ${finalLeadsToImport.length} contacts! These are now fully available in your task assignment pool.`);
  };

  return (
    <PageShell
      title="Unified Contact Directory"
      subtitle="Build, edit, and bulk upload your client repository. These contacts automatically stream into the outbound Task Assignment channels."
      action={
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4 mr-2 text-blue-600" />
            Bulk Upload Contacts
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contact
          </button>
        </div>
      }
    >
      {/* KPI Stats Cards */}
      <KpiCard colSpan={3} icon={Users} iconBg="#eff6ff" iconColor="#2563eb" label="Total Contacts" value={totalContacts} />
      <KpiCard colSpan={3} icon={FileSpreadsheet} iconBg="#f0fdf4" iconColor="#16a34a" label="Bulk Imported" value={bulkUploadedCount} />
      {isLending ? (
        <>
          <KpiCard colSpan={3} icon={DollarSign} iconBg="#eef2ff" iconColor="#4f46e5" label="Avg Loan Req." value={`$${avgAmountRequested.toLocaleString()}`} />
          <KpiCard colSpan={3} icon={Sparkles} iconBg="#faf5ff" iconColor="#9333ea" label="Prime Credit (700+)" value={highCreditCount} />
        </>
      ) : (
        <KpiCard colSpan={6} icon={FileSpreadsheet} iconBg="#f0fdf4" iconColor="#16a34a" label="Manual Entries" value={totalContacts - bulkUploadedCount} />
      )}

      {/* Searching & Filters Grid */}
      <Widget showHeader={false} padding="md" colSpan={12}>
        <FilterBar
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Search contacts by name, email, phone number, employer…' }}
          selects={[
            {
              key: 'source',
              label: 'Source',
              value: sourceFilter,
              onChange: setSourceFilter,
              options: uniqueSources.map((src) => ({ label: src, value: src })),
            },
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { label: 'All CRM Statuses', value: 'All' },
                { label: 'New', value: 'New' },
                { label: 'In Progress', value: 'In Progress' },
                { label: 'Qualified', value: 'Qualified' },
                { label: 'Unqualified', value: 'Unqualified' },
              ],
            },
          ]}
        />
      </Widget>

      {/* Main Table View */}
      <Widget title="All Contacts" icon={Users} accent="#2563eb" padding="none" scrollable colSpan={12}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-surface)' }}>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Name / Details</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Email Address</th>
                {isLending && <th className="py-4 px-6">Loan Amt Requested</th>}
                {isLending && <th className="py-4 px-6">Employment & Wages</th>}
                {isLending && <th className="py-4 px-6">Credit / DTI</th>}
                <th className="py-4 px-6">Source</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center uppercase">
                        {lead.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{lead.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {lead.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">
                    {formatPhoneDisplay(lead.phone)}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {lead.email}
                  </td>
                  {isLending && (
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      ${lead.amountRequested.toLocaleString()}
                    </td>
                  )}
                  {isLending && (
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-700 flex items-center">
                          <Building className="h-3 w-3 mr-1 text-slate-400" />
                          {lead.financialInfo?.employer || 'Unspecified'}
                        </p>
                        <p className="text-slate-400 text-[10px]">Wages: ${lead.financialInfo?.monthlyIncome.toLocaleString()}/mo</p>
                      </div>
                    </td>
                  )}
                  {isLending && (
                    <td className="py-4 px-6 font-mono">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-700">CS: {lead.financialInfo?.creditScore || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400">DTI: {((lead.financialInfo?.debtToIncome || 0) * 100).toFixed(0)}%</p>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 text-[9px] bg-slate-100 border border-slate-200 rounded text-slate-500 font-medium">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => openEditModal(lead)}
                        title="Edit Contact"
                        className="p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(lead.id, lead.name)}
                        title="Delete Contact"
                        className="p-1.5 hover:bg-slate-100 hover:text-rose-600 rounded-lg text-slate-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    No contacts found in the directory database matching search criteria. Click "Add Contact" or "Bulk Upload" to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Widget>

      {/* MODAL: Add / Edit Single Contact */}
      {isAddModalOpen && (
        <Modal
          open
          onClose={() => setIsAddModalOpen(false)}
          title={editingLead ? `Modify Contact: ${editingLead.name}` : 'Originate New Contact Entry'}
          maxWidth="max-w-xl"
        >
            {editingLead && (() => {
              const contactCalls = callLogs
                .filter((log) => log.leadId === editingLead.id)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              if (contactCalls.length === 0) return null;
              return (
                <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    Call History ({contactCalls.length})
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {contactCalls.map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{log.direction || '—'}</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                          <span className="text-slate-400">· {log.duration}s</span>
                          <span className={`text-[10px] font-bold ${log.sentiment === 'Positive' ? 'text-emerald-600' : log.sentiment === 'Negative' ? 'text-rose-600' : 'text-slate-500'}`}>
                            {log.sentiment}
                          </span>
                        </div>
                        {log.recordingUrl && (
                          <a
                            href={getPlayableRecordingUrl(log.id, log.recordingUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Play
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <form onSubmit={handleSaveContact} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Gavin Belson"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="+1 (555) 012-3456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="gavin@hooli.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{isLending ? 'Amount Requested ($)' : 'Value ($)'}</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {isLending && (
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Underwriting Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Employer</label>
                    <input
                      type="text"
                      value={formEmployer}
                      onChange={(e) => setFormEmployer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="Hooli Inc"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monthly Wages ($)</label>
                    <input
                      type="number"
                      value={formIncome}
                      onChange={(e) => setFormIncome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              )}

              {isLending && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Credit Score (300-850)</label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={formCredit}
                    onChange={(e) => setFormCredit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Debt-To-Income (DTI)</label>
                  <input
                    type="text"
                    value={formDti}
                    onChange={(e) => setFormDti(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="0.30"
                  />
                </div>
              </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lead Source</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Manual Entry">Manual Entry</option>
                    <option value="Website Form">Website Form</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Partner Referral">Partner Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes / Disclosures</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    placeholder="E.g. urgent loan request"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {editingLead ? 'Update Details' : 'Register Contact'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: Bulk Upload Contacts */}
      {isBulkModalOpen && (
        <Modal
          open
          onClose={() => setIsBulkModalOpen(false)}
          title={<div className="flex items-center space-x-2"><Database className="h-5 w-5 text-blue-600" /><span>Bulk Upload Contacts Database</span></div>}
          maxWidth="max-w-3xl"
        >
            <div className="space-y-6">
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-700">Select .csv file to upload</p>
                  <p className="text-[10px] text-slate-400 mt-1">Columns: name, phone, email, amount, employer, income, credit, dti</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {pastedData && (
                  <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-2 border border-slate-200 rounded-xl truncate">
                    Loaded: {pastedData.split('\n').length} lines
                  </div>
                )}
              </div>

              {/* Parsing Feedback Error / Live Preview */}
              {parsingError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 text-rose-700">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  <div className="text-xs">
                    <p className="font-bold">Parsing Error Detected</p>
                    <p className="mt-1">{parsingError}</p>
                  </div>
                </div>
              )}

              {parsedPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" /> Live Parsing Preview ({parsedPreview.length} contacts parsed successfully)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Row structure verified</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                    {parsedPreview.map((item, index) => (
                      <div key={index} className="p-3 text-xs flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.phone} • {item.email}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <p className="font-bold text-slate-700">${item.amountRequested?.toLocaleString()}</p>
                          <p>{item.financialInfo?.employer || 'Unspecified'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 italic">
                * Uploaded contacts will be appended to your Outbound CRM Dialer targets list.
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkUpload}
                  disabled={parsedPreview.length === 0}
                  className={`px-5 py-2 font-semibold text-xs rounded-xl cursor-pointer text-white flex items-center ${
                    parsedPreview.length > 0 ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Database className="h-4 w-4 mr-1.5" />
                  Save {parsedPreview.length > 0 ? parsedPreview.length : ''} Contacts
                </button>
              </div>
            </div>
        </Modal>
      )}
    </PageShell>
  );
}
