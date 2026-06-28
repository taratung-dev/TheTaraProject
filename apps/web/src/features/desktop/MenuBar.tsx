import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, LogOut, Menu } from "lucide-react";
import type { Notification, User } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice } from "../../lib/feedback";
import { Badge, Button, Tooltip, cn } from "../../lib/ui";

export function MenuBar({
  user,
  startOpen,
  setStartOpen,
  notifications,
  darkMode,
}: {
  user: User;
  startOpen: boolean;
  setStartOpen: (open: boolean) => void;
  notifications: { data?: { notifications: Notification[] }; isError: boolean; error: unknown };
  darkMode: boolean;
}) {
  const queryClient = useQueryClient();

  const allNotifications = notifications.data?.notifications ?? [];
  const unread = allNotifications.filter((item) => !item.read).length;

  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData(["session"], { user: null }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-between border-b border-white/50 bg-white/70 px-3 text-xs font-bold backdrop-blur-xl",
          "dark:bg-slate-800/70 dark:border-slate-600 dark:text-slate-200",
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            variant={startOpen ? "primary" : "soft"}
            className="h-6 rounded-full px-3 py-1 text-xs"
            onClick={() => setStartOpen(!startOpen)}
          >
            <Menu size={14} />
            Start
          </Button>
          <span>macOS Dev</span>
          <span className="hidden sm:inline">File</span>
          <span className="hidden sm:inline">Edit</span>
          <span className="hidden sm:inline">Window</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{user.displayName}</span>
          <Tooltip label="Unread notifications">
            <span className="relative inline-flex">
              <Bell size={15} />
              {unread > 0 && (
                <Badge className="absolute -right-3 -top-2 px-1">
                  {unread}
                </Badge>
              )}
            </span>
          </Tooltip>
          {unread > 0 && (
            <Tooltip label="Mark all notifications read">
              <Button
                variant="soft"
                className="h-6 px-2 py-1 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck size={14} />
                Mark all read
              </Button>
            </Tooltip>
          )}
          <Button
            variant="soft"
            className="h-6 px-2 py-1 text-xs"
            onClick={() => logout.mutate()}
          >
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </header>

      {notifications.isError && (
        <div className="fixed right-4 top-12 z-50 w-full max-w-sm">
          <ErrorNotice
            error={notifications.error}
            message="Notifications are temporarily unavailable."
          />
        </div>
      )}
      {logout.isError && (
        <div className="fixed left-1/2 top-12 z-50 w-full max-w-sm -translate-x-1/2">
          <ErrorNotice error={logout.error} />
        </div>
      )}
    </>
  );
}
