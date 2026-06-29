# TaraGames Platform v2

GOpost! and macOS Dev 3.4.6 now run as a Bun + React platform with a microservice-ready local architecture.

## Run Locally

```powershell
bun install
bun run dev
```

Open `http://localhost:3000`.

Demo account:

```text
username: demo
password: demo123
```

## Docker Compose

```powershell
bun run dev:services
```

This starts:

- `gateway` on port `3000`
- `auth` on port `4101`
- `social` on port `4102`
- `realtime` on port `4103`
- `platform` on port `4104`

## Architecture

- `apps/web`: React frontend with Tailwind, TanStack Query, Zustand, and feature modules.
- `services/gateway`: browser-facing API gateway and static asset host.
- `services/auth`: users, sessions, signup, login, logout.
- `services/social`: GOpost posts, comments, likes, search, profiles.
- `services/realtime`: Messenger, notifications, unread counts.
- `services/platform`: Store, installed apps, settings, desktop state, Minecraft launcher.
- `services/browser`: Browser history, bookmarks, homepage, and safe URL metadata previews.
- `packages/shared`: shared contract types only.
- `packages/ui`: shadcn-style Tailwind primitives.

SQLite is still shared for local learning, but each service has its own repository and table ownership.

## Browser + GOpost Classic

- `/gopost` runs GOpost Classic outside the OS.
- The OS GOpost app reuses the same GOpost Classic UI.
- The Browser app is installed by default and can open `/gopost`.
- External sites are previewed only when embeddable; otherwise the Browser shows metadata and an external-open action.

## Development Workflow

Use short-lived branches for changes and open pull requests into `main`.

```powershell
git checkout -b feature/my-change
bun run check
bun test
bun run build
```

When pairing on a change, include each collaborator in the commit message with a
GitHub-linked email address:

```text
Co-authored-by: Collaborator Name <collaborator@example.com>
```

## Checks

```powershell
bun run check
bun test
bun run build
```
