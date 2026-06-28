const services = [
  ["auth", "services/auth/src/server.ts", "4101"],
  ["social", "services/social/src/server.ts", "4102"],
  ["realtime", "services/realtime/src/server.ts", "4103"],
  ["platform", "services/platform/src/server.ts", "4104"],
  ["browser", "services/browser/src/server.ts", "4105"],
  ["gateway", "services/gateway/src/server.ts", "3000"]
] as const;

const children: Array<ReturnType<typeof Bun.spawn>> = [];

for (const [name, entry, port] of services) {
  const child = Bun.spawn(["bun", "run", entry], {
    env: {
      ...process.env,
      PORT: port,
      AUTH_URL: "http://localhost:4101",
      SOCIAL_URL: "http://localhost:4102",
      REALTIME_URL: "http://localhost:4103",
      PLATFORM_URL: "http://localhost:4104",
      BROWSER_URL: "http://localhost:4105",
      DB_PATH: "data/platform.sqlite"
    },
    stdout: "pipe",
    stderr: "pipe"
  });

  void pipe(name, child.stdout);
  void pipe(name, child.stderr);
  children.push(child);

  if (name === "auth") await Bun.sleep(700);
  if (name === "platform") await Bun.sleep(300);
}

async function pipe(name: string, stream: ReadableStream<Uint8Array>) {
  for await (const chunk of stream) {
    const text = new TextDecoder().decode(chunk).trimEnd();
    if (text) console.log(`[${name}] ${text}`);
  }
}

function shutdown() {
  for (const child of children) child.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Local services starting at http://localhost:3000");
await Promise.all(children.map((child) => child.exited));

export {};
