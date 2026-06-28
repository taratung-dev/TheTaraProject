import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu } from "lucide-react";
import type { AppRecord, DesktopState, Notification, User, UserSettings } from "../../lib/types";
import { api } from "../../lib/api";
import { type OpenApp, useDesktopStore } from "../../lib/desktop-state";
import { Badge, Button, Card, ScrollArea, Tooltip, cn } from "../../lib/ui";
import { GOpostApp } from "../gopost/GOpostApp";
import { StoreApp } from "../store/StoreApp";
import { SettingsApp } from "../settings/SettingsApp";
import { MessengerApp } from "../messenger/MessengerApp";
import { MinecraftApp } from "../minecraft/MinecraftApp";
import { BrowserApp } from "../browser/BrowserApp";

const labels: Record<string, string> = {
  gopost: "GOpost!",
  store: "Store",
  settings: "Settings",
  minecraft: "Minecraft",
  messenger: "Messenger",
  browser: "Browser",
  notes: "Notes Mini",
  paint: "Pixel Paint"
};

const shorts: Record<string, string> = {
  gopost: "GO",
  store: "Store",
  settings: "Set",
  minecraft: "MC",
  messenger: "Msg",
  browser: "Web",
  notes: "Note",
  paint: "Paint"
};

export function DesktopShell({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const { openApps, activeApp, startOpen, openApp, closeApp, setStartOpen, setActiveApp, hydrateOpenedApps } = useDesktopStore();
  const apps = useQuery({ queryKey: ["apps"], queryFn: () => api<{ apps: AppRecord[] }>("/api/apps") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ settings: UserSettings }>("/api/settings") });
  const desktop = useQuery({ queryKey: ["desktop-state"], queryFn: () => api<{ desktopState: DesktopState }>("/api/desktop/state") });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ notifications: Notification[] }>("/api/notifications") });
  const installedApps = apps.data?.apps.filter((app) => app.installed || app.id === "store") ?? [];
  const unread = notifications.data?.notifications.filter((item) => !item.read).length ?? 0;

  useEffect(() => {
    if (desktop.data?.desktopState.openedApps.length) hydrateOpenedApps(desktop.data.desktopState.openedApps);
  }, [desktop.data?.desktopState.openedApps.join("|")]);

  useEffect(() => {
    const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`);
    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    return () => socket.close();
  }, [queryClient]);

  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData(["session"], { user: null })
  });

  const wallpaper = settings.data?.settings.wallpaper ?? "dev-bright";

  return (
    <main className={cn("desktop-root min-h-screen overflow-hidden bg-wallpaper p-4 pb-28 pt-12 font-display", wallpaper === "sunset" && "bg-wallpaper-sunset")}>
      <header className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-between border-b border-white/50 bg-white/70 px-3 text-xs font-bold backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Button variant={startOpen ? "primary" : "soft"} className="h-6 rounded-full px-3 py-1 text-xs" onClick={() => setStartOpen(!startOpen)}><Menu size={14} />Start</Button>
          <span>macOS Dev</span><span className="hidden sm:inline">File</span><span className="hidden sm:inline">Edit</span><span className="hidden sm:inline">Window</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{user.displayName}</span>
          <Tooltip label="Unread notifications"><span className="relative inline-flex"><Bell size={15} />{unread > 0 && <Badge className="absolute -right-3 -top-2 px-1">{unread}</Badge>}</span></Tooltip>
          <Button variant="soft" className="h-6 px-2 py-1 text-xs" onClick={() => logout.mutate()}><LogOut size={14} />Logout</Button>
        </div>
      </header>

      {startOpen && <StartMenu apps={installedApps} onOpen={(app) => openApp(app as OpenApp)} />}

      <section className="welcome-card ml-0 mt-7 w-full max-w-2xl rounded-2xl border border-white/60 bg-white/30 p-6 text-white shadow-glass backdrop-blur md:ml-5">
        <h1 className="text-4xl font-black md:text-5xl">macOS Dev 3.4.6</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/95">Welcome back, {user.displayName}. This desktop is now powered by a local gateway plus Auth, Social, Realtime, and Platform services.</p>
      </section>

      <section className="absolute right-5 top-16 hidden gap-4 md:grid">
        {installedApps.map((app) => <DesktopIcon key={app.id} app={app} onOpen={() => openApp(app.id as OpenApp)} />)}
      </section>

      <section className="window-layer pointer-events-none absolute inset-x-4 bottom-28 top-12">
        {openApps.map((app) => (
          <AppWindow key={app} app={app} active={activeApp === app} title={labels[app] ?? app} onClose={() => closeApp(app)} onFocus={() => setActiveApp(app)}>
            {app === "gopost" && <GOpostApp user={user} />}
            {app === "store" && <StoreApp onOpen={(next) => openApp(next as OpenApp)} />}
            {app === "settings" && <SettingsApp />}
            {app === "minecraft" && <MinecraftApp />}
            {app === "messenger" && <MessengerApp />}
            {app === "browser" && <BrowserApp user={user} />}
            {app === "notes" && <Card className="p-4"><h2 className="text-xl font-black">Notes Mini</h2><p className="mt-2 text-sm text-slate-600">Installed and ready for a future notes service.</p></Card>}
            {app === "paint" && <Card className="p-4"><h2 className="text-xl font-black">Pixel Paint</h2><p className="mt-2 text-sm text-slate-600">Installed and ready for a future creative app.</p></Card>}
          </AppWindow>
        ))}
      </section>

      <nav className="fixed bottom-4 left-1/2 z-50 flex min-h-20 -translate-x-1/2 items-end gap-3 overflow-x-auto rounded-3xl border border-white/60 bg-white/40 px-4 py-3 shadow-dock backdrop-blur-xl">
        {installedApps.map((app) => <DockButton key={app.id} app={app} unread={app.id === "messenger" || app.id === "gopost" ? unread : 0} onOpen={() => openApp(app.id as OpenApp)} />)}
      </nav>
    </main>
  );
}

function StartMenu({ apps, onOpen }: { apps: AppRecord[]; onOpen: (app: string) => void }) {
  return (
    <Card className="fixed left-3 top-12 z-50 w-72 p-3 shadow-glass">
      <div className="border-b border-slate-200 px-2 pb-3 text-lg font-black text-ocean">macOS Dev 3.4.6</div>
      <div className="mt-2 grid gap-1">{apps.map((app) => <Button key={app.id} variant="ghost" className="justify-start" onClick={() => onOpen(app.id)}><AppIcon app={app.id} />Open {app.name}</Button>)}</div>
    </Card>
  );
}

function DesktopIcon({ app, onOpen }: { app: AppRecord; onOpen: () => void }) {
  return <button className="grid w-24 justify-items-center gap-2 text-center text-xs font-bold text-white drop-shadow" onClick={onOpen}><AppIcon app={app.id} />{app.name}</button>;
}

function DockButton({ app, unread, onOpen }: { app: AppRecord; unread: number; onOpen: () => void }) {
  return <button className={cn("app-tile relative transition hover:-translate-y-2 hover:scale-110", app.id)} onClick={onOpen}>{shorts[app.id] ?? app.icon}{unread > 0 && <Badge className="absolute -right-2 -top-2 px-1">{unread}</Badge>}</button>;
}

function AppIcon({ app }: { app: string }) {
  return <span className={cn("app-tile", app)}>{shorts[app] ?? app}</span>;
}

function AppWindow({ app, title, active, children, onClose, onFocus }: { app: OpenApp; title: string; active: boolean; children: React.ReactNode; onClose: () => void; onFocus: () => void }) {
  return (
    <article className={cn("window pointer-events-auto absolute overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-glass backdrop-blur-xl", app, active && "z-30 ring-2 ring-white/70")} onMouseDown={onFocus}>
      <div className="flex h-10 items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-100 px-3">
        <span className="flex gap-1.5"><i className="h-3 w-3 rounded-full bg-red-400" /><i className="h-3 w-3 rounded-full bg-yellow-400" /><i className="h-3 w-3 rounded-full bg-green-400" /></span>
        <b className="flex-1 text-center text-sm text-slate-700">{title}</b>
        <Button variant="danger" className="h-7 w-7 p-0" onClick={onClose}>x</Button>
      </div>
      <ScrollArea className="max-h-[calc(100vh-11rem)] p-4">{children}</ScrollArea>
    </article>
  );
}
