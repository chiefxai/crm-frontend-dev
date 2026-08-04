import React, { useEffect, useState } from 'react';
import { Globe2, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from './lib/api';
import AdminShell from './admin/AdminShell';

type Status = 'checking' | 'login' | 'denied' | 'authorized';

// A deliberately separate application, not a tab inside the customer
// dashboard (App.tsx) — different URL (/admin), different shell, no
// customer-facing navigation. It reuses the same login endpoint and JWTs
// as the main app (a platform admin is still a real org account, just one
// on the PLATFORM_ADMIN_EMAILS allowlist — see backend/services/auth.js)
// but everything else about this UI is independent.
export default function AdminApp() {
  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState('');

  const checkAuthorization = async () => {
    const res = await apiFetch('/api/platform/whoami');
    if (res.ok) {
      const data = await res.json();
      setDeniedEmail(data.email);
      setStatus('authorized');
    } else if (res.status === 401) {
      setStatus('login');
    } else {
      const data = await res.json().catch(() => ({}));
      setDeniedEmail(data.email || email);
      setStatus('denied');
    }
  };

  useEffect(() => {
    document.title = 'ChiefXAI | Platform Admin';
    if (getAuthToken()) checkAuthorization();
    else setStatus('login');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
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
      setAuthToken(data.token);
      await checkAuthorization();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setStatus('login');
    setEmail('');
    setPassword('');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (status === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3">
              <Globe2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Platform Admin</h2>
            <p className="text-xs text-slate-500 mt-1">Operator access — not the customer dashboard</p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-300 text-xs">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-medium text-sm py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          {deniedEmail || 'This account'} is not on the platform-admin allowlist. This is the operator panel, not the customer dashboard.
        </p>
        <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">
          Try a different account
        </button>
      </div>
    );
  }

  return <AdminShell email={deniedEmail || email} onLogout={handleLogout} />;
}
