import type React from "react";
import type { User } from "../../lib/types";
import type { OpenApp } from "../../lib/desktop-state";
import { Card } from "../../lib/ui";
import { GOpostApp } from "../gopost/GOpostApp";
import { StoreApp } from "../store/StoreApp";
import { SettingsApp } from "../settings/SettingsApp";
import { MessengerApp } from "../messenger/MessengerApp";
import { MinecraftApp } from "../minecraft/MinecraftApp";
import { BrowserApp } from "../browser/BrowserApp";

type AppEntry = {
  label: string;
  short: string;
  render: (ctx: { user: User; openApp: (app: OpenApp) => void }) => React.ReactNode;
};

export const appRegistry: Record<string, AppEntry> = {
  gopost: {
    label: "GOpost!",
    short: "GO",
    render: ({ user }) => <GOpostApp user={user} />,
  },
  store: {
    label: "Store",
    short: "Store",
    render: ({ openApp }) => <StoreApp onOpen={(next) => openApp(next as OpenApp)} />,
  },
  settings: {
    label: "Settings",
    short: "Set",
    render: () => <SettingsApp />,
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
    render: () => (
      <Card className="p-4">
        <h2 className="text-xl font-black">Notes Mini</h2>
        <p className="mt-2 text-sm text-slate-600">
          Installed and ready for a future notes service.
        </p>
      </Card>
    ),
  },
  paint: {
    label: "Pixel Paint",
    short: "Paint",
    render: () => (
      <Card className="p-4">
        <h2 className="text-xl font-black">Pixel Paint</h2>
        <p className="mt-2 text-sm text-slate-600">
          Installed and ready for a future creative app.
        </p>
      </Card>
    ),
  },
};

export function appLabel(app: string): string {
  return appRegistry[app]?.label ?? app;
}

export function appShort(app: string): string {
  return appRegistry[app]?.short ?? app;
}
