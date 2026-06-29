import {
  useCallback,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { OpenApp } from "../../lib/desktop-state";
import { Button, ScrollArea, cn } from "../../lib/ui";

type WindowPosition = { x: number; y: number; width: number; height: number };

export function AppWindow({
  app,
  title,
  active,
  children,
  position,
  onMove,
  onClose,
  onFocus,
}: {
  app: OpenApp;
  title: string;
  active: boolean;
  children: ReactNode;
  position: WindowPosition | undefined;
  onMove: (pos: WindowPosition) => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleTitleBarMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;

      e.preventDefault();
      dragging.current = true;

      const articleEl = e.currentTarget.parentElement;
      if (!articleEl) return;

      const rect = articleEl.getBoundingClientRect();
      offset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const currentWidth = position?.width ?? rect.width;
      const currentHeight = position?.height ?? rect.height;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        onMove({
          x: ev.clientX - offset.current.x,
          y: ev.clientY - offset.current.y,
          width: currentWidth,
          height: currentHeight,
        });
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onMove, position?.height, position?.width],
  );

  const handleResizeMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      resizing.current = true;

      const articleEl = e.currentTarget.closest("article");
      if (!articleEl) return;
      const rect = articleEl.getBoundingClientRect();
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: position?.width ?? rect.width,
        height: position?.height ?? rect.height,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const width = Math.max(
          320,
          resizeStart.current.width + (ev.clientX - resizeStart.current.x),
        );
        const height = Math.max(
          260,
          resizeStart.current.height + (ev.clientY - resizeStart.current.y),
        );
        onMove({
          x: position?.x ?? rect.left,
          y: position?.y ?? rect.top,
          width,
          height,
        });
      };

      const handleMouseUp = () => {
        resizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onMove, position?.height, position?.width, position?.x, position?.y],
  );

  const positionStyle: CSSProperties | undefined = position
    ? {
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }
    : undefined;

  return (
    <article
      className={cn(
        "window pointer-events-auto absolute overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-glass backdrop-blur-xl",
        app,
        active && "z-30 ring-2 ring-white/70",
      )}
      style={positionStyle}
      onMouseDown={onFocus}
    >
      <div
        role="toolbar"
        className="flex h-10 cursor-grab items-center gap-3 border-b border-slate-200 bg-gradient-to-b from-white to-slate-100 px-3 active:cursor-grabbing"
        onMouseDown={handleTitleBarMouseDown}
      >
        <span className="flex gap-1.5">
          <i className="h-3 w-3 rounded-full bg-red-400" />
          <i className="h-3 w-3 rounded-full bg-yellow-400" />
          <i className="h-3 w-3 rounded-full bg-green-400" />
        </span>
        <b className="flex-1 text-center text-sm text-slate-700">{title}</b>
        <Button variant="danger" className="h-7 w-7 p-0" onClick={onClose}>
          x
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-2.5rem)] max-h-[calc(100vh-11rem)] p-4">
        {children}
      </ScrollArea>
      <button
        type="button"
        className="absolute bottom-1 right-1 h-5 w-5 cursor-se-resize rounded-full border border-slate-300 bg-white/80 text-[10px] text-slate-500 shadow-sm"
        onMouseDown={handleResizeMouseDown}
        aria-label={`Resize ${title}`}
      >
        ↘
      </button>
    </article>
  );
}
