import type { AppRecord } from "../../lib/types";
import { Button, Card } from "../../lib/ui";
import { AppIcon } from "./DesktopIcon";

export function StartMenu({
  apps,
  onOpen,
}: {
  apps: AppRecord[];
  onOpen: (app: string) => void;
}) {
  return (
    <Card className="fixed left-3 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-72 p-3 shadow-glass">
      <div className="border-b border-slate-200 px-2 pb-3 text-lg font-black text-ocean">
        macOS Dev 3.4.6
      </div>
      <div className="mt-2 grid gap-1">
        {apps.map((app) => (
          <Button
            key={app.id}
            variant="ghost"
            className="justify-start"
            onClick={() => onOpen(app.id)}
          >
            <AppIcon app={app.id} />
            Open {app.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
