import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, UserSettings } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { SkeletonCard } from "../../lib/Skeleton";
import { Button, Card, Input, Switch } from "../../lib/ui";

const avatarColors = [
  "#2f80ed",
  "#f25f8c",
  "#27ae60",
  "#f2994a",
  "#8b5cf6",
  "#0ea5e9",
];

export function SettingsApp({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setDisplayName(user.displayName);
    setAvatarColor(user.avatarColor);
  }, [user.avatarColor, user.displayName]);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ settings: UserSettings }>("/api/settings"),
  });

  const patch = useMutation({
    mutationFn: (input: Partial<UserSettings>) =>
      api<{ settings: UserSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => queryClient.setQueryData(["settings"], data),
  });

  const saveProfile = useMutation({
    mutationFn: () =>
      api<{ user: User }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, avatarColor }),
      }),
    onSuccess: ({ user: nextUser }) => {
      queryClient.setQueryData(["session"], { user: nextUser });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api<{ user: User }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: ({ user: nextUser }) => {
      queryClient.setQueryData(["session"], { user: nextUser });
      setCurrentPassword("");
      setNewPassword("");
    },
  });

  if (settings.isError) {
    return (
      <QueryErrorCard
        title="Settings failed to load"
        error={settings.error}
        onRetry={() => void settings.refetch()}
        className="p-4"
      />
    );
  }

  const current = settings.data?.settings;
  if (!current) return <SkeletonCard lines={4} className="p-4" />;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div>
        <h2 className="text-2xl font-black text-ocean">System Settings</h2>
        {patch.isError && <ErrorNotice error={patch.error} className="mt-4" />}
        <div className="mt-4 grid gap-3">
          <Setting
            label="Glass Dock"
            on={current.dockStyle === "glass"}
            onClick={() =>
              patch.mutate({
                dockStyle: current.dockStyle === "glass" ? "solid" : "glass",
              })
            }
          />
          <Setting
            label="Notifications"
            on={current.notifications}
            onClick={() =>
              patch.mutate({ notifications: !current.notifications })
            }
          />
          <Setting
            label="Classic Sounds"
            on={current.classicSounds}
            onClick={() =>
              patch.mutate({ classicSounds: !current.classicSounds })
            }
          />
          <Setting
            label="Dark Mode"
            on={current.darkMode}
            onClick={() => patch.mutate({ darkMode: !current.darkMode })}
          />
          <Card className="p-3">
            <div className="font-bold">Wallpaper</div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={
                  current.wallpaper === "dev-bright" ? "primary" : "soft"
                }
                onClick={() => patch.mutate({ wallpaper: "dev-bright" })}
              >
                Bright
              </Button>
              <Button
                type="button"
                variant={current.wallpaper === "sunset" ? "primary" : "soft"}
                onClick={() => patch.mutate({ wallpaper: "sunset" })}
              >
                Sunset
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="grid gap-4 p-4">
          <div>
            <h3 className="text-lg font-black text-ocean">Profile</h3>
            <p className="text-sm text-slate-600">
              Update your GOpost identity and desktop avatar color.
            </p>
          </div>
          <label
            htmlFor="settings-display-name"
            className="grid gap-1 text-sm font-bold"
          >
            Display Name
          </label>
          <Input
            id="settings-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <div className="grid gap-2">
            <span className="text-sm font-bold">Avatar Color</span>
            <div className="flex flex-wrap gap-2">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-9 w-9 rounded-full border-2 ${avatarColor === color ? "border-ocean" : "border-slate-200"}`}
                  style={{ background: color }}
                  onClick={() => setAvatarColor(color)}
                  aria-label={`Choose ${color}`}
                />
              ))}
            </div>
          </div>
          {saveProfile.isError && <ErrorNotice error={saveProfile.error} />}
          <Button
            type="button"
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </Card>

        <Card className="grid gap-4 p-4">
          <div>
            <h3 className="text-lg font-black text-ocean">Password</h3>
            <p className="text-sm text-slate-600">
              Use your current password to set a new one.
            </p>
          </div>
          <label
            htmlFor="settings-current-password"
            className="grid gap-1 text-sm font-bold"
          >
            Current Password
          </label>
          <Input
            id="settings-current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <label
            htmlFor="settings-new-password"
            className="grid gap-1 text-sm font-bold"
          >
            New Password
          </label>
          <Input
            id="settings-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {changePassword.isError && (
            <ErrorNotice error={changePassword.error} />
          )}
          <Button
            type="button"
            onClick={() => changePassword.mutate()}
            disabled={
              !currentPassword || !newPassword || changePassword.isPending
            }
          >
            {changePassword.isPending ? "Updating..." : "Change Password"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Setting({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="flex items-center justify-between p-3">
      <span className="font-bold">{label}</span>
      <Switch checked={on} onClick={onClick} aria-label={label} />
    </Card>
  );
}
