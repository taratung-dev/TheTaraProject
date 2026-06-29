import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaintDrawing } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { SkeletonCard } from "../../lib/Skeleton";
import { Button, Card, Input } from "../../lib/ui";

const palette = [
  "transparent",
  "#111827",
  "#ef4444",
  "#f59e0b",
  "#fde047",
  "#22c55e",
  "#0ea5e9",
  "#6366f1",
  "#d946ef",
  "#ffffff",
];

function drawingPreview(pixels: string[]) {
  const preview = pixels.slice(0, 16);
  const cells = Array.from({ length: preview.length }, (_, cellIndex) => ({
    cellIndex,
    pixel: preview[cellIndex],
  }));
  return cells.map(({ cellIndex, pixel }) => (
    <span
      key={`preview-${cellIndex}-${pixel}`}
      className="h-2.5 w-2.5 rounded-[2px] border border-slate-200"
      style={{ background: pixel === "transparent" ? "#ffffff" : pixel }}
    />
  ));
}

export function PaintApp() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("#111827");
  const [draftName, setDraftName] = useState("Untitled Canvas");
  const [draftPixels, setDraftPixels] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);

  const drawings = useQuery({
    queryKey: ["paint-drawings"],
    queryFn: () => api<{ drawings: PaintDrawing[] }>("/api/paint/drawings"),
  });

  const active =
    drawings.data?.drawings.find((item) => item.id === activeId) ??
    drawings.data?.drawings[0] ??
    null;

  const activeDrawingId = active?.id ?? null;

  useEffect(() => {
    if (!active) return;
    setActiveId(active.id);
    setDraftName(active.name);
    setDraftPixels(active.pixels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrawingId]);

  useEffect(() => {
    const stop = () => setDrawing(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const createDrawing = useMutation({
    mutationFn: () =>
      api<{ drawing: PaintDrawing }>("/api/paint/drawings", {
        method: "POST",
        body: JSON.stringify({ name: "New Canvas", width: 16, height: 16 }),
      }),
    onSuccess: ({ drawing }) => {
      queryClient.invalidateQueries({ queryKey: ["paint-drawings"] });
      setActiveId(drawing.id);
      setDraftName(drawing.name);
      setDraftPixels(drawing.pixels);
    },
  });

  const saveDrawing = useMutation({
    mutationFn: () =>
      api<{ drawing: PaintDrawing }>(`/api/paint/drawings/${activeId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: draftName, pixels: draftPixels }),
      }),
    onSuccess: ({ drawing }) => {
      queryClient.setQueryData<{ drawings: PaintDrawing[] }>(
        ["paint-drawings"],
        (current) => ({
          drawings: current?.drawings.map((item) =>
            item.id === drawing.id ? drawing : item,
          ) ?? [drawing],
        }),
      );
      setDraftName(drawing.name);
      setDraftPixels(drawing.pixels);
    },
  });

  const removeDrawing = useMutation({
    mutationFn: (drawingId: number) =>
      api(`/api/paint/drawings/${drawingId}`, { method: "DELETE" }),
    onSuccess: (_, drawingId) => {
      queryClient.setQueryData<{ drawings: PaintDrawing[] }>(
        ["paint-drawings"],
        (current) => ({
          drawings:
            current?.drawings.filter((item) => item.id !== drawingId) ?? [],
        }),
      );
      setActiveId((current) => (current === drawingId ? null : current));
    },
  });

  if (drawings.isError) {
    return (
      <QueryErrorCard
        title="Pixel Paint failed to load"
        error={drawings.error}
        onRetry={() => void drawings.refetch()}
        className="p-4"
      />
    );
  }

  if (!drawings.data) {
    return <SkeletonCard lines={6} className="p-4" />;
  }

  const paintPixel = (index: number) => {
    setDraftPixels((current) =>
      current.map((pixel, pixelIndex) =>
        pixelIndex === index ? selectedColor : pixel,
      ),
    );
  };

  const dirty =
    Boolean(active) &&
    (draftName !== active?.name ||
      draftPixels.some((pixel, index) => pixel !== active?.pixels[index]));

  const canvasCells = Array.from(
    { length: draftPixels.length },
    (_, cellIndex) => ({
      cellIndex,
      pixel: draftPixels[cellIndex],
    }),
  );

  return (
    <div className="grid gap-3 xl:grid-cols-[220px_1fr]">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black text-ocean">Pixel Paint</h2>
          <Button
            type="button"
            className="px-2 py-1 text-xs"
            onClick={() => createDrawing.mutate()}
            disabled={createDrawing.isPending}
          >
            {createDrawing.isPending ? "Adding..." : "New"}
          </Button>
        </div>
        <div className="mt-3 grid gap-2">
          {drawings.data.drawings.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-xl border px-3 py-2 text-left transition ${
                item.id === active?.id
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200 bg-white/80 hover:border-sky-200 hover:bg-sky-50/60"
              }`}
              onClick={() => {
                setActiveId(item.id);
                setDraftName(item.name);
                setDraftPixels(item.pixels);
              }}
            >
              <div className="font-bold text-ocean">{item.name}</div>
              <div className="mt-2 grid grid-cols-8 gap-0.5">
                {drawingPreview(item.pixels)}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        {active ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="font-bold"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => saveDrawing.mutate()}
                  disabled={!dirty || saveDrawing.isPending}
                >
                  {saveDrawing.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => setDraftPixels(active.pixels)}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() =>
                    setDraftPixels(active.pixels.map(() => "transparent"))
                  }
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => removeDrawing.mutate(active.id)}
                  disabled={removeDrawing.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
              <div className="grid content-start gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Palette
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {palette.map((color) => {
                      const activeColor = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`h-9 w-9 rounded-lg border-2 ${activeColor ? "border-ocean" : "border-slate-200"}`}
                          style={{
                            background:
                              color === "transparent"
                                ? "linear-gradient(135deg, #fff 40%, #fecaca 40%, #fecaca 60%, #fff 60%)"
                                : color,
                          }}
                          onClick={() => setSelectedColor(color)}
                          aria-label={
                            color === "transparent"
                              ? "Eraser"
                              : `Select ${color}`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600">
                  Drag across the canvas to paint retro icons and tiny pixel
                  art.
                </div>
              </div>

              <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div
                  className="mx-auto grid w-fit gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${active.width}, minmax(0, 1fr))`,
                  }}
                >
                  {canvasCells.map(({ cellIndex, pixel }) => (
                    <button
                      key={`pixel-${cellIndex}-${pixel}`}
                      type="button"
                      className="h-6 w-6 rounded-[4px] border border-slate-200 transition hover:scale-110"
                      style={{
                        background: pixel === "transparent" ? "#ffffff" : pixel,
                      }}
                      onMouseDown={() => {
                        setDrawing(true);
                        paintPixel(cellIndex);
                      }}
                      onMouseEnter={() => {
                        if (drawing) paintPixel(cellIndex);
                      }}
                      aria-label={`Pixel ${cellIndex + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {(saveDrawing.isError ||
              removeDrawing.isError ||
              createDrawing.isError) && (
              <ErrorNotice
                error={
                  saveDrawing.error ??
                  removeDrawing.error ??
                  createDrawing.error
                }
              />
            )}
          </div>
        ) : (
          <div className="grid min-h-[240px] place-items-center text-sm text-slate-500">
            Create a canvas to start painting.
          </div>
        )}
      </Card>
    </div>
  );
}
