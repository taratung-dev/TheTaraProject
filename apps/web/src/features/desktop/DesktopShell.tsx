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
import { DesktopIcon } from "./DesktopIcon";
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

  useEffect(() => {
    if (desktop.data?.desktopState.openedApps.length) {
      hydrateOpenedApps(desktop.data.desktopState.openedApps);
    }
  }, [desktop.data?.desktopState.openedApps, hydrateOpenedApps]);

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
        "desktop-root min-h-screen overflow-hidden bg-wallpaper p-4 pb-28 pt-12 font-display",
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
          "welcome-card ml-0 mt-7 w-full max-w-2xl rounded-2xl border border-white/60 bg-white/30 p-6 text-white shadow-glass backdrop-blur md:ml-5",
          "dark:bg-slate-800/30 dark:border-slate-600",
        )}
      >
        <h1 className="text-4xl font-black md:text-5xl">macOS Dev 3.4.6</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/95">
          Welcome back, {user.displayName}. This desktop is now powered by a
          local gateway plus Auth, Social, Realtime, and Platform services.
        </p>
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
