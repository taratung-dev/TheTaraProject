import { existsSync } from "fs";
import { join } from "path";
import type { ServerWebSocket } from "bun";
import { json, servicePort } from "../../_lib/http";

const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:4101";
const SOCIAL_URL = process.env.SOCIAL_URL ?? "http://localhost:4102";
const REALTIME_URL = process.env.REALTIME_URL ?? "http://localhost:4103";
const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:4104";
const BROWSER_URL = process.env.BROWSER_URL ?? "http://localhost:4105";

const clients = new Set<ServerWebSocket<unknown>>();

class UpstreamUnavailableError extends Error {
  constructor(readonly service: string) {
    super(`${service} service unavailable`);
    this.name = "UpstreamUnavailableError";
  }
}

async function buildAssets() {
  if (process.env.SKIP_BUILD === "1") return;
  await Bun.$`bunx tailwindcss -c tailwind.config.ts -i apps/web/src/styles.css -o public/assets/styles.css`;
  await Bun.build({
    entrypoints: ["apps/web/src/main.tsx"],
    outdir: "public/assets",
    target: "browser",
    sourcemap: "external",
  });
}

await buildAssets();

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#2f80ed" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>macOS Dev 3.4.6 + GOpost!</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/icon-192.svg" />
  <link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/main.js"></script>
</body>
</html>`;

function staticFile(pathname: string) {
  const relativePath = pathname.replace(/^\/+/, "");
  const filePath = join(process.cwd(), "public", relativePath);
  if (!relativePath || !existsSync(filePath)) return null;
  return new Response(Bun.file(filePath));
}

async function currentUserId(cookie: string | null) {
  let response: Response;
  try {
    response = await fetch(`${AUTH_URL}/internal/session`, {
      headers: cookie ? { cookie } : {},
    });
  } catch {
    throw new UpstreamUnavailableError("auth");
  }

  if (!response.ok) {
    if (response.status >= 500) throw new UpstreamUnavailableError("auth");
    return null;
  }

  const data = (await response.json()) as { userId: number | null };
  return data.userId;
}

function targetFor(pathname: string) {
  if (pathname.startsWith("/api/auth/"))
    return [AUTH_URL, pathname.replace(/^\/api/, ""), "auth"] as const;
  if (
    pathname.startsWith("/api/posts") ||
    pathname.startsWith("/api/search") ||
    pathname.startsWith("/api/users")
  )
    return [SOCIAL_URL, pathname.replace(/^\/api/, ""), "social"] as const;
  if (
    pathname.startsWith("/api/conversations") ||
    pathname.startsWith("/api/notifications")
  )
    return [REALTIME_URL, pathname.replace(/^\/api/, ""), "realtime"] as const;
  if (
    pathname.startsWith("/api/apps") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/desktop") ||
    pathname.startsWith("/api/minecraft") ||
    pathname.startsWith("/api/notes") ||
    pathname.startsWith("/api/paint")
  )
    return [PLATFORM_URL, pathname.replace(/^\/api/, ""), "platform"] as const;
  if (pathname.startsWith("/api/browser"))
    return [BROWSER_URL, pathname.replace(/^\/api/, ""), "browser"] as const;
  return null;
}

async function proxy(
  request: Request,
  base: string,
  path: string,
  service: string,
  userId: number | null,
) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("x-user-id");
  if (userId) headers.set("x-user-id", String(userId));
  headers.delete("host");

  let response: Response;
  try {
    response = await fetch(`${base}${path}${url.search}`, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual",
    });
  } catch {
    throw new UpstreamUnavailableError(service);
  }

  const responseHeaders = new Headers(response.headers);
  if (
    request.method !== "GET" &&
    (path.includes("/messages") || path.includes("/posts"))
  ) {
    broadcast({
      type: path.includes("/messages") ? "message.changed" : "post.changed",
    });
  }
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

function broadcast(message: Record<string, unknown>) {
  const payload = JSON.stringify(message);
  for (const client of clients) client.send(payload);
}

const server = Bun.serve({
  port: servicePort(3000),
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/api/live") {
      if (server.upgrade(request, { data: undefined })) return undefined;
      return json({ error: "WebSocket upgrade failed" }, 400);
    }

    if (!url.pathname.startsWith("/api/")) {
      const file = staticFile(url.pathname);
      if (file) return file;
    }

    if (url.pathname.startsWith("/api/")) {
      const target = targetFor(url.pathname);
      if (!target) return json({ error: "Gateway route not found" }, 404);

      try {
        const userId =
          target[2] === "auth"
            ? null
            : await currentUserId(request.headers.get("cookie"));
        return await proxy(request, target[0], target[1], target[2], userId);
      } catch (error) {
        if (error instanceof UpstreamUnavailableError) {
          console.error("Gateway upstream request failed", {
            service: error.service,
            path: url.pathname,
          });
          return json({ error: "Upstream service unavailable" }, 502);
        }
        throw error;
      }
    }

    return new Response(indexHtml, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ type: "system.online", count: clients.size }));
    },
    close(ws) {
      clients.delete(ws);
      broadcast({ type: "system.online", count: clients.size });
    },
    message() {},
  },
});

console.log(`gateway listening on http://localhost:${server.port}`);
