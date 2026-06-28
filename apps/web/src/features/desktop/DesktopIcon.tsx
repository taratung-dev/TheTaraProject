import type { AppRecord } from "../../lib/types";
import { Badge, cn } from "../../lib/ui";
import { appShort } from "./appRegistry";

export function DesktopIcon({ app, onOpen }: { app: AppRecord; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="grid w-24 justify-items-center gap-2 text-center text-xs font-bold text-white drop-shadow"
      onClick={onOpen}
    >
      <AppIcon app={app.id} />
      {app.name}
    </button>
  );
}

export function DockButton({
  app,
  unread,
  onOpen,
}: {
  app: AppRecord;
  unread: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "app-tile relative transition hover:-translate-y-2 hover:scale-110",
        app.id,
      )}
      onClick={onOpen}
    >
      {appShort(app.id)}
      {unread > 0 && (
        <Badge className="absolute -right-2 -top-2 px-1">{unread}</Badge>
      )}
    </button>
  );
}

export function AppIcon({ app }: { app: string }) {
  return <span className={cn("app-tile", app)}>{appShort(app)}</span>;
}
