import React from "react";
import { cn } from "./cn";

export function Button({ className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-gradient-to-b from-[#3d8af0] to-[#1d4f9e] text-white shadow-sm",
        variant === "soft" && "border border-sky-200 bg-white/70 text-ocean shadow-sm",
        variant === "ghost" && "bg-transparent text-ink hover:bg-white/40",
        variant === "danger" && "bg-red-100 text-red-700 hover:bg-red-200",
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-white/60 bg-white/75 shadow-sm backdrop-blur", className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/25", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/25", props.className)} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-bold text-ocean", className)} {...props} />;
}

export function Switch({ checked, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn("h-7 w-12 rounded-full p-1 transition", checked ? "bg-mint" : "bg-slate-300", props.className)}
      {...props}
    >
      <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition", checked && "translate-x-5")} />
    </button>
  );
}

export function ScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-auto pr-1", className)} {...props} />;
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span title={label} className="inline-flex">{children}</span>;
}

export function Dialog({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">{children}</div>;
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-white/60 bg-white/50 p-1">
      {tabs.map((tab) => (
        <Button key={tab} type="button" variant={tab === active ? "primary" : "ghost"} className="px-3 py-1.5" onClick={() => onChange(tab)}>
          {tab}
        </Button>
      ))}
    </div>
  );
}
