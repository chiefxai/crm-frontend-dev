import React, { createContext, useContext } from 'react';

// Tells a view (and the PageShell inside it) whether it is the currently
// visible tab. Views stay mounted after their first visit (see App.tsx's
// keep-alive tab rendering) so switching back to one doesn't re-run its
// initial data fetch or flash a loading spinner — but that means several
// PageShells can be mounted at once, hidden ones included. Without this,
// a hidden page's own background work (polling intervals, etc.) could
// still re-run its effects and stomp on the visible page's header. PageShell
// only publishes into PageHeaderContext when this is true.
const ActiveTabContext = createContext(true);

export function ActiveTabProvider({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <ActiveTabContext.Provider value={active}>{children}</ActiveTabContext.Provider>;
}

/** Defaults to true when rendered outside a provider (e.g. standalone/tests). */
export function useIsActiveTab() {
  return useContext(ActiveTabContext);
}
