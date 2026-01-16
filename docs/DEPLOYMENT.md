# Deployment Guide

This document details the deployment process for all platforms in the LiveStore Todo app.

## Progress Checklist

### Server (Cloudflare Workers)
- [x] Create production D1 database
- [x] Update wrangler.toml with production database binding
- [x] Configure production CORS origins
- [x] Run production database migrations
- [x] Add deploy script to package.json
- [x] Test deployment

**Live at:** https://livestore-app-server.contact-106.workers.dev

### Web (Cloudflare Pages)
- [x] Configure production environment variables (.env.production)
- [x] Update worker.ts to use VITE_SYNC_URL
- [x] Add deploy script to package.json
- [x] Create Cloudflare Pages project
- [x] Test deployment

**Live at:** https://livestore-todo.pages.dev

### Electron (GitHub Releases)
- [x] Install electron-updater dependency
- [x] Update electron-builder.json with GitHub publish config
- [x] Implement auto-update in main process
- [x] Add deploy scripts to package.json
- [x] Update renderer to use production URLs
- [x] Test local build
- [ ] (Future) Set up code signing with Apple Developer account

**Build artifacts:** `apps/electron/release/`
**Deploy command:** `pnpm --filter @repo/electron deploy` (requires GH_TOKEN)

### Mobile (EAS Build)
- [x] Create eas.json configuration with build profiles
- [x] Update app.config.ts with production URLs
- [x] Add deploy scripts to package.json
- [ ] Create Expo account (expo.dev)
- [ ] Login with `eas login`
- [ ] Test preview build: `pnpm --filter @repo/mobile build:preview`
- [ ] (Future) Configure App Store submission (requires Apple Developer account)
- [ ] (Future) Configure Play Store submission (requires Google Play account)

**Deploy command:** `pnpm --filter @repo/mobile deploy` (requires EAS login)

### CI/CD (GitHub Actions)
- [x] Create deploy workflow for tagged releases (.github/workflows/deploy.yml)
- [x] Create CI workflow for PRs (.github/workflows/ci.yml)
- [ ] Configure repository secrets (see below)
- [ ] Test automated deployment pipeline

### Root Integration
- [x] Add deploy task to turbo.json
- [x] Add deploy scripts to root package.json
- [x] Test `pnpm deploy` command

---

## Architecture Overview

```
pnpm deploy
    |
    +-- turbo run deploy
            |
            +-- @repo/server -------> Cloudflare Workers
            |                         (livestore-app-server.contact-106.workers.dev)
            |
            +-- @repo/web ----------> Cloudflare Pages
            |                         (livestore-todo.pages.dev)
            |
            +-- @repo/electron -----> GitHub Releases
            |                         (DMG, NSIS, AppImage + auto-update)
            |
            +-- @repo/mobile -------> EAS Build
                                      (-> App Store / Play Store)
```

---

## Prerequisites

Before deploying, ensure you have accounts set up:

| Service | Purpose | Cost | Required For |
|---------|---------|------|--------------|
| Cloudflare | Workers + Pages hosting | Free tier | Server, Web |
| Expo/EAS | Mobile builds | Free (30 builds/mo) | Mobile |
| GitHub | Electron releases + CI/CD | Free | Electron, CI/CD |
| Apple Developer | iOS App Store | $99/year | Mobile (iOS store) |
| Google Play Developer | Android Play Store | $25 one-time | Mobile (Android store) |

---

## 1. Server Deployment (Cloudflare Workers)

The server handles authentication (via better-auth) and LiveStore sync (via Durable Objects).

### 1.1 Create Production D1 Database

```bash
# Create the production database
wrangler d1 create livestore-auth-prod

# Note the database_id from the output
```

### 1.2 Update wrangler.toml

Update `apps/server/wrangler.toml` with:
- Production D1 database binding
- Production CORS origins
- Environment-specific configuration

