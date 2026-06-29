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
  allUsers,
  commentsForPost,
  db,
  followUser,
  migrateSocial,
  postRows,
  profile,
  seedSocial,
  unfollowUser,
} from "./repo";

await migrateSocial();
seedSocial();

const routes: Route[] = [
  ["GET", /^\/posts$/, [], ({ userId }) => json({ posts: postRows(userId) })],
  [
    "POST",
    /^\/posts$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ body: string; imageStyle?: string | null }>(
        request,
      );
      if (!input || !input.body?.trim())
        return json({ error: "Post body is required." }, 400);
      db.prepare(
        "INSERT INTO posts (author_id, body, image_style) VALUES (?, ?, ?)",
      ).run(userId, input.body.trim(), input.imageStyle ?? null);
      return json({ post: postRows(userId)[0] }, 201);
    },
  ],
  [
    "PATCH",
    /^\/posts\/([^/]+)$/,
    ["id"],
    async ({ request, params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ body: string }>(request);
      if (!input || !input.body?.trim())
        return json({ error: "Post body is required." }, 400);
      const result = db
        .prepare("UPDATE posts SET body = ? WHERE id = ? AND author_id = ?")
        .run(input.body.trim(), Number(params.id), userId);
      if (result.changes === 0)
        return json({ error: "Post not found or not editable." }, 404);
      return json({
        post: postRows(userId, "WHERE p.id = ?", [Number(params.id)])[0],
      });
    },
  ],
  [
    "DELETE",
    /^\/posts\/([^/]+)$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const result = db
        .prepare("DELETE FROM posts WHERE id = ? AND author_id = ?")
        .run(Number(params.id), userId);
      return result.changes
        ? json({ ok: true })
        : json({ error: "Post not found or not editable." }, 404);
    },
  ],
  [
    "POST",
    /^\/posts\/([^/]+)\/like$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const id = Number(params.id);
      const existing = db
        .query("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?")
        .get(id, userId);
      if (existing)
        db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(
          id,
          userId,
        );
      else
        db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(
          id,
          userId,
        );
      return json({ post: postRows(userId, "WHERE p.id = ?", [id])[0] });
    },
  ],
  [
    "GET",
    /^\/posts\/([^/]+)\/comments$/,
    ["id"],
    ({ params }) => json({ comments: commentsForPost(Number(params.id)) }),
  ],
  [
    "POST",
    /^\/posts\/([^/]+)\/comments$/,
    ["id"],
    async ({ request, params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ body: string }>(request);
      if (!input || !input.body?.trim())
        return json({ error: "Comment body is required." }, 400);
      db.prepare(
        "INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)",
      ).run(Number(params.id), userId, input.body.trim());
      return json(
        {
          comments: commentsForPost(Number(params.id)),
          post: postRows(userId, "WHERE p.id = ?", [Number(params.id)])[0],
        },
        201,
      );
    },
  ],
  [
    "GET",
    /^\/search$/,
    [],
    ({ request, userId }) => {
      const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
      if (!q) return json({ posts: [] });
      return json({
        posts: postRows(
          userId,
          "WHERE p.body LIKE ? OR u.display_name LIKE ?",
          [`%${q}%`, `%${q}%`],
        ),
      });
    },
  ],
  [
    "GET",
    /^\/users$/,
    [],
    ({ request, userId }) => {
      const search = new URL(request.url).searchParams
        .get("q")
        ?.trim()
        .toLowerCase();
      const users = allUsers()
        .filter((person) =>
          search
            ? person.displayName.toLowerCase().includes(search) ||
              person.username.toLowerCase().includes(search)
            : true,
        )
        .map((person) => profile(person.username, userId))
        .filter((person): person is NonNullable<ReturnType<typeof profile>> =>
          Boolean(person),
        );
      return json({ users });
    },
  ],
  [
    "GET",
    /^\/users\/([^/]+)$/,
    ["username"],
    ({ params, userId }) => {
      const found = profile(params.username, userId);
      return found
        ? json({ profile: found })
        : json({ error: "Profile not found" }, 404);
    },
  ],
  [
    "POST",
    /^\/users\/([^/]+)\/follow$/,
    ["username"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const target = profile(params.username, userId);
      if (!target) return json({ error: "Profile not found" }, 404);
      if (target.user.id === userId)
        return json({ error: "You cannot follow yourself." }, 400);
      followUser(userId!, target.user.id);
      return json({ profile: profile(params.username, userId)! });
    },
  ],
  [
    "DELETE",
    /^\/users\/([^/]+)\/follow$/,
    ["username"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const target = profile(params.username, userId);
      if (!target) return json({ error: "Profile not found" }, 404);
      unfollowUser(userId!, target.user.id);
      return json({ profile: profile(params.username, userId)! });
    },
  ],
];

const server = Bun.serve({
  port: servicePort(4102),
  fetch: (request) => route(request, routes, userIdFromHeader(request)),
});

console.log(`social service listening on http://localhost:${server.port}`);
