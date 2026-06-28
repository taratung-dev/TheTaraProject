import { openServiceDb } from "../../_lib/db";

export const db = openServiceDb();

export function migratePlatform() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS installed_apps (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, app_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      wallpaper TEXT NOT NULL,
      dock_style TEXT NOT NULL,
      notifications INTEGER NOT NULL,
      classic_sounds INTEGER NOT NULL,
      dark_mode INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS desktop_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      dock_apps TEXT NOT NULL,
      opened_apps TEXT NOT NULL,
      wallpaper TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minecraft_worlds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      last_played TEXT NOT NULL
    );
  `);

  // Add dark_mode column if missing (existing databases created before this field)
  try {
    db.exec(
      "ALTER TABLE user_settings ADD COLUMN dark_mode INTEGER NOT NULL DEFAULT 0",
    );
  } catch {
    // Column already exists — safe to ignore
  }
}

export function seedPlatform() {
  const userCount = db.query("SELECT COUNT(*) AS count FROM users").get() as {
    count: number;
  };
  if (userCount.count < 3) return;
  const apps = [
    [
      "gopost",
      "GOpost!",
      "GO",
      "A 2017-style social feed for status updates and photos.",
      "Social",
    ],
    [
      "settings",
      "Settings",
      "Set",
      "Tune wallpaper, dock, notifications, and classic sounds.",
      "System",
    ],
    [
      "minecraft",
      "Minecraft",
      "MC",
      "Launch demo worlds from macOS Dev.",
      "Games",
    ],
    [
      "messenger",
      "Messenger",
      "Msg",
      "Live chat with friends from the dock.",
      "Social",
    ],
    [
      "browser",
      "Browser",
      "Web",
      "Browse platform pages and safe internet previews.",
      "System",
    ],
    [
      "notes",
      "Notes Mini",
      "Note",
      "Small sticky notes for quick thoughts.",
      "Tools",
    ],
    [
      "paint",
      "Pixel Paint",
      "Paint",
      "Retro icon drawing and pixel art.",
      "Creative",
    ],
  ];
  const insertApp = db.prepare(
    "INSERT OR IGNORE INTO apps (id, name, icon, description, category) VALUES (?, ?, ?, ?, ?)",
  );
  for (const app of apps) insertApp.run(...app);
  for (const userId of [1, 2, 3]) {
    for (const app of [
      "gopost",
      "settings",
      "minecraft",
      "messenger",
      "browser",
    ]) {
      db.prepare(
        "INSERT OR IGNORE INTO installed_apps (user_id, app_id) VALUES (?, ?)",
      ).run(userId, app);
    }
    db.prepare(
      "INSERT OR IGNORE INTO user_settings VALUES (?, ?, ?, ?, ?, ?)",
    ).run(userId, "dev-bright", "glass", 1, userId === 2 ? 1 : 0, 0);
    db.prepare("INSERT OR IGNORE INTO desktop_state VALUES (?, ?, ?, ?)").run(
      userId,
      JSON.stringify([
        "gopost",
        "browser",
        "store",
        "settings",
        "minecraft",
        "messenger",
      ]),
      JSON.stringify(["gopost", "store"]),
      "dev-bright",
    );
    const row = db
      .query(
        "SELECT dock_apps AS dockApps FROM desktop_state WHERE user_id = ?",
      )
      .get(userId) as { dockApps: string } | null;
    const dockApps = row ? (JSON.parse(row.dockApps) as string[]) : [];
    if (!dockApps.includes("browser")) {
      dockApps.splice(1, 0, "browser");
      db.prepare(
        "UPDATE desktop_state SET dock_apps = ? WHERE user_id = ?",
      ).run(JSON.stringify(dockApps), userId);
    }
  }
  const insertWorld = db.prepare(
    "INSERT INTO minecraft_worlds (user_id, name, mode, last_played) VALUES (?, ?, ?, ?)",
  );
  const worldCount = db
    .query("SELECT COUNT(*) AS count FROM minecraft_worlds WHERE user_id = 1")
    .get() as { count: number };
  if (worldCount.count === 0) {
    insertWorld.run(1, "Starter Island", "Survival", "Today");
    insertWorld.run(1, "Creative City", "Creative", "Yesterday");
    insertWorld.run(1, "Block Lab", "Dev Demo", "June 2026");
  }
}

export function settings(userId: number) {
  const row = db
    .query(
      "SELECT wallpaper, dock_style AS dockStyle, notifications, classic_sounds AS classicSounds, dark_mode AS darkMode FROM user_settings WHERE user_id = ?",
    )
    .get(userId) as any;
  return {
    wallpaper: row?.wallpaper ?? "dev-bright",
    dockStyle: row?.dockStyle ?? "glass",
    notifications: Boolean(row?.notifications ?? 1),
    classicSounds: Boolean(row?.classicSounds ?? 0),
    darkMode: Boolean(row?.darkMode ?? 0),
  };
}

export function desktopState(userId: number) {
  const row = db
    .query(
      "SELECT dock_apps AS dockApps, opened_apps AS openedApps, wallpaper FROM desktop_state WHERE user_id = ?",
    )
    .get(userId) as any;
  return {
    dockApps: row
      ? JSON.parse(row.dockApps)
      : ["gopost", "browser", "store", "settings", "minecraft", "messenger"],
    openedApps: row ? JSON.parse(row.openedApps) : ["gopost", "store"],
    wallpaper: row?.wallpaper ?? "dev-bright",
  };
}