```toml
name = "livestore-app-server"
main = "src/index.ts"
compatibility_date = "2024-12-18"
compatibility_flags = ["nodejs_compat"]

# Production D1 Database
[[d1_databases]]
binding = "DB"
database_name = "livestore-auth-prod"
database_id = "YOUR_PRODUCTION_DATABASE_ID"

# Durable Objects for LiveStore sync
[[durable_objects.bindings]]
name = "SYNC_DURABLE_OBJECT"
class_name = "SyncBackendDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SyncBackendDO"]

# Environment variables
[vars]
CORS_ORIGINS = "https://livestore-todo.pages.dev"
BETTER_AUTH_URL = "https://livestore-app-server.workers.dev"

# Development environment override
[env.dev]
[[env.dev.d1_databases]]
binding = "DB"
database_name = "livestore-auth"
database_id = "YOUR_DEV_DATABASE_ID"

[env.dev.vars]
CORS_ORIGINS = "http://localhost:5173,http://localhost:5174"
BETTER_AUTH_URL = "http://localhost:8787"
```

### 1.3 Run Production Migrations

```bash
# Apply migrations to production database
pnpm --filter @repo/server db:migrate:prod
```

### 1.4 Deploy

```bash
# Deploy to production
pnpm --filter @repo/server deploy
```

The server will be available at: `https://livestore-app-server.workers.dev`

---

## 2. Web Deployment (Cloudflare Pages)

The web app is a Vite SPA deployed to Cloudflare Pages.

### 2.1 Create Pages Configuration

Create `apps/web/wrangler.toml`:

```toml
name = "livestore-todo"
pages_build_output_dir = "dist"

[vars]
VITE_SYNC_URL = "https://livestore-app-server.workers.dev/sync"
VITE_API_URL = "https://livestore-app-server.workers.dev"
```

### 2.2 Update Build Configuration

Ensure `apps/web/package.json` has the deploy script:

```json
{
  "scripts": {
    "deploy": "pnpm build && wrangler pages deploy dist --project-name=livestore-todo"
  }
}
```

### 2.3 Deploy

```bash
# First deployment creates the project
pnpm --filter @repo/web deploy
```

The web app will be available at: `https://livestore-todo.pages.dev`

---

## 3. Electron Deployment (GitHub Releases)

Electron builds are published to GitHub Releases with auto-update support.

### 3.1 Install Dependencies

```bash
pnpm --filter @repo/electron add electron-updater
```

### 3.2 Update electron-builder.json

```json
{
  "$schema": "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  "appId": "com.livestore.todo",
  "productName": "LiveStore Todo",
  "directories": {
    "output": "release"
  },
  "files": ["dist/**/*"],
  "publish": {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "livestore-turbo"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.productivity"
  },
  "win": {
    "target": ["nsis"]
  },
  "linux": {
    "target": ["AppImage"]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

### 3.3 Implement Auto-Update

Add auto-update logic to the main process. See `apps/electron/src/main/index.ts`.

### 3.4 Deploy

```bash
# Build and publish to GitHub Releases
# Requires GH_TOKEN environment variable
GH_TOKEN=your_token pnpm --filter @repo/electron deploy
```

### 3.5 Code Signing (Future)

When you have an Apple Developer account:

1. Export your Developer ID Application certificate
2. Set environment variables:
   - `CSC_LINK`: Path to .p12 certificate file
   - `CSC_KEY_PASSWORD`: Certificate password
3. For notarization, also set:
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your team ID

---

## 4. Mobile Deployment (EAS Build)

Mobile builds use Expo Application Services (EAS).

### 4.1 Initial Setup

```bash
# Install EAS CLI globally
pnpm add -g eas-cli

# Login to Expo
eas login

# Initialize EAS in the mobile app
cd apps/mobile
eas build:configure
```

### 4.2 Configure eas.json

Create `apps/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "resourceClass": "m1-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

### 4.3 Environment Configuration

Create `apps/mobile/eas.json` environment variables:

```bash
# Set production environment variables in EAS
eas secret:create --name LIVESTORE_SYNC_URL --value "https://livestore-app-server.workers.dev/sync"
```

### 4.4 Build Commands

```bash
# Development build (for testing)
eas build --platform all --profile development

# Preview build (internal distribution)
eas build --platform all --profile preview

# Production build (for stores)
eas build --platform all --profile production

# Submit to stores
eas submit --platform all --profile production
```

