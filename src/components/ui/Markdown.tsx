import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Shared Markdown renderer — GitHub-Flavored Markdown (tables, strikethrough,
// task lists, autolinks) via remark-gfm, styled to match the app's existing
// design system instead of pulling in @tailwindcss/typography.
// Use this anywhere AI-generated or user-authored text may contain markdown
// (call summaries, chat/inbox messages, knowledge base content, live preview
// replies, dashboard AI insights) instead of rendering the raw string.
//
// variant="default" (light slate surfaces — Call Logs, Agent Studio, etc.)
// variant="panel"   (the app's separate dark "theme-panel" CSS-var family —
//                    e.g. DashboardView's Gemini Strategic Advisory Engine —
//                    hardcoded slate-* Tailwind classes read as near-invisible
//                    low-contrast text against that panel's dark background,
//                    so this variant uses the panel's own --panel-* vars
//                    via inline style instead of Tailwind color utilities.)
type Variant = 'default' | 'panel';

function buildComponents(variant: Variant): Components {
  const isPanel = variant === 'panel';
  const textStyle = isPanel ? { color: 'var(--panel-text)' } : undefined;
  const mutedStyle = isPanel ? { color: 'var(--panel-muted)' } : undefined;
  const mutedClass = isPanel ? '' : 'text-slate-600';
  const strongClass = isPanel ? '' : 'text-slate-800';
  const headingClass = isPanel ? '' : 'text-slate-800';
  const borderStyle = isPanel ? { borderColor: 'var(--panel-border)' } : undefined;
  const borderClass = isPanel ? '' : 'border-slate-200';
  const theadStyle = isPanel ? { background: 'var(--panel-surface)' } : undefined;
  const theadClass = isPanel ? '' : 'bg-slate-50';

  return {
    h1: ({ children }) => <h1 className={`text-base font-bold mt-3 mb-1.5 first:mt-0 ${headingClass}`} style={textStyle}>{children}</h1>,
    h2: ({ children }) => <h2 className={`text-sm font-bold mt-3 mb-1.5 first:mt-0 ${headingClass}`} style={textStyle}>{children}</h2>,
    h3: ({ children }) => <h3 className={`text-xs font-bold uppercase tracking-wide mt-2.5 mb-1 first:mt-0 ${headingClass}`} style={mutedStyle}>{children}</h3>,
    p: ({ children }) => <p className={`text-xs leading-relaxed mb-2 last:mb-0 ${mutedClass}`} style={mutedStyle}>{children}</p>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-medium">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className={`font-bold ${strongClass}`} style={textStyle}>{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className={isPanel ? '' : 'text-slate-400'} style={isPanel ? { opacity: 0.6 } : undefined}>{children}</del>,
    ul: ({ children }) => <ul className={`list-disc list-outside pl-4 text-xs space-y-1 mb-2 ${mutedClass}`} style={mutedStyle}>{children}</ul>,
    ol: ({ children }) => <ol className={`list-decimal list-outside pl-4 text-xs space-y-1 mb-2 ${mutedClass}`} style={mutedStyle}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className={`border-l-2 pl-3 my-2 text-xs italic ${borderClass}`} style={{ ...mutedStyle, ...borderStyle }}>{children}</blockquote>
    ),
    hr: () => <hr className={`my-3 ${borderClass}`} style={borderStyle} />,
    code: ({ className, children, ...props }) => {
      // Block code (```lang) carries a language className from remark; inline
      // code (`x`) doesn't — style each differently.
      const isBlock = /language-/.test(className || '');
      if (isBlock) {
        return (
          <code className={`block font-mono text-[11px] leading-relaxed ${className || ''}`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className={`font-mono text-[11px] px-1 py-0.5 rounded ${isPanel ? '' : 'bg-slate-100 text-rose-600'}`}
          style={isPanel ? { background: 'var(--panel-surface)', color: 'var(--panel-text)' } : undefined}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto mb-2">{children}</pre>
    ),
    table: ({ children }) => (
      <div className={`overflow-x-auto mb-2 rounded-lg border ${borderClass}`} style={borderStyle}>
        <table className="w-full text-xs border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className={theadClass} style={theadStyle}>{children}</thead>,
    tbody: ({ children }) => <tbody className={isPanel ? '' : 'divide-y divide-slate-100'} style={isPanel ? { borderColor: 'var(--panel-border)' } : undefined}>{children}</tbody>,
    tr: ({ children }) => <tr className={isPanel ? 'border-b' : ''} style={isPanel ? { borderColor: 'var(--panel-border)' } : undefined}>{children}</tr>,
    th: ({ children }) => (
      <th className={`text-left font-bold uppercase tracking-wide text-[10px] px-3 py-2 border-b ${isPanel ? '' : 'text-slate-500 border-slate-200'}`} style={isPanel ? { color: 'var(--panel-muted)', borderColor: 'var(--panel-border)' } : undefined}>
        {children}
      </th>
    ),
    td: ({ children }) => <td className={`px-3 py-2 align-top ${mutedClass}`} style={mutedStyle}>{children}</td>,
  };
}

export default function Markdown({ children, className = '', variant = 'default' }: { children: string; className?: string; variant?: Variant }) {
  const components = useMemo(() => buildComponents(variant), [variant]);
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
