import React, { createContext, useContext } from 'react';

const RefreshContext = createContext<(() => void) | null>(null);

export function RefreshProvider({ onRefresh, children }: { onRefresh: () => void; children: React.ReactNode }) {
  return <RefreshContext.Provider value={onRefresh}>{children}</RefreshContext.Provider>;
}

/** Returns the app-level refresh callback, or undefined if not provided. */
export function useRefresh(): (() => void) | undefined {
  return useContext(RefreshContext) ?? undefined;
}
