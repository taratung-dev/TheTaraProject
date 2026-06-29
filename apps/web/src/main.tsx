import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { Session } from "./lib/types";
import { api, apiErrorMessage } from "./lib/api";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import { FeedbackToasts, QueryErrorCard, reportUiError } from "./lib/feedback";
import { Router, useRouter } from "./lib/router";
import { Button, Card, Input, Tabs } from "./lib/ui";
import { DesktopShell } from "./features/desktop/DesktopShell";
import { GOpostClassic } from "./features/gopost/GOpostClassic";
import "./styles.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        reportUiError(error, "We couldn't refresh the latest data.");
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      reportUiError(error, "Your change could not be saved.");
    },
  }),
});

function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackToasts />
      <ErrorBoundary
        title="The app crashed"
        fallbackClassName="mx-auto mt-10 w-full max-w-xl p-6"
      >
        <Router>
          <App />
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function App() {
  const { pathname } = useRouter();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<Session>("/api/auth/me"),
  });

  if (pathname === "/gopost") {
    if (session.isLoading)
      return (
        <div className="grid min-h-screen place-items-center bg-gopost-grid font-display font-bold text-ocean">
          Loading GOpost...
        </div>
      );
    if (session.isError)
      return (
        <div className="bg-gopost-grid p-4">
          <QueryErrorCard
            title="GOpost could not start"
            error={session.error}
            onRetry={() => void session.refetch()}
            className="mx-auto mt-8 max-w-xl"
          />
        </div>
      );
    return <GOpostClassic user={session.data?.user ?? null} />;
  }

  if (session.isLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-wallpaper font-display font-bold text-white">
        Starting macOS Dev 3.4.6...
      </div>
    );
  if (session.isError)
    return (
      <main className="grid min-h-screen place-items-center bg-wallpaper p-4 font-display">
        <QueryErrorCard
          title="Desktop startup failed"
          error={session.error}
          onRetry={() => void session.refetch()}
          className="w-full max-w-xl"
        />
      </main>
    );
  if (!session.data?.user) return <AuthForm />;
  return <DesktopShell user={session.data.user} />;
}

function AuthForm() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"Login" | "Sign Up">("Login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const auth = useMutation({
    mutationFn: () =>
      mode === "Login"
        ? api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          })
        : api("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({ username, displayName, password }),
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["session"] }),
    onError: (err) => setError(apiErrorMessage(err, "Authentication failed")),
  });

  return (
    <main className="grid min-h-screen place-items-center bg-wallpaper p-4 font-display">
      <Card className="grid w-full max-w-sm gap-6 p-8">
        <div>
          <h1 className="text-3xl font-black text-ocean">macOS Dev</h1>
          <p className="text-sm text-slate-600">Version 3.4.6</p>
        </div>
        <Tabs
          tabs={["Login", "Sign Up"]}
          active={mode}
          onChange={(tab) => {
            setMode(tab as "Login" | "Sign Up");
            setError("");
          }}
        />
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            auth.mutate();
          }}
        >
          <label
            htmlFor="auth-username"
            className="grid gap-1 text-sm font-bold"
          >
            Username
          </label>
          <Input
            id="auth-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          {mode === "Sign Up" && (
            <>
              <label
                htmlFor="auth-display-name"
                className="grid gap-1 text-sm font-bold"
              >
                Display Name
              </label>
              <Input
                id="auth-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </>
          )}
          <label
            htmlFor="auth-password"
            className="grid gap-1 text-sm font-bold"
          >
            Password
          </label>
          <Input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <div className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
          <Button type="submit" disabled={auth.isPending}>
            {auth.isPending
              ? "Working..."
              : mode === "Login"
                ? "Enter Desktop"
                : "Create Account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function LogoutButton() {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData(["session"], { user: null }),
  });
  return (
    <Button
      type="button"
      variant="soft"
      className="h-7 px-2 py-1 text-xs"
      onClick={() => logout.mutate()}
    >
      <LogOut size={14} />
      Logout
    </Button>
  );
}

registerPwa();

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Root />);
}
