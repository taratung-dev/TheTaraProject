import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserSettings } from "../../lib/types";
import { api } from "../../lib/api";
import { Button, Card, Switch } from "../../lib/ui";

export function SettingsApp() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<{ settings: UserSettings }>("/api/settings") });
  const patch = useMutation({
    mutationFn: (input: Partial<UserSettings>) => api<{ settings: UserSettings }>("/api/settings", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (data) => queryClient.setQueryData(["settings"], data)
  });

  const current = settings.data?.settings;
  if (!current) return <Card className="p-4">Loading settings...</Card>;

  return (
    <div>
      <h2 className="text-2xl font-black text-ocean">System Settings</h2>
      <div className="mt-4 grid gap-3">
        <Setting label="Glass Dock" on={current.dockStyle === "glass"} onClick={() => patch.mutate({ dockStyle: current.dockStyle === "glass" ? "solid" : "glass" })} />
        <Setting label="Notifications" on={current.notifications} onClick={() => patch.mutate({ notifications: !current.notifications })} />
        <Setting label="Classic Sounds" on={current.classicSounds} onClick={() => patch.mutate({ classicSounds: !current.classicSounds })} />
        <Card className="p-3">
          <div className="font-bold">Wallpaper</div>
          <div className="mt-2 flex gap-2">
            <Button variant={current.wallpaper === "dev-bright" ? "primary" : "soft"} onClick={() => patch.mutate({ wallpaper: "dev-bright" })}>Bright</Button>
            <Button variant={current.wallpaper === "sunset" ? "primary" : "soft"} onClick={() => patch.mutate({ wallpaper: "sunset" })}>Sunset</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Setting({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <Card className="flex items-center justify-between p-3"><span className="font-bold">{label}</span><Switch checked={on} onClick={onClick} /></Card>;
}
