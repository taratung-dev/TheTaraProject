import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type RouterState = {
  pathname: string;
  search: string;
};

type NavigateOptions = { replace?: boolean };

type RouterContextValue = RouterState & {
  navigate: (to: string, options?: NavigateOptions) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function currentRoute(): RouterState {
  return {
    pathname: location.pathname,
    search: location.search,
  };
}

export function Router({ children }: { children: ReactNode }) {
  const [state, setState] = useState(currentRoute);

  const syncState = useCallback(() => {
    const next = currentRoute();
    setState((current) =>
      current.pathname === next.pathname && current.search === next.search
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", syncState);
    return () => window.removeEventListener("popstate", syncState);
  }, [syncState]);

  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (options?.replace) {
        history.replaceState(null, "", to);
      } else {
        history.pushState(null, "", to);
      }
      syncState();
    },
    [syncState],
  );

  const value = useMemo(() => ({ ...state, navigate }), [state, navigate]);

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

/**
 * Returns the current route state and a `navigate` function.
 *
 * When called outside a `<Router>` provider this returns a **static snapshot**
 * of `location` at call-time and a `navigate` that updates the URL but will
 * NOT trigger a React re-render. Prefer wrapping your tree in `<Router>`.
 */
export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    return {
      ...currentRoute(),
      navigate: (to: string, options?: NavigateOptions) => {
        if (options?.replace) {
          history.replaceState(null, "", to);
        } else {
          history.pushState(null, "", to);
        }
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
