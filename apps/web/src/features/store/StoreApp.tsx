import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppRecord } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { Badge, Button, Card } from "../../lib/ui";

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
      {install.isError && (
        <ErrorNotice error={install.error} className="mt-4" />
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {apps.isLoading && <Card className="p-4">Loading apps...</Card>}
        {apps.data?.apps.map((app) => (
          <Card key={app.id} className="grid gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <b className="text-ocean">{app.name}</b>
              <Badge>{app.category}</Badge>
            </div>
            <p className="text-sm leading-5 text-slate-600">
              {app.description}
            </p>
            <Button
              className="justify-self-start"
              variant={app.installed ? "soft" : "primary"}
              onClick={() =>
                app.installed ? onOpen(app.id) : install.mutate(app.id)
              }
              disabled={install.isPending && !app.installed}
            >
              {app.installed
                ? "Open"
                : install.isPending && install.variables === app.id
                  ? "Installing..."
                  : "Install"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
