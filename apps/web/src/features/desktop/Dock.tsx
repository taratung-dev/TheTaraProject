import type { AppRecord } from "../../lib/types";
import type { OpenApp } from "../../lib/desktop-state";
import { cn } from "../../lib/ui";
import { DockButton } from "./DesktopIcon";

export function Dock({
  installedApps,
  messengerUnread,
  gopostUnread,
  onOpen,
}: {
  installedApps: AppRecord[];
  messengerUnread: number;
  gopostUnread: number;
  onOpen: (app: OpenApp) => void;
}) {
  return (
    <nav
      className={cn(
        "fixed bottom-4 left-1/2 z-50 flex min-h-20 -translate-x-1/2 items-end gap-3 overflow-x-auto rounded-3xl border border-white/60 bg-white/40 px-4 py-3 shadow-dock backdrop-blur-xl",
        "dark:bg-slate-800/40 dark:border-slate-600",
      )}
    >
      {installedApps.map((app) => (
        <DockButton
          key={app.id}
          app={app}
          unread={
            app.id === "messenger"
              ? messengerUnread
              : app.id === "gopost"
                ? gopostUnread
                : 0
          }
          onOpen={() => onOpen(app.id as OpenApp)}
        />
      ))}
    </nav>
  );
}
