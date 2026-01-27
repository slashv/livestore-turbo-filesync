# LiveStore FileSync Demo

A cross-platform image gallery app demonstrating [LiveStore FileSync](https://github.com/slashv/livestore-filesync) — file synchronization for local-first apps built with [LiveStore](https://livestore.dev).

> **Note:** This project targets LiveStore 0.4 (currently in beta) and serves as the primary testing ground for livestore-filesync development.

## What is this?

This is a real-world demo app that showcases how to build a local-first application with file sync capabilities. It's both:

- **A testing ground** for developing and validating livestore-filesync features
- **A reference implementation** for building cross-platform apps with LiveStore and file sync

The app is a simple image gallery where users can upload, view, and manage images. Images sync in real-time across all connected devices — web browsers, desktop apps, and mobile phones.

## Features

- **Local-first** — Files written to local storage first (OPFS, filesystem)
- **Background sync** — Upload/download happens in background via LiveStore events
- **Client-side thumbnails** — Generated locally using wasm-vips or canvas
- **Cross-platform** — Web, Electron, and Expo from shared code
- **Offline support** — Works offline, syncs when connection available
- **Multi-tab support** — Leader election prevents duplicate sync operations

## Platforms

| Platform | Stack |
|----------|-------|
| Web | React + TanStack Router + Vite |
| Desktop | Electron |
| Mobile | Expo (React Native) |
| Backend | Cloudflare Workers + R2 |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
pnpm install
```

### Set up the database

```bash
cd apps/server
pnpm db:migrate
```

This creates a local SQLite database for authentication. For production setup, see [deployment docs](./docs/deployment.md).

### Run the app

```bash
pnpm dev              # All apps (web, server, electron, mobile)
pnpm dev:web          # Web only
pnpm dev:server       # Server only
pnpm dev:electron     # Desktop app
pnpm dev:mobile       # Mobile (Expo)
```

## Project Structure

```
├── apps/
│   ├── web/           # React web app
│   ├── electron/      # Desktop wrapper
│   ├── mobile/        # Expo React Native app
│   └── server/        # Cloudflare Worker (sync + auth + file storage)
├── packages/
│   ├── store/         # Shared LiveStore schema and events
│   └── ui/            # Shared React components
└── libs/
    └── livestore-filesync/  # FileSync library (git submodule)
```

## How It Works

The app uses a shared LiveStore schema (`@repo/store`) that combines:

- **FileSync schema** — Tables and events for file metadata, sync state, and upload/download tracking
- **Thumbnail schema** — Local thumbnail generation and storage
- **Image schema** — App-specific image data (title, references to files)

When you add an image:

1. The file is saved to local storage (OPFS on web, filesystem on mobile/desktop)
2. A LiveStore event is committed with the image metadata
3. The file uploads to Cloudflare R2 in the background
4. Other connected clients receive the event and download the file
5. Thumbnails are generated client-side for the gallery view

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps |
| `pnpm dev:web` | Start web only |
| `pnpm dev:server` | Start server only |
| `pnpm dev:electron` | Start desktop app |
| `pnpm dev:mobile` | Start mobile (Expo) |
| `pnpm build` | Build all apps |
| `pnpm typecheck` | TypeScript checks |
| `pnpm lint` | Run Biome linter |
| `pnpm test:e2e:web` | Playwright web tests |
| `pnpm test:e2e:electron` | Playwright desktop tests |
| `pnpm test:e2e:mobile` | Maestro mobile tests |

## Documentation

- [Authentication](./docs/authentication.md) — Auth setup for web, desktop, and mobile
- [Testing](./docs/testing.md) — E2E tests with Playwright and Maestro
- [Deployment](./docs/deployment.md) — Deploy to Cloudflare, GitHub Releases, and EAS

## Related

- [LiveStore](https://livestore.dev) — Local-first data layer
- [LiveStore FileSync](https://github.com/slashv/livestore-filesync) — File sync library this demo tests
