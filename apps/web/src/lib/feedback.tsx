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
  push: (message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nextToastId++, message }],
    })),
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function reportUiError(
  error: unknown,
  fallback = "Something went wrong.",
) {
  useFeedbackStore.getState().push(apiErrorMessage(error, fallback));
}

export function ErrorNotice({
  error,
  message,
  className,
}: {
  error: unknown;
  message?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700",
        className,
      )}
    >
      {message ?? apiErrorMessage(error, "Something went wrong.")}
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
        <button
          type="button"
          className="text-red-500 transition hover:text-red-700"
          onClick={() => dismiss(id)}
          aria-label="Dismiss error"
        >
          ×
        </button>
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

export function QueryErrorCard({
  title,
  error,
  onRetry,
  className,
}: {
  title: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("grid gap-3 p-4", className)}>
      <div>
        <h2 className="text-xl font-black text-ocean">{title}</h2>
        <p className="mt-2 text-sm text-red-700">
          {apiErrorMessage(error, "Something went wrong.")}
        </p>
      </div>
      {onRetry && (
        <Button type="button" className="w-fit" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Card>
  );
}
