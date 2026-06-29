import type { AppRecord, Note, PaintDrawing } from "../../lib/types";
import { Button, Card } from "../../lib/ui";
import { AppIcon } from "./DesktopIcon";

function previewText(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact || fallback;
}

export function StartMenu({
  apps,
  recentApps,
  recentNote,
  recentDrawing,
  onOpen,
}: {
  apps: AppRecord[];
  recentApps: AppRecord[];
  recentNote: Note | null;
  recentDrawing: PaintDrawing | null;
  onOpen: (app: string) => void;
}) {
  return (
    <Card className="fixed left-3 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-sm p-3 shadow-glass">
      <div className="border-b border-slate-200 px-2 pb-3 text-lg font-black text-ocean">
        macOS Dev 3.4.6
      </div>

      {recentApps.length > 0 && (
        <div className="mt-3">
          <div className="px-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
            Recent apps
          </div>
          <div className="mt-2 grid gap-1">
            {recentApps.slice(0, 3).map((app) => (
              <Button
                key={`recent-${app.id}`}
                variant="ghost"
                className="justify-start"
                onClick={() => onOpen(app.id)}
              >
                <AppIcon app={app.id} />
                Resume {app.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 px-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Latest note
          </div>
          <div className="mt-1 font-black text-ocean">
            {recentNote?.title || "No notes yet"}
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
            {recentNote
              ? previewText(recentNote.body, "Empty note")
              : "Open Notes Mini to jot down your next idea."}
          </div>
          <Button
            variant="soft"
            className="mt-3 w-full justify-center"
            onClick={() => onOpen("notes")}
          >
            {recentNote ? "Continue in Notes" : "Open Notes Mini"}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Latest canvas
          </div>
          <div className="mt-1 font-black text-ocean">
            {recentDrawing?.name || "No canvas yet"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            {recentDrawing
              ? `${recentDrawing.width} × ${recentDrawing.height} pixels · updated ${new Date(recentDrawing.updatedAt).toLocaleDateString()}`
              : "Launch Pixel Paint to start a new retro canvas."}
          </div>
          <Button
            variant="soft"
            className="mt-3 w-full justify-center"
            onClick={() => onOpen("paint")}
          >
            {recentDrawing ? "Open Pixel Paint" : "Create a Canvas"}
          </Button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-200 px-2 pt-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
        Apps
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
