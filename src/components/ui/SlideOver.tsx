import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Max width class — defaults to 'max-w-2xl' */
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  zIndex?: string;
}

export default function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
  children,
  footer,
  className = '',
  zIndex = 'z-[300]',
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex justify-end ${zIndex}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} h-full flex flex-col overflow-hidden shadow-2xl ${className}`}
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div
            className="flex items-start justify-between gap-3 px-6 py-5 shrink-0 sticky top-0 z-10"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="shrink-0 px-6 py-4 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
