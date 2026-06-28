import React from "react";
import { cn } from "./cn";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-to-b from-[#3d8af0] to-[#1d4f9e] text-white shadow-sm",
        variant === "soft" &&
          "border border-sky-200 bg-white/70 text-ocean shadow-sm",
        variant === "ghost" && "bg-transparent text-ink hover:bg-white/40",
        variant === "danger" && "bg-red-100 text-red-700 hover:bg-red-200",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/60 bg-white/75 shadow-sm backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/25",
        props.className,
      )}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/25",
        props.className,
      )}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-ocean",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn(
        "h-7 w-12 rounded-full p-1 transition",
        checked ? "bg-mint" : "bg-slate-300",
        props.className,
      )}
      {...props}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-full bg-white shadow transition",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function ScrollArea({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-auto pr-1", className)} {...props} />;
}

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = React.useId();

  const show = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), 150);
  }, []);

  const hide = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip trigger needs hover/focus listeners
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-sm transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Lock body scroll and auto-focus first focusable element
  React.useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus first focusable element inside the dialog
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const timer = setTimeout(() => {
      const firstFocusable =
        contentRef.current?.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        contentRef.current?.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Escape key handler
  React.useEffect(() => {
    if (!open || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!open) return;
    const container = contentRef.current;
    if (!container) return;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusableEls =
        container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {children}
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/60 bg-white/50 p-1">
      {tabs.map((tab) => (
        <Button
          key={tab}
          type="button"
          variant={tab === active ? "primary" : "ghost"}
          className="px-3 py-1.5"
          onClick={() => onChange(tab)}
        >
          {tab}
        </Button>
      ))}
    </div>
  );
}
