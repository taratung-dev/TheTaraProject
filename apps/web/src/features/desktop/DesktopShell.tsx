import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppRecord,
  DesktopState,
  Note,
  Notification,
  PaintDrawing,
  User,
  UserSettings,
} from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorBoundary } from "../../lib/ErrorBoundary";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import {
  normalizeOpenApps,
  type OpenApp,
  useDesktopStore,
} from "../../lib/desktop-state";
import { Button, cn } from "../../lib/ui";
import { useDebounce } from "../../lib/useDebounce";
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
    recentApps,
    activeApp,
    startOpen,
    openApp,
    closeApp,
    setStartOpen,
    setActiveApp,
    hydrateDesktopState,
    windowPositions,
    setWindowPosition,
  } = useDesktopStore();
  const apps = useQuery({
    queryKey: ["apps"],
    queryFn: () => api<{ apps: AppRecord[] }>("/api/apps"),
  });
  const syncDesktopState = useMutation({
    mutationFn: (nextState: { openedApps: OpenApp[]; recentApps: OpenApp[] }) =>
      api<{ desktopState: DesktopState }>("/api/desktop/state", {
        method: "PATCH",
        body: JSON.stringify(nextState),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["desktop-state"], data);
    },
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
  const notes = useQuery({
    queryKey: ["notes"],
    queryFn: () => api<{ notes: Note[] }>("/api/notes"),
  });
  const drawings = useQuery({
    queryKey: ["paint-drawings"],
    queryFn: () => api<{ drawings: PaintDrawing[] }>("/api/paint/drawings"),
  });

  const installedApps =
    apps.data?.apps.filter((app) => app.installed || app.id === "store") ?? [];
  const dockAppIds = desktop.data?.desktopState.dockApps ?? [];
  const launcherApps = useMemo(() => {
    const installedAppsById = new Map(
      installedApps.map((app) => [app.id, app] as const),
    );
    const pinnedAppIds = new Set(dockAppIds);
    const pinnedApps = dockAppIds
      .map((appId) => installedAppsById.get(appId))
      .filter((app): app is AppRecord => Boolean(app));
    const extraApps = installedApps.filter((app) => !pinnedAppIds.has(app.id));
    return [...pinnedApps, ...extraApps];
  }, [dockAppIds, installedApps]);

  const allNotifications = notifications.data?.notifications ?? [];
  const messengerUnread = allNotifications.filter(
    (item) => !item.read && item.type === "message",
  ).length;
  const gopostUnread = allNotifications.filter(
    (item) => !item.read && item.type !== "message",
  ).length;

  const darkMode = settings.data?.settings.darkMode === true;

  const recentNote = notes.data?.notes[0] ?? null;
  const recentDrawing = drawings.data?.drawings[0] ?? null;
  const serverOpenedApps = useMemo(
    () => normalizeOpenApps(desktop.data?.desktopState.openedApps ?? []),
    [desktop.data?.desktopState.openedApps],
  );
  const serverRecentApps = useMemo(
    () =>
      normalizeOpenApps(
        desktop.data?.desktopState.recentApps ??
          desktop.data?.desktopState.openedApps ??
          [],
      ),
    [
      desktop.data?.desktopState.openedApps,
      desktop.data?.desktopState.recentApps,
    ],
  );
  const serverDesktopStateJson = useMemo(
    () =>
      JSON.stringify({
        openedApps: serverOpenedApps,
        recentApps: serverRecentApps,
      }),
    [serverOpenedApps, serverRecentApps],
  );
  const debouncedOpenApps = useDebounce(openApps, 400);
  const debouncedRecentApps = useDebounce(recentApps, 400);
  const debouncedDesktopState = useMemo(
    () => ({
      openedApps: debouncedOpenApps,
      recentApps: debouncedRecentApps,
    }),
    [debouncedOpenApps, debouncedRecentApps],
  );
  const debouncedDesktopStateJson = useMemo(
    () => JSON.stringify(debouncedDesktopState),
    [debouncedDesktopState],
  );
  const [desktopHydrated, setDesktopHydrated] = useState(false);
  const lastDesktopSyncRequest = useRef<string | null>(null);
  const recentNotePreview = recentNote
    ? recentNote.body.replace(/\s+/g, " ").trim() || "Empty note"
    : "Open Notes Mini to capture ideas, plans, and checklists.";
  const recentDrawingSummary = recentDrawing
    ? `${recentDrawing.width} × ${recentDrawing.height} pixels · updated ${new Date(recentDrawing.updatedAt).toLocaleDateString()}`
    : "Launch Pixel Paint to start a new retro canvas.";
  const recentAppRecords = useMemo(() => {
    const launcherAppsById = new Map(
      launcherApps.map((app) => [app.id, app] as const),
    );
    return recentApps
      .slice()
      .reverse()
      .map((appId) => launcherAppsById.get(appId))
      .filter((app): app is AppRecord => Boolean(app));
  }, [launcherApps, recentApps]);

  useEffect(() => {
    if (!desktop.isSuccess || desktopHydrated) return;
    hydrateDesktopState({
      openedApps: serverOpenedApps,
      recentApps: serverRecentApps,
    });
    setDesktopHydrated(true);
  }, [
    desktop.isSuccess,
    desktopHydrated,
    hydrateDesktopState,
    serverOpenedApps,
    serverRecentApps,
  ]);

  useEffect(() => {
    if (!desktop.isSuccess || !desktopHydrated) return;
    if (debouncedDesktopStateJson === serverDesktopStateJson) {
      lastDesktopSyncRequest.current = null;
      return;
    }
    if (syncDesktopState.isPending) return;
    if (lastDesktopSyncRequest.current === debouncedDesktopStateJson) return;
    lastDesktopSyncRequest.current = debouncedDesktopStateJson;
    syncDesktopState.mutate(debouncedDesktopState);
  }, [
    debouncedDesktopState,
    debouncedDesktopStateJson,
    desktop.isSuccess,
    desktopHydrated,
    serverDesktopStateJson,
    syncDesktopState,
  ]);

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

      {syncDesktopState.isError && (
        <div className="fixed left-1/2 top-12 z-50 w-full max-w-sm -translate-x-1/2 px-3">
          <ErrorNotice
            error={syncDesktopState.error}
            message="Desktop session changes could not be saved."
          />
        </div>
      )}

      {startOpen && (
        <StartMenu
          apps={launcherApps}
          recentApps={recentAppRecords}
          recentNote={recentNote}
          recentDrawing={recentDrawing}
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => openApp("notes")}>
            {recentNote ? "Continue writing" : "Open Notes"}
          </Button>
          <Button variant="soft" onClick={() => openApp("paint")}>
            {recentDrawing ? "Open latest canvas" : "Open Paint"}
          </Button>
          <Button variant="soft" onClick={() => openApp("settings")}>
            Edit profile
          </Button>
        </div>
      </section>

      <section className="mt-4 grid max-w-5xl gap-4 md:ml-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div
          className={cn(
            "rounded-2xl border border-white/60 bg-white/25 p-4 text-white shadow-glass backdrop-blur",
            "dark:border-slate-600 dark:bg-slate-800/30",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Recent work</h2>
              <p className="text-sm text-white/85">
                Jump back into your latest notes and pixel art from the desktop.
              </p>
            </div>
            {recentAppRecords.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px] font-bold text-white/90">
                {recentAppRecords.slice(0, 3).map((app) => (
                  <button
                    key={`recent-chip-${app.id}`}
                    type="button"
                    className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
                    onClick={() => openApp(app.id as OpenApp)}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-2xl border border-white/20 bg-black/10 p-4 text-left transition hover:bg-black/15"
              onClick={() => openApp("notes")}
            >
              <div className="text-[11px] font-black uppercase tracking-wide text-white/70">
                Latest note
              </div>
              <div className="mt-1 text-lg font-black">
                {recentNote?.title || "No notes yet"}
              </div>
              <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/85">
                {recentNotePreview}
              </div>
              <div className="mt-3 text-xs font-bold text-white/90">
                {recentNote
                  ? `Updated ${new Date(recentNote.updatedAt).toLocaleDateString()}`
                  : "Create your first note"}
              </div>
            </button>

            <button
              type="button"
              className="rounded-2xl border border-white/20 bg-black/10 p-4 text-left transition hover:bg-black/15"
              onClick={() => openApp("paint")}
            >
              <div className="text-[11px] font-black uppercase tracking-wide text-white/70">
                Latest canvas
              </div>
              <div className="mt-1 text-lg font-black">
                {recentDrawing?.name || "No canvas yet"}
              </div>
              <div className="mt-2 text-sm leading-6 text-white/85">
                {recentDrawingSummary}
              </div>
              <div className="mt-3 text-xs font-bold text-white/90">
                {recentDrawing ? "Open Pixel Paint" : "Start a new canvas"}
              </div>
            </button>
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border border-white/60 bg-white/25 p-4 text-white shadow-glass backdrop-blur",
            "dark:border-slate-600 dark:bg-slate-800/30",
          )}
        >
          <h2 className="text-lg font-black">Desktop flow</h2>
          <p className="mt-1 text-sm leading-6 text-white/85">
            Your launcher now keeps the latest apps nearby, so it is faster to
            jump back into notes, paint, and settings.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => openApp("notes")}>
              Notes Mini
            </Button>
            <Button variant="soft" onClick={() => openApp("paint")}>
              Pixel Paint
            </Button>
            <Button variant="soft" onClick={() => openApp("settings")}>
              Settings
            </Button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/20 bg-black/10 p-3 text-sm text-white/85">
            {recentAppRecords.length > 0
              ? `Recently launched: ${recentAppRecords
                  .slice(0, 4)
                  .map((app) => app.name)
                  .join(" · ")}`
              : "Launch an app from the dock or Start menu to build your recent activity list."}
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:hidden">
        {launcherApps.map((app) => (
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
        {launcherApps.map((app) => (
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
        installedApps={launcherApps}
        messengerUnread={messengerUnread}
        gopostUnread={gopostUnread}
        onOpen={openApp}
      />
    </main>
  );
}
