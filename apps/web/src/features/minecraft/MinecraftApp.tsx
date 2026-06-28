import { useMutation, useQuery } from "@tanstack/react-query";
import type { MinecraftProfile, MinecraftWorld } from "../../lib/types";
import { api } from "../../lib/api";
import { Badge, Button, Card } from "../../lib/ui";

export function MinecraftApp() {
  const profile = useQuery({ queryKey: ["minecraft-profile"], queryFn: () => api<{ profile: MinecraftProfile }>("/api/minecraft/profile") });
  const worlds = useQuery({ queryKey: ["minecraft-worlds"], queryFn: () => api<{ worlds: MinecraftWorld[] }>("/api/minecraft/worlds") });
  const launch = useMutation({ mutationFn: () => api<{ launch: { message: string } }>("/api/minecraft/launch", { method: "POST" }) });

  return (
    <div>
      <h2 className="text-2xl font-black text-ocean">Minecraft Launcher</h2>
      <div className="mt-3 grid min-h-44 place-items-center rounded-xl border-4 border-[#51351e] bg-blocks text-center text-2xl font-black text-white shadow-inner">
        {launch.data?.launch.message ?? profile.data?.profile.status ?? "Ready"}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={() => launch.mutate()}>Play Demo</Button>
        <Badge>{profile.data?.profile.version ?? "Dev 3.4.6"}</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {worlds.data?.worlds.map((world) => <Card key={world.id} className="flex items-center justify-between p-3"><b>{world.name}</b><span className="text-sm text-slate-600">{world.mode} - {world.lastPlayed}</span></Card>)}
      </div>
    </div>
  );
}
