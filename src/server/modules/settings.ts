import { db } from "../db";
import { body, json, requireUser, type RouteHandler } from "../http";

export type SettingsRow = {
  wallpaper: string;
  dockStyle: string;
  notifications: number;
  classicSounds: number;
};

function readSettings(userId: number) {
  const row = db
    .query(
      `
    SELECT wallpaper, dock_style AS dockStyle, notifications, classic_sounds AS classicSounds
    FROM user_settings WHERE user_id = ?
  `,
    )
    .get(userId) as SettingsRow | null;
  return {
    wallpaper: row?.wallpaper ?? "dev-bright",
    dockStyle: row?.dockStyle ?? "glass",
    notifications: Boolean(row?.notifications ?? 1),
    classicSounds: Boolean(row?.classicSounds ?? 0),
  };
}

export const getSettings: RouteHandler = ({ userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  return json({ settings: readSettings(userId!) });
};

export const patchSettings: RouteHandler = async ({ request, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const current = readSettings(userId!);
  const input = await body<Partial<typeof current>>(request);
  const next = { ...current, ...input };
  db.prepare(
    `
    INSERT INTO user_settings (user_id, wallpaper, dock_style, notifications, classic_sounds)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET wallpaper = excluded.wallpaper, dock_style = excluded.dock_style,
      notifications = excluded.notifications, classic_sounds = excluded.classic_sounds
  `,
  ).run(
    userId,
    next.wallpaper,
    next.dockStyle,
    next.notifications ? 1 : 0,
    next.classicSounds ? 1 : 0,
  );
  return json({ settings: readSettings(userId!) });
};
