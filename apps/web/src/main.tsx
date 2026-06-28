import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { Session } from "./lib/types";
import { api } from "./lib/api";
import { Button, Card, Input, Tabs } from "./lib/ui";
import { DesktopShell } from "./features/desktop/DesktopShell";
import { GOpostClassic } from "./features/gopost/GOpostClassic";
import "./styles.css";

const queryClient = new QueryClient();

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function App() {
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<Session>("/api/auth/me") });
  if (location.pathname === "/gopost") {
    if (session.isLoading) return <div className="grid min-h-screen place-items-center bg-gopost-grid font-display font-bold text-ocean">Loading GOpost...</div>;
    return <GOpostClassic user={session.data?.user ?? null} />;
  }
  if (session.isLoading) return <div className="grid min-h-screen place-items-center bg-wallpaper font-display font-bold text-white">Starting macOS Dev 3.4.6...</div>;
  if (!session.data?.user) return <LoginScreen />;
  return <DesktopShell user={session.data.user} />;
}

function LoginScreen() {
  const [mode, setMode] = useState("Login");
  const [username, setUsername] = useState("demo");
  const [displayName, setDisplayName] = useState("Tara Games");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const auth = useMutation({
    mutationFn: async () => {
      const path = mode === "Login" ? "/api/auth/login" : "/api/auth/signup";
      const payload = mode === "Login" ? { username, password } : { username, displayName, password };
      return api<Session>(path, { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (data) => queryClient.setQueryData(["session"], data),
    onError: (err) => setError(err instanceof Error ? err.message : "Authentication failed")
  });

  useEffect(() => setError(""), [mode]);

  return (
    <main className="grid min-h-screen place-items-center bg-wallpaper p-4 font-display">
      <Card className="w-full max-w-md p-6 shadow-glass">
        <div className="text-sm font-bold text-ocean">macOS Dev 3.4.6</div>
        <h1 className="mt-2 text-4xl font-black text-ink">GOpost! Platform</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to open the desktop, Store, GOpost, Messenger, Settings, and Minecraft Launcher.</p>
        <div className="mt-5"><Tabs tabs={["Login", "Signup"]} active={mode} onChange={setMode} /></div>
        <form className="mt-5 grid gap-3" onSubmit={(event) => { event.preventDefault(); auth.mutate(); }}>
          <label className="grid gap-1 text-sm font-bold">Username<Input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          {mode === "Signup" && <label className="grid gap-1 text-sm font-bold">Display name<Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label className="grid gap-1 text-sm font-bold">Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
          <Button disabled={auth.isPending}>{auth.isPending ? "Working..." : mode === "Login" ? "Enter Desktop" : "Create Account"}</Button>
        </form>
      </Card>
    </main>
  );
}

export function LogoutButton() {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData(["session"], { user: null })
  });
  return <Button variant="soft" className="h-7 px-2 py-1 text-xs" onClick={() => logout.mutate()}><LogOut size={14} />Logout</Button>;
}

createRoot(document.getElementById("root")!).render(<Root />);
