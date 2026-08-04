import React, { useState, useEffect } from 'react';
import { Building2, KeyRound, Mail, AlertCircle, ArrowRight, Layers, Briefcase } from 'lucide-react';
import { OrganizationSettings } from '../types';
import { setAuthToken } from '../lib/api';

interface AuthViewProps {
  onAuthSuccess: (org: OrganizationSettings) => void;
  currentOrg: OrganizationSettings;
}

interface Industry {
  key: string;
  label: string;
}

export default function AuthView({ onAuthSuccess, currentOrg }: AuthViewProps) {
  const [step, setStep] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState(currentOrg.name);
  const [workspace, setWorkspace] = useState(currentOrg.workspaceName);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industry, setIndustry] = useState('lending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/industries')
      .then((r) => r.json())
      .then((list: Industry[]) => setIndustries(list))
      .catch(() => setIndustries([{ key: 'lending', label: 'Lending / Loans' }]));
  }, []);

  const finishLogin = (data: { token: string; org: OrganizationSettings }) => {
    setAuthToken(data.token);
    onAuthSuccess(data.org);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      finishLogin(data);
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!orgName || !workspace) {
      setError('Please provide both organization name and workspace slug');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, orgName, workspaceName: workspace, industry })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }
      if (!data.token) {
        // Account created but auto-login didn't happen — fall back to login step.
        setError(data.warning || 'Account created — please log in.');
        setStep('login');
        return;
      }
      finishLogin(data);
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-wizard" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40 mb-3">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight">ChiefXAI Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Any-Industry AI CRM & Automation
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start space-x-2 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center group transition-all"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="pt-4 text-center border-t border-slate-800">
              <span className="text-xs text-slate-500">New organization?</span>{' '}
              <button
                type="button"
                onClick={() => { setError(''); setStep('signup'); }}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Register Workspace
              </button>
            </div>
          </form>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="you@corporate.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Acme Capital Partners"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Industry</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  {industries.map((ind) => (
                    <option key={ind.key} value={ind.key}>{ind.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Sets up the right pipeline and AI persona for your business. Can't be changed after signup yet.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Slug</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-xs text-slate-600 font-mono">chief.ai/</span>
                <input
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-20 pr-4 py-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="acme-cap"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium text-sm py-3 px-4 rounded-xl flex items-center justify-center group transition-all"
            >
              {loading ? 'Provisioning…' : 'Create Workspace'}
              {!loading && <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="pt-4 text-center border-t border-slate-800">
              <span className="text-xs text-slate-500">Already registered?</span>{' '}
              <button
                type="button"
                onClick={() => { setError(''); setStep('login'); }}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
