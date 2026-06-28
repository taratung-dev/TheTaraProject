import { openServiceDb } from "../../_lib/db";

export const db = openServiceDb();

export function migrateSocial() {
  db.exec(`
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
  `);
}

export function seedSocial() {
  const userCount = db.query("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  const postCount = db.query("SELECT COUNT(*) AS count FROM posts").get() as { count: number };
  if (userCount.count < 3 || postCount.count > 0) return;
  const posts = [
    [2, "Morning upload: fixed my playlist, found a blue jacket, and decided this week needs more lemonade.", "linear-gradient(135deg, #35a7ff, #ffe45e)"],
    [3, "Just made a banner in Paint and it honestly belongs in a museum. Pixel edges forever.", null],
    [2, "GOpost status: new shoes, old camera, perfect clouds. I rate today 9/10.", "linear-gradient(135deg, #7bdff2, #b2f7ef, #f7d6e0)"],
    [1, "Lunch debate: noodles first or fried rice first? This is serious research for the timeline.", null],
    [2, "Changed my profile song and now my page has main-character energy.", "linear-gradient(135deg, #ff6b6b, #ffd166)"],
    [3, "Reminder: bring your charger, label your notebook, and never trust a loading bar at 99%.", null],
    [1, "Sticker pack update is live in my imagination. It has stars, cassette tapes, and one dramatic thumbs up.", "linear-gradient(135deg, #8338ec, #ffbe0b, #fb5607)"],
    [3, "Uploaded a new cover photo. It is extremely 2017 and I refuse to apologize.", null],
    [2, "My camera roll is 70% food, 20% screenshots, and 10% blurry evidence of fun.", "linear-gradient(135deg, #06d6a0, #118ab2)"],
    [1, "Who else misses when every website had a tiny sidebar, a shiny button, and way too much confidence?", null],
    [2, "Evening plan: homework, snack, one episode, then maybe another episode because time is flexible online.", "linear-gradient(135deg, #f15bb5, #fee440, #00bbf9)"],
    [3, "New group idea: people who still organize files in folders called final, final2, and real-final.", null],
    [1, "GOpost! now has 13 posts on the timeline. The feed is open, shiny, and ready for more updates.", "linear-gradient(135deg, #2f80ed, #27ae60, #f2994a)"]
  ];
  const insert = db.prepare("INSERT INTO posts (author_id, body, image_style) VALUES (?, ?, ?)");
  for (const post of posts) insert.run(...post);
}

export function postRows(userId: number | null, where = "", params: Array<string | number> = []) {
  return db.query(`
    SELECT p.id, p.body, p.image_style AS imageStyle, p.created_at AS createdAt,
      u.id AS authorId, u.username, u.display_name AS displayName, u.avatar_color AS avatarColor,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS likedByMe
    FROM posts p JOIN users u ON u.id = p.author_id
    ${where}
    ORDER BY p.id DESC
  `).all(userId ?? 0, ...params).map((row: any) => ({
    id: row.id,
    body: row.body,
    imageStyle: row.imageStyle,
    createdAt: row.createdAt,
    author: { id: row.authorId, username: row.username, displayName: row.displayName, avatarColor: row.avatarColor },
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    likedByMe: Boolean(row.likedByMe),
    canEdit: row.authorId === userId
  }));
}

export function commentsForPost(postId: number) {
  return db.query(`
    SELECT c.id, c.post_id AS postId, c.body, c.created_at AS createdAt,
      u.id AS authorId, u.username, u.display_name AS displayName, u.avatar_color AS avatarColor
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.post_id = ?
    ORDER BY c.id
  `).all(postId).map((row: any) => ({
    id: row.id,
    postId: row.postId,
    body: row.body,
    createdAt: row.createdAt,
    author: { id: row.authorId, username: row.username, displayName: row.displayName, avatarColor: row.avatarColor }
  }));
}

export function profile(username: string) {
  const user = db.query("SELECT id, username, display_name AS displayName, avatar_color AS avatarColor FROM users WHERE username = ?").get(username) as any;
  if (!user) return null;
  const row = db.query("SELECT COUNT(*) AS postCount FROM posts WHERE author_id = ?").get(user.id) as { postCount: number };
  return { user, postCount: row.postCount, fanCount: 248 + user.id };
}
