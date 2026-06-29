import { create } from "zustand";
import { persist } from "zustand/middleware";

export const OPEN_APPS = [
  "gopost",
  "store",
  "settings",
  "minecraft",
  "messenger",
  "browser",
  "notes",
  "paint",
] as const;

export type OpenApp = (typeof OPEN_APPS)[number];

const DEFAULT_OPEN_APPS: OpenApp[] = ["gopost", "store"];

export function isOpenApp(value: string): value is OpenApp {
  return (OPEN_APPS as readonly string[]).includes(value);
}

export function normalizeOpenApps(apps: readonly string[]): OpenApp[] {
  const normalized: OpenApp[] = [];
  for (const app of apps) {
    if (!isOpenApp(app) || normalized.includes(app)) continue;
    normalized.push(app);
  }
  return normalized;
}

export type WindowPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DesktopStore = {
  openApps: OpenApp[];
  recentApps: OpenApp[];
  activeApp: OpenApp | null;
  startOpen: boolean;
  windowPositions: Partial<Record<OpenApp, WindowPosition>>;
  openApp: (app: OpenApp) => void;
  closeApp: (app: OpenApp) => void;
  setStartOpen: (open: boolean) => void;
  setActiveApp: (app: OpenApp) => void;
  setWindowPosition: (app: OpenApp, position: WindowPosition) => void;
  hydrateDesktopState: (state: {
    openedApps: readonly string[];
    recentApps?: readonly string[];
  }) => void;
};

export const useDesktopStore = create<DesktopStore>()(
  persist(
    (set) => ({
      openApps: DEFAULT_OPEN_APPS,
      recentApps: DEFAULT_OPEN_APPS,
      activeApp: DEFAULT_OPEN_APPS[0],
      startOpen: false,
      windowPositions: {},
      openApp: (app) =>
        set((state) => ({
          openApps: state.openApps.includes(app)
            ? state.openApps
            : [...state.openApps, app],
          recentApps: normalizeOpenApps([
            ...state.recentApps.filter((item) => item !== app),
            app,
          ]),
          activeApp: app,
          startOpen: false,
        })),
      closeApp: (app) =>
        set((state) => {
          const openApps = state.openApps.filter((item) => item !== app);
          return {
            openApps,
            activeApp:
              state.activeApp === app
                ? (openApps[openApps.length - 1] ?? null)
                : state.activeApp,
          };
        }),
      setStartOpen: (startOpen) => set({ startOpen }),
      setActiveApp: (activeApp) => set({ activeApp }),
      setWindowPosition: (app, position) =>
        set((state) => ({
          windowPositions: { ...state.windowPositions, [app]: position },
        })),
      hydrateDesktopState: ({ openedApps, recentApps }) =>
        set((state) => {
          const openApps = normalizeOpenApps(openedApps);
          const nextRecentApps = recentApps
            ? normalizeOpenApps(recentApps)
            : state.recentApps.length
              ? normalizeOpenApps(state.recentApps)
              : openApps;
          return {
            openApps,
            recentApps: nextRecentApps,
            activeApp:
              state.activeApp && openApps.includes(state.activeApp)
                ? state.activeApp
                : (openApps[openApps.length - 1] ?? null),
          };
        }),
    }),
    {
      name: "macos-dev-desktop-state",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<DesktopStore>;
        const openApps = Array.isArray(persisted.openApps)
          ? normalizeOpenApps(persisted.openApps)
          : currentState.openApps;
        const recentApps = Array.isArray(persisted.recentApps)
          ? normalizeOpenApps(persisted.recentApps)
          : currentState.recentApps;
        const activeApp =
          typeof persisted.activeApp === "string" &&
          isOpenApp(persisted.activeApp)
            ? persisted.activeApp
            : currentState.activeApp;

        return {
          ...currentState,
          ...persisted,
          openApps,
          recentApps,
          activeApp:
            activeApp && openApps.includes(activeApp)
              ? activeApp
              : (openApps[openApps.length - 1] ?? null),
        };
      },
    },
  ),
);
