import { db } from "../db";
import { json, requireUser, type RouteHandler } from "../http";

export const profile: RouteHandler = ({ userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const user = db.query("SELECT display_name AS displayName FROM users WHERE id = ?").get(userId) as { displayName: string };
  return json({ profile: { playerName: user.displayName, version: "Dev 3.4.6", status: "Ready" } });
};

export const worlds: RouteHandler = ({ userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const worlds = db.query("SELECT id, name, mode, last_played AS lastPlayed FROM minecraft_worlds WHERE user_id = ? ORDER BY id").all(userId);
  return json({ worlds });
};

export const launch: RouteHandler = ({ userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  return json({ launch: { status: "launching", message: "Minecraft demo launcher is warming up Block World." } });
};
