import { Database } from "bun:sqlite";

export const db = new Database("data/platform.sqlite", { create: true });
db.run("PRAGMA foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      image_style TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS minecraft_worlds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      last_played TEXT NOT NULL
    );
  `);
}

export async function seed() {
  const count = db.query("SELECT COUNT(*) AS count FROM users").get() as {
    count: number;
  };
  if (count.count > 0) return;

  const users = [
    ["demo", "Tara Games", await Bun.password.hash("demo123"), "#2f80ed"],
    ["alya", "Alya Star", await Bun.password.hash("demo123"), "#f25f8c"],
    ["joko", "Joko Byte", await Bun.password.hash("demo123"), "#27ae60"],
  ];

  const insertUser = db.prepare(
    "INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)",
  );
  for (const user of users) insertUser.run(...user);

  const appRows = [
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
      "Live chat with friends in desktop windows.",
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
    "INSERT INTO apps (id, name, icon, description, category) VALUES (?, ?, ?, ?, ?)",
  );
  for (const app of appRows) insertApp.run(...app);

  const install = db.prepare(
    "INSERT INTO installed_apps (user_id, app_id) VALUES (?, ?)",
  );
  for (const app of ["gopost", "settings", "minecraft", "messenger", "browser"])
    install.run(1, app);

  db.prepare("INSERT INTO user_settings VALUES (?, ?, ?, ?, ?, ?)").run(
    1,
    "dev-bright",
    "glass",
    1,
    0,
    0,
  );
  db.prepare("INSERT INTO user_settings VALUES (?, ?, ?, ?, ?, ?)").run(
    2,
    "dev-bright",
    "glass",
    1,
    1,
    0,
  );
  db.prepare("INSERT INTO user_settings VALUES (?, ?, ?, ?, ?, ?)").run(
    3,
    "dev-bright",
    "glass",
    1,
    0,
    0,
  );

  const posts = [
    [
      2,
      "Morning upload: fixed my playlist, found a blue jacket, and decided this week needs more lemonade.",
      "linear-gradient(135deg, #35a7ff, #ffe45e)",
    ],
    [
      3,
      "Just made a banner in Paint and it honestly belongs in a museum. Pixel edges forever.",
      null,
    ],
    [
      2,
      "GOpost status: new shoes, old camera, perfect clouds. I rate today 9/10.",
      "linear-gradient(135deg, #7bdff2, #b2f7ef, #f7d6e0)",
    ],
    [
      1,
      "Lunch debate: noodles first or fried rice first? This is serious research for the timeline.",
      null,
    ],
    [
      2,
      "Changed my profile song and now my page has main-character energy.",
      "linear-gradient(135deg, #ff6b6b, #ffd166)",
    ],
    [
      3,
      "Reminder: bring your charger, label your notebook, and never trust a loading bar at 99%.",
      null,
    ],
    [
      1,
      "Sticker pack update is live in my imagination. It has stars, cassette tapes, and one dramatic thumbs up.",
      "linear-gradient(135deg, #8338ec, #ffbe0b, #fb5607)",
    ],
    [
      3,
      "Uploaded a new cover photo. It is extremely 2017 and I refuse to apologize.",
      null,
    ],
    [
      2,
      "My camera roll is 70% food, 20% screenshots, and 10% blurry evidence of fun.",
      "linear-gradient(135deg, #06d6a0, #118ab2)",
    ],
    [
      1,
      "Who else misses when every website had a tiny sidebar, a shiny button, and way too much confidence?",
      null,
    ],
    [
      2,
      "Evening plan: homework, snack, one episode, then maybe another episode because time is flexible online.",
      "linear-gradient(135deg, #f15bb5, #fee440, #00bbf9)",
    ],
    [
      3,
      "New group idea: people who still organize files in folders called final, final2, and real-final.",
      null,
    ],
    [
      1,
      "GOpost! now has 13 posts on the timeline. The feed is open, shiny, and ready for more updates.",
      "linear-gradient(135deg, #2f80ed, #27ae60, #f2994a)",
    ],
  ];
  const insertPost = db.prepare(
    "INSERT INTO posts (author_id, body, image_style) VALUES (?, ?, ?)",
  );
  for (const post of posts) insertPost.run(...post);

  db.prepare("INSERT INTO conversations (title, type) VALUES (?, ?)").run(
    "GOpost Friends",
    "group",
  );
  for (const userId of [1, 2, 3])
    db.prepare("INSERT INTO conversation_members VALUES (?, ?)").run(1, userId);
  const insertMessage = db.prepare(
    "INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)",
  );
  insertMessage.run(1, 2, "Did you see the new dock?");
  insertMessage.run(1, 1, "Store and Minecraft are already pinned.");
  insertMessage.run(1, 3, "macOS Dev 3.4.6 is online.");

  const insertWorld = db.prepare(
    "INSERT INTO minecraft_worlds (user_id, name, mode, last_played) VALUES (?, ?, ?, ?)",
  );
  insertWorld.run(1, "Starter Island", "Survival", "Today");
  insertWorld.run(1, "Creative City", "Creative", "Yesterday");
  insertWorld.run(1, "Block Lab", "Dev Demo", "June 2026");
}

export function resetForTests() {
  db.exec(`
    DELETE FROM messages; DELETE FROM conversation_members; DELETE FROM conversations;
    DELETE FROM minecraft_worlds; DELETE FROM user_settings; DELETE FROM installed_apps;
    DELETE FROM apps; DELETE FROM likes; DELETE FROM comments; DELETE FROM posts;
    DELETE FROM sessions; DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
}
