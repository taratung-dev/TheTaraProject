import { body, json, route, servicePort, type Route } from "../../_lib/http";
import {
  createSession,
  createUser,
  deleteSession,
  migrateAuth,
  newToken,
  seedAuth,
  sessionUserId,
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
];

const server = Bun.serve({
  port: servicePort(4101),
  fetch: (request) => route(request, routes),
});

console.log(`auth service listening on http://localhost:${server.port}`);
