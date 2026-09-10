<title>Notification Bell</title>
import React, { useEffect, useRef, useState } from 'react';
import { Bell, Phone, Activity, X, CheckCheck } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface Props {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClear: () => void;
}

function typeIcon(type: string) {
  if (type === 'call_started' || type === 'call_completed') return <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  return <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function NotificationBell({ notifications, onMarkAllRead, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) onMarkAllRead(); }}
        className="relative flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="theme-dropdown absolute right-0 top-10 w-80 rounded-2xl shadow-2xl border z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={onClear} className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors">
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCheck className="h-6 w-6 mb-2 opacity-40" />
                <p className="text-xs">All caught up</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ${n.read ? '' : 'bg-blue-50/40'}`}>
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
