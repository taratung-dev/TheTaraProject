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
  bookmarkRows,
  browserSettings,
  db,
  historyRows,
  migrateBrowser,
} from "./repo";

await migrateBrowser();

function normalizeUrl(input: string) {
  if (input.startsWith("/")) return input;
  if (!/^https?:\/\//i.test(input)) return `https://${input}`;
  return input;
}

/**
 * Block SSRF by rejecting URLs that resolve to private/loopback/link-local
 * networks or non-http(s) schemes. Only public http/https URLs are allowed.
 */
function isSsrfSafe(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  )
    return false;

  // Block link-local (169.254.x.x, fe80::/10)
  if (hostname.startsWith("169.254.")) return false;
  if (hostname.startsWith("fe80")) return false;

  // Block private IPv4 ranges (10.x, 172.16-31.x, 192.168.x)
  if (hostname.startsWith("10.")) return false;
  if (hostname.startsWith("192.168.")) return false;
  const match172 = hostname.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31)
    return false;

  // Block metadata endpoints (AWS, GCP, Azure IMDS)
  if (hostname === "169.254.169.254" || hostname === "metadata.google.internal")
    return false;

  return true;
}

function metadataFromHtml(html: string, url: string) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || url;
  const description =
    html
      .match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      )?.[1]
      ?.trim() || "";
  return { title, description };
}

async function fetchMetadata(url: string) {
  const normalized = normalizeUrl(url);
  if (normalized.startsWith("/")) {
    return {
      url: normalized,
      title: normalized === "/gopost" ? "GOpost! Classic" : "macOS Dev Page",
      description: "Internal platform page.",
      embeddable: true,
    };
  }

  if (!isSsrfSafe(normalized)) {
    return {
      url: normalized,
      title: normalized,
      description: "",
      embeddable: false,
      reason: "This URL is not allowed.",
    };
  }

  try {
    const response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const frameOptions = response.headers.get("x-frame-options") ?? "";
    const csp = response.headers.get("content-security-policy") ?? "";
    const embeddable =
      !frameOptions && !/frame-ancestors\s+('none'|'self')/i.test(csp);
    if (!response.ok || !contentType.includes("text/html")) {
      return {
        url: normalized,
        title: normalized,
        description: `HTTP ${response.status}`,
        embeddable: false,
        reason: "This page is not a readable HTML document.",
      };
    }
    const html = await response.text();
    return {
      url: normalized,
      ...metadataFromHtml(html, normalized),
      embeddable,
      reason: embeddable ? undefined : "This site blocks embedded previews.",
    };
  } catch {
    return {
      url: normalized,
      title: normalized,
      description: "",
      embeddable: false,
      reason: "Could not fetch this URL from the Browser service.",
    };
  }
}

const routes: Route[] = [
  [
    "GET",
    /^\/browser\/history$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ history: historyRows(userId!) });
    },
  ],
  [
    "POST",
    /^\/browser\/history$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ url: string; title?: string }>(request);
      if (!input || !input.url) return json({ error: "URL is required." }, 400);
      const url = normalizeUrl(input.url);
      db.prepare(
        "INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)",
      ).run(userId, url, input.title || url);
      return json({ history: historyRows(userId!) }, 201);
    },
  ],
  [
    "DELETE",
    /^\/browser\/history\/([^/]+)$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      db.prepare(
        "DELETE FROM browser_history WHERE id = ? AND user_id = ?",
      ).run(Number(params.id), userId);
      return json({ ok: true });
    },
  ],
  [
    "GET",
    /^\/browser\/bookmarks$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ bookmarks: bookmarkRows(userId!) });
    },
  ],
  [
    "POST",
    /^\/browser\/bookmarks$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ url: string; title?: string }>(request);
      if (!input || !input.url) return json({ error: "URL is required." }, 400);
      const url = normalizeUrl(input.url);
      db.prepare(
        "INSERT INTO browser_bookmarks (user_id, url, title) VALUES (?, ?, ?)",
      ).run(userId, url, input.title || url);
      return json({ bookmarks: bookmarkRows(userId!) }, 201);
    },
  ],
  [
    "DELETE",
    /^\/browser\/bookmarks\/([^/]+)$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      db.prepare(
        "DELETE FROM browser_bookmarks WHERE id = ? AND user_id = ?",
      ).run(Number(params.id), userId);
      return json({ ok: true });
    },
  ],
  [
    "GET",
    /^\/browser\/metadata$/,
    [],
    async ({ request }) => {
      const url = new URL(request.url).searchParams.get("url") ?? "/gopost";
      return json({ metadata: await fetchMetadata(url) });
    },
  ],
  [
    "GET",
    /^\/browser\/settings$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ settings: browserSettings(userId!) });
    },
  ],
  [
    "PATCH",
    /^\/browser\/settings$/,
    [],
    async ({ request, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const input = await body<{ homepage?: string }>(request);
      if (!input) return json({ error: "Invalid request body." }, 400);
      const homepage = normalizeUrl(input.homepage || "/gopost");
      db.prepare(
        `
      INSERT INTO browser_settings (user_id, homepage)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET homepage = excluded.homepage
    `,
      ).run(userId, homepage);
      return json({ settings: browserSettings(userId!) });
    },
  ],
];

const server = Bun.serve({
  port: servicePort(4105),
  fetch: (request) => route(request, routes, userIdFromHeader(request)),
});

console.log(`browser service listening on http://localhost:${server.port}`);
