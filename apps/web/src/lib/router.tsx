import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

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

export function Router({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const navigate = useCallback((to: string) => {
    history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const value = useMemo(() => ({ ...state, navigate }), [state, navigate]);

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
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
  children: ReactNode;
}) {
  const { pathname } = useRouter();
  if (pathname !== path) return null;
  return <>{children}</>;
}
