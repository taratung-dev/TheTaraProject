import {
  body,
  json,
  requireUser,
  route,
  servicePort,
  type Route,
} from "../../_lib/http";
import {
  createSession,
  createUser,
  deleteSession,
  migrateAuth,
  newToken,
  seedAuth,
  sessionUserId,
  updateUserPassword,
  updateUserProfile,
  userById,
  userByUsername,
} from "./repo";

await migrateAuth();
await seedAuth();

function parseCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return Object.fromEntries(
    cookie
      .split(";")
      .map((part) => {
        const [key, ...rest] = part.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")];
      })
      .filter(([key]) => key),
  );
}

function sessionCookie(token: string) {
  return `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

const routes: Route[] = [
  [
    "GET",
    /^\/auth\/me$/,
    [],
    ({ request }) => {
      const userId = sessionUserId(parseCookie(request).session);
      return json({ user: userId ? userById(userId) : null });
    },
  ],
  [
    "GET",
    /^\/internal\/session$/,
    [],
    ({ request }) => {
      const userId = sessionUserId(parseCookie(request).session);
      return json({ userId });
    },
  ],
  [
    "POST",
    /^\/auth\/signup$/,
    [],
    async ({ request }) => {
      const input = await body<{
        username: string;
        displayName: string;
        password: string;
      }>(request);
      if (
        !input ||
        !input.username ||
        !input.displayName ||
        !input.password ||
        input.password.length < 4
      ) {
        return json(
          {
            error:
              "Username, display name, and a 4+ character password are required.",
          },
          400,
        );
      }
      try {
        const userId = createUser(
          input.username,
          input.displayName,
          await Bun.password.hash(input.password),
        );
        const token = newToken();
        createSession(userId, token);
        return json({ user: userById(userId) }, 201, {
          "Set-Cookie": sessionCookie(token),
        });
      } catch {
        return json({ error: "That username is already taken." }, 409);
      }
    },
  ],
  [
    "POST",
    /^\/auth\/login$/,
    [],
    async ({ request }) => {
      const input = await body<{ username: string; password: string }>(request);
      if (!input) return json({ error: "Invalid request body." }, 400);
      const row = userByUsername(input.username ?? "");
      if (
        !row ||
        !(await Bun.password.verify(input.password ?? "", row.passwordHash))
      ) {
        return json({ error: "Invalid username or password." }, 401);
      }
      const token = newToken();
      createSession(row.id, token);
      return json({ user: userById(row.id) }, 200, {
        "Set-Cookie": sessionCookie(token),
      });
    },
  ],
  [
    "POST",
    /^\/auth\/logout$/,
    [],
    ({ request }) => {
      deleteSession(parseCookie(request).session);
      return json({ ok: true }, 200, {
        "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      });
    },
  ],
  [
    "PATCH",
    /^\/auth\/profile$/,
    [],
    async ({ request }) => {
      const userId = sessionUserId(parseCookie(request).session);
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{
        displayName?: string;
        avatarColor?: string;
        bio?: string;
        currentPassword?: string;
        newPassword?: string;
      }>(request);
      if (!input) return json({ error: "Invalid request body." }, 400);

      const current = userById(userId!);
      const account = current ? userByUsername(current.username) : null;
      if (!current || !account) return json({ error: "User not found." }, 404);

      const wantsProfileUpdate =
        typeof input.displayName === "string" ||
        typeof input.avatarColor === "string" ||
        typeof input.bio === "string";
      const wantsPasswordUpdate =
        typeof input.newPassword === "string" && input.newPassword.length > 0;

      if (!wantsProfileUpdate && !wantsPasswordUpdate)
        return json({ error: "No profile changes were provided." }, 400);

      if (wantsProfileUpdate) {
        const displayName = input.displayName?.trim() ?? current.displayName;
        const avatarColor = input.avatarColor?.trim() ?? current.avatarColor;
        const bio = input.bio ?? current.bio;
        const validColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(avatarColor);
        if (!displayName)
          return json({ error: "Display name is required." }, 400);
        if (!validColor)
          return json({ error: "Avatar color must be a hex color." }, 400);
        updateUserProfile(userId!, { displayName, avatarColor, bio });
      }

      if (wantsPasswordUpdate) {
        if (!input.currentPassword)
          return json({ error: "Current password is required." }, 400);
        if ((input.newPassword ?? "").length < 4)
          return json(
            { error: "New password must be at least 4 characters long." },
            400,
          );
        const valid = await Bun.password.verify(
          input.currentPassword,
          account.passwordHash,
        );
        if (!valid)
          return json({ error: "Current password is incorrect." }, 401);
        updateUserPassword(
          userId!,
          await Bun.password.hash(input.newPassword!),
        );
      }

      return json({ user: userById(userId!) });
    },
  ],
];

const server = Bun.serve({
  port: servicePort(4101),
  fetch: (request) => route(request, routes),
});

console.log(`auth service listening on http://localhost:${server.port}`);
