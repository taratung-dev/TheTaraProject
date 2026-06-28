import { cn } from "./ui";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200/70",
        className,
      )}
    />
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur", className)}>
      <Skeleton className="mb-3 h-5 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("mt-2 h-3", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonPost() {
  return (
    <div className="rounded-xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1 h-3 w-40" />
        </div>
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-2 h-3 w-3/5" />
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 flex-1" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full rounded-lg", className)} />;
}
