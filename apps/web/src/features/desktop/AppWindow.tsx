import React, { useCallback, useRef } from "react";
import type { OpenApp } from "../../lib/desktop-state";
import { Button, ScrollArea, cn } from "../../lib/ui";

type WindowPosition = { x: number; y: number; width: number };

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
  children: React.ReactNode;
  position: WindowPosition | undefined;
  onMove: (pos: WindowPosition) => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleTitleBarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        onMove({
          x: ev.clientX - offset.current.x,
          y: ev.clientY - offset.current.y,
          width: currentWidth,
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
    [onMove, position?.width],
  );

  const positionStyle: React.CSSProperties | undefined = position
    ? { left: position.x, top: position.y, width: position.width }
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
      <ScrollArea className="max-h-[calc(100vh-11rem)] p-4">
        {children}
      </ScrollArea>
    </article>
  );
}
