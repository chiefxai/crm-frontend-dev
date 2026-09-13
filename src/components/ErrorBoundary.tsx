import React from 'react';

interface Props {
  // Shown in the fallback message so it's obvious which tab broke.
  label: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Every tab in App.tsx stays mounted forever once visited (toggled via
// display:none rather than unmounted, so switching back is instant) and
// renderTabContent() re-runs for ALL visited tabs on every App render, not
// just the active one. Without an error boundary, a render error in any
// single tab — even one you're not currently looking at — crashes React's
// entire tree on the next re-render, wherever that happens to be triggered.
// The URL still updates (history.pushState from react-router's navigate()
// already ran), so it looks exactly like "clicking the sidebar does
// nothing, but reloading opens the right page" — the reload just re-mounts
// a fresh, uncrashed tree that reads the now-current URL.
//
// Wrapping each tab's content in one of these contains a render error to
// that tab's own slot: the rest of the app, including sidebar navigation,
// keeps working.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full py-24 text-center px-6">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Something went wrong in "{this.props.label}"</h2>
          <p className="text-sm text-slate-400 max-w-sm mb-5">
            This section hit an error and couldn't render. Other pages should still work normally — try reopening this one.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
