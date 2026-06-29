import type { User } from "../../lib/types";
import type { OpenApp } from "../../lib/desktop-state";
import { GOpostClassic } from "./GOpostClassic";

export function GOpostApp({
  user,
  openApp,
}: {
  user: User;
  openApp: (app: OpenApp) => void;
}) {
  return <GOpostClassic user={user} embedded onOpenApp={openApp} />;
}
