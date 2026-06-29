import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppRecord,
  DesktopState,
  Notification,
  User,
  UserSettings,
} from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorBoundary } from "../../lib/ErrorBoundary";
import { QueryErrorCard } from "../../lib/feedback";
import { type OpenApp, useDesktopStore } from "../../lib/desktop-state";
import { cn } from "../../lib/ui";
import { appLabel, appRegistry } from "./appRegistry";
import { MenuBar } from "./MenuBar";
import { StartMenu } from "./StartMenu";
import { DesktopIcon, AppIcon } from "./DesktopIcon";
import { AppWindow } from "./AppWindow";
import { Dock } from "./Dock";

export function DesktopShell({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const {
    openApps,
    activeApp,
    startOpen,
    openApp,
    closeApp,
    setStartOpen,
    setActiveApp,
    hydrateOpenedApps,
    windowPositions,
    setWindowPosition,
  } = useDesktopStore();
  const apps = useQuery({
    queryKey: ["apps"],
    queryFn: () => api<{ apps: AppRecord[] }>("/api/apps"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ settings: UserSettings }>("/api/settings"),
  });
  const desktop = useQuery({
    queryKey: ["desktop-state"],
    queryFn: () => api<{ desktopState: DesktopState }>("/api/desktop/state"),
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: Notification[] }>("/api/notifications"),
  });

  const installedApps =
    apps.data?.apps.filter((app) => app.installed || app.id === "store") ?? [];

  const allNotifications = notifications.data?.notifications ?? [];
  const messengerUnread = allNotifications.filter(
    (item) => !item.read && item.type === "message",
  ).length;
  const gopostUnread = allNotifications.filter(
    (item) => !item.read && item.type !== "message",
  ).length;

  const darkMode = settings.data?.settings.darkMode === true;

  const openedAppsJson =
    JSON.stringify(desktop.data?.desktopState.openedApps) ?? null;

  useEffect(() => {
    if (!desktop.data?.desktopState.openedApps.length) return;
    hydrateOpenedApps(desktop.data.desktopState.openedApps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAppsJson]);

  useEffect(() => {
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`,
    );
    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    return () => socket.close();
  }, [queryClient]);

  const wallpaper = settings.data?.settings.wallpaper ?? "dev-bright";
  const bootError = apps.error ?? settings.error ?? desktop.error;

  if (bootError) {
    return (
      <main className="grid min-h-screen place-items-center bg-wallpaper p-4 font-display">
        <QueryErrorCard
          title="Desktop failed to load"
          error={bootError}
          onRetry={() => {
            void apps.refetch();
            void settings.refetch();
            void desktop.refetch();
          }}
          className="w-full max-w-xl"
        />
      </main>
    );
  }

  return (
    <main
      className={cn(
        "desktop-root min-h-screen overflow-hidden bg-wallpaper p-3 pb-32 pt-12 font-display sm:p-4 sm:pb-28",
        "dark:bg-slate-900",
        wallpaper === "sunset" && "bg-wallpaper-sunset",
        darkMode && "dark",
      )}
    >
      <MenuBar
        user={user}
        startOpen={startOpen}
        setStartOpen={setStartOpen}
        notifications={notifications}
        darkMode={darkMode}
      />

      {startOpen && (
        <StartMenu
          apps={installedApps}
          onOpen={(app) => openApp(app as OpenApp)}
        />
      )}

      <section
        className={cn(
          "welcome-card ml-0 mt-7 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/30 p-5 text-white shadow-glass backdrop-blur md:ml-5 md:p-6",
          "dark:border-slate-600 dark:bg-slate-800/30",
        )}
      >
        <h1 className="text-3xl font-black md:text-5xl">macOS Dev 3.4.6</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/95">
          Welcome back, {user.displayName}. Notes Mini, Pixel Paint, editable
          profiles, real GOpost follow counts, and installable PWA support are
          now live on the desktop.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/95">
          <span className="rounded-full bg-white/20 px-3 py-1">Notes Mini</span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            Pixel Paint
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            GOpost Profiles
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            Installable Web App
          </span>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:hidden">
        {installedApps.map((app) => (
          <button
            key={app.id}
            type="button"
            className="rounded-2xl border border-white/45 bg-white/25 p-3 text-left text-white shadow-glass backdrop-blur"
            onClick={() => openApp(app.id as OpenApp)}
          >
            <div className="flex items-center gap-3">
              <AppIcon app={app.id} />
              <div>
                <div className="font-black">{app.name}</div>
                <div className="text-xs text-white/80">{app.category}</div>
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="absolute right-5 top-16 hidden gap-4 md:grid">
        {installedApps.map((app) => (
          <DesktopIcon
            key={app.id}
            app={app}
            onOpen={() => openApp(app.id as OpenApp)}
          />
        ))}
      </section>

      <section className="window-layer pointer-events-none absolute inset-x-4 bottom-28 top-12">
        {openApps.map((app) => {
          const entry = appRegistry[app];
          return (
            <AppWindow
              key={app}
              app={app}
              active={activeApp === app}
              title={appLabel(app)}
              position={windowPositions[app]}
              onMove={(pos) => setWindowPosition(app, pos)}
              onClose={() => closeApp(app)}
              onFocus={() => setActiveApp(app)}
            >
              <ErrorBoundary
                title={`${appLabel(app)} crashed`}
                fallbackClassName="m-4 grid gap-3 p-4"
              >
                {entry ? (
                  entry.render({ user, openApp })
                ) : (
                  <div className="p-4 text-sm text-slate-500">
                    Unknown app: {app}
                  </div>
                )}
              </ErrorBoundary>
            </AppWindow>
          );
        })}
      </section>

      <Dock
        installedApps={installedApps}
        messengerUnread={messengerUnread}
        gopostUnread={gopostUnread}
        onOpen={openApp}
      />
    </main>
  );
}
