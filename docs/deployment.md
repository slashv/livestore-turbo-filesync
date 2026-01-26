# Deployment

This document covers how to deploy the LiveStore Todo app to production and preview environments.

## Prerequisites

### Required Accounts

| Service | Purpose | Required For | Cost |
|---------|---------|--------------|------|
| [Cloudflare](https://dash.cloudflare.com/sign-up) | Workers, Pages, D1 hosting | Server, Web | Free tier available |
| [GitHub](https://github.com) | Code hosting, Electron releases | Electron | Free |
| [Expo/EAS](https://expo.dev/signup) | Mobile builds | Mobile | Free (30 builds/month) |
| Apple Developer | iOS App Store | Mobile (iOS production) | $99/year |
| Google Play Developer | Android Play Store | Mobile (Android production) | $25 one-time |

### Required Software

```bash
# Node.js 20+
node --version

# pnpm 9+
pnpm --version

# Wrangler CLI (installed as dev dependency, but can also install globally)
npx wrangler --version

# For mobile: EAS CLI
pnpm add -g eas-cli
eas --version
```

### Authentication

```bash
# Cloudflare - required for server and web deployments
npx wrangler login

# Expo/EAS - required for mobile deployments
eas login

# GitHub - for Electron releases, set GH_TOKEN environment variable
export GH_TOKEN=your_github_personal_access_token
```

### Secrets

| Secret | Where | How Set |
|--------|-------|---------|
| `BETTER_AUTH_SECRET` | Cloudflare Workers | **Automated** - Generated and set by deploy script |
| `GH_TOKEN` | Local environment | Manual - GitHub Personal Access Token for Electron releases |
| `EXPO_TOKEN` | CI/CD only | Manual - For automated mobile builds in CI |

The server deploy script automatically generates and sets `BETTER_AUTH_SECRET` if not already configured.

---

## Quick Start

**Release a new version** (recommended for production):

```bash
pnpm release patch   # 1.0.0 -> 1.0.1 (bug fixes)
pnpm release minor   # 1.0.0 -> 1.1.0 (new features)
pnpm release major   # 1.0.0 -> 2.0.0 (breaking changes)
```

This bumps the version, creates a git tag, pushes to GitHub, and triggers the CI/CD pipeline to deploy all platforms.

**Deploy to preview** (isolated dev environment for testing):

```bash
pnpm deploy:preview
```

**Deploy to production manually** (bypasses CI):

```bash
pnpm deploy:prod
```

---

## All Deploy Commands

| Command | Description |
|---------|-------------|
| `pnpm deploy:preview` | Deploy all apps to preview environment |
| `pnpm deploy:prod` | Deploy all apps to production |
| `pnpm deploy:server:preview` | Server to dev worker + dev D1 database |
| `pnpm deploy:server:prod` | Server to production worker + prod D1 database |
| `pnpm deploy:web:preview` | Web to unique preview URL (uses dev server) |
| `pnpm deploy:web:prod` | Web to production URL |
| `pnpm deploy:electron:preview` | Electron local build (no publish) |
| `pnpm deploy:electron:prod` | Electron to GitHub Releases |
| `pnpm deploy:mobile:preview` | Mobile EAS preview profile (internal distribution) |
| `pnpm deploy:mobile:prod` | Mobile EAS production profile (app stores) |

---

## Environments

| Environment | Server Worker | D1 Database | Web URL |
|-------------|---------------|-------------|---------|
| **Production** | `livestore-app-server` | `livestore-auth-prod` | `livestore-filesync-gallery.pages.dev` |
| **Preview** | `livestore-app-server-dev` | `livestore-auth-dev` | `*.livestore-filesync-gallery.pages.dev` |

### D1 Databases

| Database | ID | Purpose |
|----------|-----|---------|
| `livestore-auth-prod` | `42cd6704-6261-4c5b-aed5-b55dd35d874f` | Production user accounts and sessions |
| `livestore-auth-dev` | `eb8e983f-d33f-45e5-ba8a-59e4edbc69db` | Preview/testing user accounts |

---

## Server Deployment

The server handles authentication (better-auth) and LiveStore sync (Durable Objects).

### What the Deploy Script Does

The `deploy:server:preview` and `deploy:server:prod` scripts automatically:

1. Run D1 database migrations
2. Deploy the worker
3. Check if `BETTER_AUTH_SECRET` is configured
4. Generate and set the secret if missing

```bash
# Preview (uses dev database)
pnpm deploy:server:preview

# Production
pnpm deploy:server:prod
```

### Manual Database Operations

```bash
cd apps/server

# Run migrations manually
pnpm db:migrate:dev   # Dev database
pnpm db:migrate:prod  # Production database

# Query database
npx wrangler d1 execute livestore-auth-prod --remote \
  --command "SELECT id, name, email FROM user ORDER BY createdAt DESC LIMIT 10"

npx wrangler d1 execute livestore-auth-dev --remote \
  --command "SELECT id, name, email FROM user ORDER BY createdAt DESC LIMIT 10"
```

### Environment URLs

| Environment | `BETTER_AUTH_URL` |
|-------------|-------------------|
| Local dev | `http://localhost:8787` (from `.dev.vars`) |
| Preview | `https://livestore-app-server-dev.contact-106.workers.dev` |
| Production | `https://livestore-app-server.contact-106.workers.dev` |

---

## Web Deployment

The web app is deployed to Cloudflare Pages.

### Preview

```bash
pnpm deploy:web:preview
```

Builds with `.env.preview` (pointing to dev server) and creates a unique preview URL like `https://abc123.livestore-filesync-gallery.pages.dev`.

### Production

```bash
pnpm deploy:web:prod
```

Builds with `.env.production` and deploys to `https://livestore-filesync-gallery.pages.dev`.

### Environment Files

```bash
# apps/web/.env.preview - Used by deploy:preview
VITE_API_URL=https://livestore-app-server-dev.contact-106.workers.dev
VITE_SYNC_URL=https://livestore-app-server-dev.contact-106.workers.dev/sync

# apps/web/.env.production - Used by deploy:prod
VITE_API_URL=https://livestore-app-server.contact-106.workers.dev
VITE_SYNC_URL=https://livestore-app-server.contact-106.workers.dev/sync
```

---

## Electron Deployment

### Preview (Local Build)

```bash
pnpm deploy:electron:preview
```

Builds the app locally without publishing. Output in `apps/electron/release/`.

### Production (GitHub Releases)

```bash
GH_TOKEN=your_token pnpm deploy:electron:prod
```

Builds and publishes to GitHub Releases with auto-update support.

---

## Mobile Deployment

### Preview (Internal Distribution)

```bash
pnpm deploy:mobile:preview
```

Builds with EAS `preview` profile for internal testing (TestFlight-like).

### Production (App Stores)

```bash
pnpm deploy:mobile:prod
```

Builds with EAS `production` profile for app store submission.

---

## Testing Deployed Sites

Run Playwright E2E tests against any deployed URL:

```bash
cd apps/web

# Test against preview deployment
TEST_BASE_URL=https://abc123.livestore-filesync-gallery.pages.dev \
TEST_API_URL=https://livestore-app-server-dev.contact-106.workers.dev \
npx playwright test --config=e2e/playwright.config.ts

# Test against production
TEST_BASE_URL=https://livestore-filesync-gallery.pages.dev \
TEST_API_URL=https://livestore-app-server.contact-106.workers.dev \
npx playwright test --config=e2e/playwright.config.ts
```

### Test Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_BASE_URL` | Web app URL to test | `http://localhost:5173` |
| `TEST_API_URL` | API server URL for direct requests | `http://localhost:8787` |

---

## Deployment Workflow

### Testing Changes

1. Make changes to server and/or web
2. Deploy to preview: `pnpm deploy:preview`
3. Note the preview URL from the output
4. Test manually in the browser
5. Run E2E tests: `TEST_BASE_URL=<preview-url> TEST_API_URL=<dev-server> pnpm test:e2e:web`

### Promoting to Production

1. Deploy to production: `pnpm deploy:prod`
2. Run E2E tests against production
3. Monitor for issues

---

## Fresh Setup (New Cloudflare Account)

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create D1 databases
cd apps/server
npx wrangler d1 create livestore-auth-prod
npx wrangler d1 create livestore-auth-dev

# 3. Update apps/server/wrangler.toml with the new database IDs from step 2

# 4. Deploy (migrations and secrets are handled automatically)
cd ../..
pnpm deploy:preview  # Test preview first
pnpm deploy:prod     # Then production
```

---

## Technical Details

### Cross-Origin Cookies

The server uses `SameSite=None; Secure` cookies for cross-origin authentication between the web app (Pages) and server (Workers). Configured in `apps/server/src/auth.ts`:

```typescript
advanced: {
  useSecureCookies: true,
  cookies: {
    session_token: {
      attributes: {
        sameSite: 'none' as const,
        secure: true,
      },
    },
  },
},
```

### BETTER_AUTH_SECRET

This secret **must** be set as a Cloudflare secret (not a wrangler.toml var) to avoid CPU time limit errors. The deploy script handles this automatically.

---

## Troubleshooting

### "no such table: user" Error

Database migrations haven't been run:

```bash
cd apps/server
pnpm db:migrate:prod  # or db:migrate:dev
```

### Users Created But Not Logged In

Check if cookies have `SameSite=None`:

```bash
curl -i -X POST https://livestore-app-server.contact-106.workers.dev/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -H "Origin: https://livestore-filesync-gallery.pages.dev" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'
```

Look for `SameSite=None` in the `Set-Cookie` header.

### 503 / Error 1102 from Worker

This usually means the worker exceeded CPU limits. Check:

1. That `BETTER_AUTH_SECRET` is set as a **secret**, not a var
2. Worker logs: `cd apps/server && npx wrangler tail`
3. Health endpoint: `curl https://livestore-app-server.contact-106.workers.dev/`

### Preview Using Wrong Server

Ensure you deployed both server and web to preview:

```bash
pnpm deploy:server:preview  # First
pnpm deploy:web:preview     # Then
```

The web preview must be built with `.env.preview` to point to the dev server.

---

## CI/CD Pipeline

### Continuous Integration (CI)

Every push to `main` and every pull request triggers the CI workflow (`.github/workflows/ci.yml`):

| Job | Purpose |
|-----|---------|
| **Lint & Typecheck** | Runs `biome check` and `tsc --noEmit` across all packages |
| **E2E Tests (Web)** | Runs Playwright tests against web app with local server |
| **Build All** | Verifies all packages compile successfully |

CI acts as a quality gate - if any job fails, you know something is broken before deploying.

### Pre-commit Hooks

The repo uses [Husky](https://typicode.github.io/husky/) to run checks before each commit:

1. **lint-staged** - Runs `biome check` on staged files
2. **typecheck** - Runs `tsc --noEmit` across all packages

If either check fails, the commit is rejected. This prevents pushing code that would fail CI.

### Continuous Deployment (CD)

The deploy workflow (`.github/workflows/deploy.yml`) triggers on:

1. **Version tags** (`v*`) - e.g., `v1.0.0`, `v1.2.3`
2. **Manual dispatch** - From the GitHub Actions UI

When triggered, it deploys:

| Platform | Destination |
|----------|-------------|
| Server | Cloudflare Workers |
| Web | Cloudflare Pages |
| Electron | GitHub Releases (Mac, Windows, Linux) |
| Mobile | EAS Build (iOS, Android) |

### Release Workflow

The recommended way to deploy to production:

```bash
# 1. Make sure you're on main with latest changes
git checkout main
git pull

# 2. Release (bumps version, tags, pushes, triggers deploy)
pnpm release patch   # or minor/major

# 3. Monitor the deploy workflow
gh run watch
```

What `pnpm release <version>` does:

1. Bumps version in `package.json` (e.g., `1.0.0` -> `1.0.1`)
2. Creates a commit with message `v1.0.1`
3. Creates a git tag `v1.0.1`
4. Pushes commit and tag to origin
5. GitHub Actions detects the `v*` tag and runs the deploy workflow

### CI/CD Secrets

These secrets must be configured in GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploying to Cloudflare Workers and Pages |
| `EXPO_TOKEN` | Building mobile apps with EAS |
| `GITHUB_TOKEN` | Automatically available, used for Electron releases |

### Local vs CI Deployment

| Method | Use Case | CI Checks? |
|--------|----------|------------|
| `pnpm release <version>` | Production releases | Yes - full CI runs first |
| `pnpm deploy:prod` | Emergency hotfixes | No - deploys immediately |
| `pnpm deploy:preview` | Testing changes | No - deploys immediately |

For normal releases, always use `pnpm release` to ensure CI passes before deploying.
