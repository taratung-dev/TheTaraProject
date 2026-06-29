import { useEffect, useState } from "react";
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
import { BatteryFull, ChevronRight, LogOut, Wifi } from "lucide-react";
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

function useLiveTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function AuthForm() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"Login" | "Sign Up">("Login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const time = useLiveTime();
  const timeString = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-tr from-lime-400 via-green-500 to-indigo-500 font-display selection:bg-white/30">
      {/* Top Bar */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-end gap-3 p-3 pr-5 text-sm font-semibold text-white/90 drop-shadow-sm">
        <span>U.S.</span>
        <Wifi size={16} />
        <BatteryFull size={18} />
      </header>

      {/* Clock Area */}
      <section className="mt-[12vh] flex select-none flex-col items-center text-white drop-shadow-md">
        <h2 className="text-xl font-medium tracking-wide text-white/90">
          {dateString}
        </h2>
        <h1 className="text-[7rem] font-bold leading-none tracking-tighter sm:text-[9rem]">
          {timeString}
        </h1>
      </section>

      {/* Login Area */}
      <section className="absolute bottom-[20vh] left-1/2 flex -translate-x-1/2 flex-col items-center sm:bottom-[25vh]">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-end justify-center overflow-hidden rounded-full bg-slate-200 shadow-2xl ring-2 ring-white/20">
            <svg
              className="h-16 w-16 text-slate-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0 2c-5.33 0-8 2.67-8 8h16c0-5.33-2.67-8-8-8z" />
            </svg>
          </div>
          {/* Active green dot */}
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-400 bg-green-500 shadow-sm">
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Dynamic Form */}
        <form
          className="flex w-64 flex-col items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            auth.mutate();
          }}
        >
          {error && (
            <div className="mb-1 w-full rounded-lg bg-red-500/80 px-3 py-1.5 text-center text-xs font-semibold text-white backdrop-blur-md">
              {error}
            </div>
          )}

          <div className="w-full">
            <input
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-center text-sm font-semibold text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/60 focus:bg-white/20 focus:ring-2 focus:ring-white/40"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {mode === "Sign Up" && (
            <div className="w-full">
              <input
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-center text-sm font-semibold text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/60 focus:bg-white/20 focus:ring-2 focus:ring-white/40"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="group relative w-full">
            <input
              type="password"
              className="w-full rounded-full border border-white/20 bg-white/10 py-1.5 pl-4 pr-10 text-center text-sm font-semibold text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/60 focus:bg-white/20 focus:ring-2 focus:ring-white/40"
              placeholder={
                mode === "Sign Up" ? "Create Password" : "Enter Password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={auth.isPending}
              className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 transition-opacity hover:bg-white/40 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>

          <button
            type="button"
            className="mt-3 text-[11px] font-semibold tracking-wide text-white/70 transition-colors hover:text-white"
            onClick={() => {
              setMode(mode === "Login" ? "Sign Up" : "Login");
              setError("");
            }}
          >
            {mode === "Login" ? "New? Create an account" : "Cancel sign up"}
          </button>
        </form>
      </section>
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
