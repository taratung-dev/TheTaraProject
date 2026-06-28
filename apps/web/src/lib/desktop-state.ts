import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OpenApp = "gopost" | "store" | "settings" | "minecraft" | "messenger" | "browser" | "notes" | "paint";

type WindowPosition = { x: number; y: number; width: number };

type DesktopStore = {
  openApps: OpenApp[];
  activeApp: OpenApp | null;
  startOpen: boolean;
  windowPositions: Partial<Record<OpenApp, WindowPosition>>;
  openApp: (app: OpenApp) => void;
  closeApp: (app: OpenApp) => void;
  setStartOpen: (open: boolean) => void;
  setActiveApp: (app: OpenApp) => void;
  setWindowPosition: (app: OpenApp, position: WindowPosition) => void;
  hydrateOpenedApps: (apps: string[]) => void;
};

export const useDesktopStore = create<DesktopStore>()(persist((set) => ({
  openApps: ["gopost", "store"],
  activeApp: "gopost",
  startOpen: false,
  windowPositions: {},
  openApp: (app) => set((state) => ({
    openApps: state.openApps.includes(app) ? state.openApps : [...state.openApps, app],
    activeApp: app,
    startOpen: false
  })),
  closeApp: (app) => set((state) => ({
    openApps: state.openApps.filter((item) => item !== app),
    activeApp: state.activeApp === app ? null : state.activeApp
  })),
  setStartOpen: (startOpen) => set({ startOpen }),
  setActiveApp: (activeApp) => set({ activeApp }),
  setWindowPosition: (app, position) => set((state) => ({ windowPositions: { ...state.windowPositions, [app]: position } })),
  hydrateOpenedApps: (apps) => set({ openApps: apps as OpenApp[] })
}), {
  name: "macos-dev-desktop-state"
}));
