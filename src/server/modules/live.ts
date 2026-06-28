type LiveMessage = Record<string, unknown>;

import type { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket<unknown>>();

export function addClient(ws: ServerWebSocket<unknown>) {
  clients.add(ws);
  ws.send(JSON.stringify({ type: "system.online", count: clients.size }));
}

export function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws);
  broadcast({ type: "system.online", count: clients.size });
}

export function broadcast(message: LiveMessage) {
  const payload = JSON.stringify(message);
  for (const client of clients) client.send(payload);
}
