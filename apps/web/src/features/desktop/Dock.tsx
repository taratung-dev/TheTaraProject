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
        "fixed bottom-3 left-1/2 z-50 flex min-h-20 max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-end justify-center gap-3 overflow-x-auto rounded-3xl border border-white/60 bg-white/40 px-3 py-3 shadow-dock backdrop-blur-xl sm:bottom-4 sm:max-w-none sm:flex-nowrap sm:px-4",
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
