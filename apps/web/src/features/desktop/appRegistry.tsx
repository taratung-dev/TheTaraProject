import type React from "react";
import type { User } from "../../lib/types";
import type { OpenApp } from "../../lib/desktop-state";
import { GOpostApp } from "../gopost/GOpostApp";
import { StoreApp } from "../store/StoreApp";
import { SettingsApp } from "../settings/SettingsApp";
import { MessengerApp } from "../messenger/MessengerApp";
import { MinecraftApp } from "../minecraft/MinecraftApp";
import { BrowserApp } from "../browser/BrowserApp";
import { NotesApp } from "../notes/NotesApp";
import { PaintApp } from "../paint/PaintApp";

type AppEntry = {
  label: string;
  short: string;
  render: (ctx: {
    user: User;
    openApp: (app: OpenApp) => void;
  }) => React.ReactNode;
};

export const appRegistry: Record<string, AppEntry> = {
  gopost: {
    label: "GOpost!",
    short: "GO",
    render: ({ user, openApp }) => <GOpostApp user={user} openApp={openApp} />,
  },
  store: {
    label: "Store",
    short: "Store",
    render: ({ openApp }) => (
      <StoreApp onOpen={(next) => openApp(next as OpenApp)} />
    ),
  },
  settings: {
    label: "Settings",
    short: "Set",
    render: ({ user }) => <SettingsApp user={user} />,
  },
  minecraft: {
    label: "Minecraft",
    short: "MC",
    render: () => <MinecraftApp />,
  },
  messenger: {
    label: "Messenger",
    short: "Msg",
    render: () => <MessengerApp />,
  },
  browser: {
    label: "Browser",
    short: "Web",
    render: ({ user }) => <BrowserApp user={user} />,
  },
  notes: {
    label: "Notes Mini",
    short: "Note",
    render: () => <NotesApp />,
  },
  paint: {
    label: "Pixel Paint",
    short: "Paint",
    render: () => <PaintApp />,
  },
};

export function appLabel(app: string): string {
  return appRegistry[app]?.label ?? app;
}

export function appShort(app: string): string {
  return appRegistry[app]?.short ?? app;
}
