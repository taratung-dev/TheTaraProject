import {
  body,
  json,
  requireUser,
  route,
  servicePort,
  userIdFromHeader,
  type Route,
} from "../../_lib/http";
import {
  db,
  desktopState,
  migratePlatform,
  seedPlatform,
  settings,
} from "./repo";

await migratePlatform();
seedPlatform();

const routes: Route[] = [
  [
    "GET",
    /^\/apps$/,
    [],
    ({ userId }) => {
      const rows = db
        .query(
          `
      SELECT a.id, a.name, a.icon, a.description, a.category,
        EXISTS(SELECT 1 FROM installed_apps ia WHERE ia.app_id = a.id AND ia.user_id = ?) AS installed
      FROM apps a ORDER BY a.category, a.name
    `,
        )
        .all(userId ?? 0)
        .map((row: any) => ({ ...row, installed: Boolean(row.installed) }));
      return json({ apps: rows });
    },
  ],
  [
    "POST",
    /^\/apps\/([^/]+)\/install$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      // Verify the app exists before installing to prevent phantom entries.
      const appExists = db
        .query("SELECT 1 FROM apps WHERE id = ?")
        .get(params.id);
      if (!appExists) return json({ error: "App not found." }, 404);
      // Wrap install + dock update in a transaction for atomicity.
      db.transaction(() => {
        db.prepare(
          "INSERT OR IGNORE INTO installed_apps (user_id, app_id) VALUES (?, ?)",
        ).run(userId, params.id);
        const state = desktopState(userId!);
        if (!state.dockApps.includes(params.id)) state.dockApps.push(params.id);
        db.prepare(
          "UPDATE desktop_state SET dock_apps = ? WHERE user_id = ?",
        ).run(JSON.stringify(state.dockApps), userId);
      })();
      return json({ ok: true });
    },
  ],
  [
    "GET",
    /^\/settings$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ settings: settings(userId!) });
    },
  ],
  [
    "PATCH",
    /^\/settings$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const current = settings(userId!);
      const input = await body<Partial<typeof current>>(request);
      if (!input) return json({ error: "Invalid request body." }, 400);
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
      return json({ settings: settings(userId!) });
    },
  ],
  [
    "GET",
    /^\/desktop\/state$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ desktopState: desktopState(userId!) });
    },
  ],
  [
    "PATCH",
    /^\/desktop\/state$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const current = desktopState(userId!);
      const input = await body<Partial<typeof current>>(request);
      if (!input) return json({ error: "Invalid request body." }, 400);
      const next = { ...current, ...input };
      db.prepare(
        `
      INSERT INTO desktop_state (user_id, dock_apps, opened_apps, wallpaper)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET dock_apps = excluded.dock_apps, opened_apps = excluded.opened_apps, wallpaper = excluded.wallpaper
    `,
      ).run(
        userId,
        JSON.stringify(next.dockApps),
        JSON.stringify(next.openedApps),
        next.wallpaper,
      );
      return json({ desktopState: desktopState(userId!) });
    },
  ],
  [
    "GET",
    /^\/minecraft\/profile$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const user = db
        .query("SELECT display_name AS displayName FROM users WHERE id = ?")
        .get(userId) as { displayName: string };
      return json({
        profile: {
          playerName: user.displayName,
          version: "Dev 3.4.6",
          status: "Ready",
        },
      });
    },
  ],
  [
    "GET",
    /^\/minecraft\/worlds$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const worlds = db
        .query(
          "SELECT id, name, mode, last_played AS lastPlayed FROM minecraft_worlds WHERE user_id = ? ORDER BY id",
        )
        .all(userId);
      return json({ worlds });
    },
  ],
  [
    "POST",
    /^\/minecraft\/launch$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({
        launch: {
          status: "launching",
          message: "Minecraft demo launcher is warming up Block World.",
        },
      });
    },
  ],
];

const server = Bun.serve({
  port: servicePort(4104),
  fetch: (request) => route(request, routes, userIdFromHeader(request)),
});

console.log(`platform service listening on http://localhost:${server.port}`);
