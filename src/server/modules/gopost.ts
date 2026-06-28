import { db } from "../db";
import { body, json, requireUser, type RouteHandler } from "../http";
import { broadcast } from "./live";

function postRows(userId: number | null, where = "", params: Array<string | number> = []) {
  return db.query(`
    SELECT
      p.id, p.body, p.image_style AS imageStyle, p.created_at AS createdAt,
      u.id AS authorId, u.username, u.display_name AS displayName, u.avatar_color AS avatarColor,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS commentCount,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS likedByMe
    FROM posts p
    JOIN users u ON u.id = p.author_id
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
    likedByMe: Boolean(row.likedByMe)
  }));
}

export const listPosts: RouteHandler = ({ userId }) => json({ posts: postRows(userId) });

export const createPost: RouteHandler = async ({ request, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const input = await body<{ body: string; imageStyle?: string | null }>(request);
  if (!input.body?.trim()) return json({ error: "Post body is required." }, 400);
  db.prepare("INSERT INTO posts (author_id, body, image_style) VALUES (?, ?, ?)").run(userId, input.body.trim(), input.imageStyle ?? null);
  const posts = postRows(userId);
  broadcast({ type: "post.created", post: posts[0] });
  return json({ post: posts[0] }, 201);
};

export const likePost: RouteHandler = ({ params, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const id = Number(params.id);
  const existing = db.query("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?").get(id, userId);
  if (existing) db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(id, userId);
  else db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(id, userId);
  return json({ post: postRows(userId, "WHERE p.id = ?", [id])[0] });
};

export const commentPost: RouteHandler = async ({ request, params, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const input = await body<{ body: string }>(request);
  if (!input.body?.trim()) return json({ error: "Comment body is required." }, 400);
  db.prepare("INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)").run(Number(params.id), userId, input.body.trim());
  return json({ post: postRows(userId, "WHERE p.id = ?", [Number(params.id)])[0] }, 201);
};

export const search: RouteHandler = ({ request, userId }) => {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return json({ posts: [] });
  return json({ posts: postRows(userId, "WHERE p.body LIKE ? OR u.display_name LIKE ?", [`%${q}%`, `%${q}%`]) });
};
