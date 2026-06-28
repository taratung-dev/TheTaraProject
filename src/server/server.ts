import { existsSync } from "fs";
import { join } from "path";
import { migrate, seed } from "./db";
import { getSessionUserId, login, logout, me, signup } from "./modules/auth";
import { installApp, listApps } from "./modules/apps";
import { commentPost, createPost, likePost, listPosts, search } from "./modules/gopost";
import { conversations, messages, sendMessage } from "./modules/messenger";
import { launch, profile, worlds } from "./modules/minecraft";
import { addClient, removeClient } from "./modules/live";
import { getSettings, patchSettings } from "./modules/settings";
import { json, type RouteHandler } from "./http";

await migrate();
await seed();

await Bun.write("public/assets/styles.css", Bun.file("src/client/styles.css"));

await Bun.build({
  entrypoints: ["src/client/main.tsx"],
  outdir: "public/assets",
  target: "browser",
  minify: false,
  sourcemap: "external"
});

const routes: Array<[string, RegExp, string[], RouteHandler]> = [
  ["GET", /^\/api\/auth\/me$/, [], me],
  ["POST", /^\/api\/auth\/signup$/, [], signup],
  ["POST", /^\/api\/auth\/login$/, [], login],
  ["POST", /^\/api\/auth\/logout$/, [], logout],
  ["GET", /^\/api\/posts$/, [], listPosts],
  ["POST", /^\/api\/posts$/, [], createPost],
  ["POST", /^\/api\/posts\/([^/]+)\/like$/, ["id"], likePost],
  ["POST", /^\/api\/posts\/([^/]+)\/comments$/, ["id"], commentPost],
  ["GET", /^\/api\/search$/, [], search],
  ["GET", /^\/api\/apps$/, [], listApps],
  ["POST", /^\/api\/apps\/([^/]+)\/install$/, ["id"], installApp],
  ["GET", /^\/api\/settings$/, [], getSettings],
  ["PATCH", /^\/api\/settings$/, [], patchSettings],
  ["GET", /^\/api\/conversations$/, [], conversations],
  ["GET", /^\/api\/conversations\/([^/]+)\/messages$/, ["id"], messages],
  ["POST", /^\/api\/conversations\/([^/]+)\/messages$/, ["id"], sendMessage],
  ["GET", /^\/api\/minecraft\/profile$/, [], profile],
  ["GET", /^\/api\/minecraft\/worlds$/, [], worlds],
  ["POST", /^\/api\/minecraft\/launch$/, [], launch]
];

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>macOS Dev 3.4.6 + GOpost!</title>
  <link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/main.js"></script>
</body>
</html>`;

function staticFile(pathname: string) {
  const filePath = join(process.cwd(), "public", pathname);
  if (!existsSync(filePath)) return null;
  return new Response(Bun.file(filePath));
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/api/live") {
      if (server.upgrade(request, { data: null })) return undefined;
      return json({ error: "WebSocket upgrade failed" }, 400);
    }

    if (url.pathname.startsWith("/assets/")) {
      const file = staticFile(url.pathname);
      if (file) return file;
    }

    if (url.pathname.startsWith("/api/")) {
      const userId = getSessionUserId(request);
      for (const [method, pattern, keys, handler] of routes) {
        const match = url.pathname.match(pattern);
        if (request.method === method && match) {
          const params = Object.fromEntries(keys.map((key, index) => [key, match[index + 1]]));
          return await handler({ request, params, userId });
        }
      }
      return json({ error: "Not found" }, 404);
    }

    return new Response(indexHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
  websocket: {
    open: addClient,
    close: removeClient,
    message() {}
  }
});

console.log(`macOS Dev platform running at http://localhost:${server.port}`);
