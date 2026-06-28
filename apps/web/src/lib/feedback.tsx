import { useEffect } from "react";
import { create } from "zustand";
import { apiErrorMessage } from "./api";
import { Button, Card, cn } from "./ui";

type Toast = {
  id: number;
  message: string;
};

type FeedbackStore = {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: number) => void;
};

let nextToastId = 1;

export const useFeedbackStore = create<FeedbackStore>()((set) => ({
  toasts: [],
  push: (message) => set((state) => {
    if (state.toasts.some((toast) => toast.message === message)) return state;
    const next = [{ id: nextToastId++, message }, ...state.toasts].slice(0, 4);
    return { toasts: next };
  }),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));

export function reportUiError(error: unknown, fallback = "Something went wrong.") {
  useFeedbackStore.getState().push(apiErrorMessage(error, fallback));
}

export function ErrorNotice({ error, message, className }: { error?: unknown; message?: string; className?: string }) {
  const text = message ?? (error ? apiErrorMessage(error) : "");
  if (!text) return null;
  return <div className={cn("rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700", className)}>{text}</div>;
}

export function QueryErrorCard({ title, error, onRetry, className }: { title: string; error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <Card className={cn("grid gap-3 p-4", className)}>
      <div>
        <h2 className="text-lg font-black text-red-700">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{apiErrorMessage(error)}</p>
      </div>
      {onRetry && <Button className="justify-self-start" onClick={onRetry}>Try again</Button>}
    </Card>
  );
}

function ToastItem({ id, message }: Toast) {
  const dismiss = useFeedbackStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), 5000);
    return () => window.clearTimeout(timer);
  }, [dismiss, id]);

  return (
    <div className="rounded-xl border border-red-200 bg-white/95 px-4 py-3 text-sm font-bold text-red-700 shadow-glass backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex-1">{message}</div>
        <button className="text-red-500 transition hover:text-red-700" onClick={() => dismiss(id)} aria-label="Dismiss error">×</button>
      </div>
    </div>
  );
}

export function FeedbackToasts() {
  const toasts = useFeedbackStore((state) => state.toasts);
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] grid w-full max-w-sm gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} />
        </div>
      ))}
    </div>
  );
}
