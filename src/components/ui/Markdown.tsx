import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Shared Markdown renderer — GitHub-Flavored Markdown (tables, strikethrough,
// task lists, autolinks) via remark-gfm, styled to match the app's existing
// slate/blue design system instead of pulling in @tailwindcss/typography.
// Use this anywhere AI-generated or user-authored text may contain markdown
// (call summaries, chat/inbox messages, knowledge base content, live preview
// replies) instead of rendering the raw string.

const components: Components = {
  h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mt-2.5 mb-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-xs leading-relaxed text-slate-600 mb-2 last:mb-0">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-slate-400">{children}</del>,
  ul: ({ children }) => <ul className="list-disc list-outside pl-4 text-xs text-slate-600 space-y-1 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-4 text-xs text-slate-600 space-y-1 mb-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-200 pl-3 my-2 text-xs italic text-slate-500">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-100" />,
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
      <code className="font-mono text-[11px] bg-slate-100 text-rose-600 px-1 py-0.5 rounded" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto mb-2">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2 rounded-lg border border-slate-200">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="text-left font-bold text-slate-500 uppercase tracking-wide text-[10px] px-3 py-2 border-b border-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-slate-600 align-top">{children}</td>,
};

export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
