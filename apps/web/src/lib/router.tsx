import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

type RouterState = {
  pathname: string;
  search: string;
};

type RouterContextValue = RouterState & {
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function getSnapshot(): RouterState {
  return {
    pathname: location.pathname,
    search: location.search,
  };
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function Router({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const navigate = useCallback((to: string) => {
    history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const value = useMemo(
    () => ({ ...state, navigate }),
    [state.pathname, state.search, navigate],
  );

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    // Fallback for usage outside Router — returns current location
    return {
      pathname: location.pathname,
      search: location.search,
      navigate: (to: string) => {
        history.pushState(null, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
    };
  }
  return context;
}

export function Route({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const { pathname } = useRouter();
  if (pathname !== path) return null;
  return <>{children}</>;
}
