import { db } from "../db";
import { json, requireUser, type RouteHandler } from "../http";

export const listApps: RouteHandler = ({ userId }) => {
  const rows = db.query(`
    SELECT a.id, a.name, a.icon, a.description, a.category,
      EXISTS(SELECT 1 FROM installed_apps ia WHERE ia.app_id = a.id AND ia.user_id = ?) AS installed
    FROM apps a
    ORDER BY a.category, a.name
  `).all(userId ?? 0).map((row: any) => ({ ...row, installed: Boolean(row.installed) }));
  return json({ apps: rows });
};

export const installApp: RouteHandler = ({ params, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  db.prepare("INSERT OR IGNORE INTO installed_apps (user_id, app_id) VALUES (?, ?)").run(userId, params.id);
  return listApps({ request: new Request("http://local"), params: {}, userId });
};
