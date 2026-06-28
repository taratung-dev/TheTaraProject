import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppRecord } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { Badge, Button, Card } from "../../lib/ui";
import { SkeletonCard } from "../../lib/Skeleton";

export function StoreApp({ onOpen }: { onOpen: (app: string) => void }) {
  const queryClient = useQueryClient();
  const apps = useQuery({
    queryKey: ["apps"],
    queryFn: () => api<{ apps: AppRecord[] }>("/api/apps"),
  });
  const install = useMutation({
    mutationFn: (id: string) =>
      api(`/api/apps/${id}/install`, { method: "POST" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["desktop-state"] });
      onOpen(id);
    },
  });
  const uninstall = useMutation({
    mutationFn: (id: string) =>
      api(`/api/apps/${id}/install`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["desktop-state"] });
    },
  });

  if (apps.isError) {
    return (
      <QueryErrorCard
        title="Store failed to load"
        error={apps.error}
        onRetry={() => void apps.refetch()}
        className="p-4"
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-ocean">Dev Store</h2>
      <p className="mt-1 text-sm text-slate-600">
        Install apps into the dock and desktop. Store state is owned by the
        Platform service.
      </p>
      {(install.isError || uninstall.isError) && (
        <ErrorNotice
          error={install.error ?? uninstall.error}
          className="mt-4"
        />
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {apps.isLoading && (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        )}
        {apps.data?.apps.map((app) => (
          <Card key={app.id} className="grid gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <b className="text-ocean">{app.name}</b>
              <Badge>{app.category}</Badge>
            </div>
            <p className="text-sm leading-5 text-slate-600">
              {app.description}
            </p>
            <div className="flex gap-2 justify-self-start">
              {app.installed ? (
                <>
                  <Button variant="soft" onClick={() => onOpen(app.id)}>
                    Open
                  </Button>
                  {app.id !== "store" && (
                    <Button
                      variant="danger"
                      onClick={() => uninstall.mutate(app.id)}
                      disabled={
                        uninstall.isPending && uninstall.variables === app.id
                      }
                    >
                      {uninstall.isPending && uninstall.variables === app.id
                        ? "Removing..."
                        : "Uninstall"}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => install.mutate(app.id)}
                  disabled={install.isPending && install.variables === app.id}
                >
                  {install.isPending && install.variables === app.id
                    ? "Installing..."
                    : "Install"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