### 4.5 App Store Requirements (Future)

When ready to submit to stores:

**iOS (Apple Developer Account required)**:
1. Create App Store Connect app entry
2. Configure app metadata, screenshots, etc.
3. Set up App Store Connect API key for automated submission

**Android (Google Play Developer Account required)**:
1. Create Google Play Console app entry
2. Create service account for automated submission
3. Download service account JSON key file

---

## 5. CI/CD (GitHub Actions)

Automated deployment on tagged releases.

### 5.1 Create Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy All Platforms

on:
  push:
    tags:
      - 'v*'

env:
  PNPM_VERSION: 9.15.0
  NODE_VERSION: 20

jobs:
  deploy-server:
    name: Deploy Server
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/server deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-web:
    name: Deploy Web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/web deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-electron:
    name: Deploy Electron (${{ matrix.os }})
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: win
          - os: ubuntu-latest
            platform: linux
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/electron deploy
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-mobile:
    name: Deploy Mobile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/mobile deploy
```

### 5.2 Configure Secrets

Add these secrets in GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/Pages permissions |
| `EXPO_TOKEN` | Expo access token from expo.dev |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |

### 5.3 Create a Release

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0

# This triggers the deploy workflow
```

---

## 6. Root Integration

### 6.1 Update turbo.json

Add the deploy task to `turbo.json`:

```json
{
  "tasks": {
    "deploy": {
      "dependsOn": ["build"],
      "cache": false,
      "persistent": false
    }
  }
}
```

### 6.2 Update Root package.json

Add deploy scripts:

```json
{
  "scripts": {
    "deploy": "turbo run deploy",
    "deploy:server": "pnpm --filter @repo/server deploy",
    "deploy:web": "pnpm --filter @repo/web deploy",
    "deploy:electron": "pnpm --filter @repo/electron deploy",
    "deploy:mobile": "pnpm --filter @repo/mobile deploy"
  }
}
```

### 6.3 One-Command Deploy

```bash
# Deploy all platforms
pnpm deploy

# Or deploy specific platform
pnpm deploy:server
pnpm deploy:web
pnpm deploy:electron
pnpm deploy:mobile
```

---

## Environment Variables Summary

### Server (@repo/server)
| Variable | Development | Production |
|----------|-------------|------------|
| `CORS_ORIGINS` | `http://localhost:5173` | `https://livestore-todo.pages.dev` |
| `BETTER_AUTH_URL` | `http://localhost:8787` | `https://livestore-app-server.workers.dev` |
| `BETTER_AUTH_SECRET` | (local secret) | (set in Cloudflare dashboard) |

### Web (@repo/web)
| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_SYNC_URL` | `http://localhost:8787/sync` | `https://livestore-app-server.workers.dev/sync` |
| `VITE_API_URL` | `http://localhost:8787` | `https://livestore-app-server.workers.dev` |

### Electron (@repo/electron)
| Variable | Development | Production |
|----------|-------------|------------|
| `LIVESTORE_SYNC_URL` | `http://localhost:8787/sync` | `https://livestore-app-server.workers.dev/sync` |
| `API_URL` | `http://localhost:8787` | `https://livestore-app-server.workers.dev` |

### Mobile (@repo/mobile)
| Variable | Development | Production |
|----------|-------------|------------|
| `LIVESTORE_SYNC_URL` | `http://localhost:8787/sync` | `https://livestore-app-server.workers.dev/sync` |

---

## Troubleshooting

### Server
- **D1 database not found**: Ensure database_id in wrangler.toml matches your created database
- **CORS errors**: Check CORS_ORIGINS includes the requesting domain

### Web
- **Build fails**: Run `pnpm typecheck` to check for TypeScript errors
- **API calls fail**: Verify VITE_API_URL is set correctly for the environment

### Electron
- **Code signing errors on macOS**: Unsigned builds show "unidentified developer" warning
- **Auto-update not working**: Ensure publish config in electron-builder.json is correct

### Mobile
- **EAS build fails**: Check `eas build:list` for detailed logs
- **Expo account issues**: Run `eas whoami` to verify login status
