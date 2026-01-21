# Testing

This project has end-to-end tests for all platforms: web, desktop (Electron), and mobile (iOS/Android).

## Overview

| Platform | Framework | Test Location |
|----------|-----------|---------------|
| Web | Playwright | `apps/web/e2e/` |
| Electron | Playwright | `apps/electron/e2e/` |
| Mobile | Maestro | `apps/mobile/e2e/` |

All tests verify the complete user flow: registration, login, create todo, complete todo, and delete todo.

---

## Quick Start

```bash
# Run all e2e tests (from root)
pnpm test:e2e:web
pnpm test:e2e:electron
pnpm test:e2e:mobile
```

---

## Web E2E Tests (Playwright)

```bash
cd apps/web
pnpm test:e2e
```

This automatically starts the server and web app, then runs Playwright tests.

### Testing Against Deployed Sites

```bash
TEST_BASE_URL=https://your-preview.pages.dev \
TEST_API_URL=https://your-server.workers.dev \
npx playwright test --config=e2e/playwright.config.ts
```

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_BASE_URL` | Web app URL to test | `http://localhost:5173` |
| `TEST_API_URL` | API server URL | `http://localhost:8787` |

---

## Electron E2E Tests (Playwright)

```bash
cd apps/electron
pnpm test:e2e
```

This builds the Electron app first, then runs Playwright tests against the desktop application.

---

## Mobile E2E Tests (Maestro)

Mobile tests use [Maestro](https://maestro.mobile.dev/) to automate the iOS simulator.

### Prerequisites

1. **Install Maestro:**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Install Java 17 (required by Maestro):**
   ```bash
   brew install openjdk@17
   ```

3. **Configure environment:**
   ```bash
   cd apps/mobile
   cp e2e/.env.e2e.example e2e/.env.e2e
   ```
   
   Edit `e2e/.env.e2e` and set `JAVA_HOME` to your Java installation path:
   ```bash
   # Find your Java path (macOS)
   /usr/libexec/java_home -V
   
   # Or for Homebrew installations
   ls -la /opt/homebrew/opt/openjdk*
   ```
   
   Common paths:
   | Installation | JAVA_HOME |
   |--------------|-----------|
   | Homebrew (Apple Silicon) | `/opt/homebrew/opt/openjdk@17` |
   | Homebrew (Intel) | `/usr/local/opt/openjdk@17` |
   | System Java | Output of `/usr/libexec/java_home` |

4. **Build and install the app on a simulator:**
   ```bash
   cd apps/mobile
   npx expo prebuild --platform ios
   npx expo run:ios
   ```

### Running Mobile Tests

```bash
# 1. Start the backend server (required for user registration)
pnpm dev:server

# 2. Start an iOS simulator (if not already running)
open -a Simulator
# Or boot a specific device:
xcrun simctl boot "iPhone 16"

# 3. Run all mobile e2e tests
cd apps/mobile
pnpm test:e2e
```

### Running Individual Test Flows

```bash
cd apps/mobile

# Run a specific test flow
pnpm test:e2e e2e/flows/image-upload.yaml

# Run with additional maestro options
pnpm test:e2e e2e/flows/todo-flow.yaml --debug-output ./debug
```

### Available Test Flows

| Flow | Description |
|------|-------------|
| `todo-flow.yaml` | Login and verify gallery loads |
| `registration-flow.yaml` | User registration flow |
| `gallery-flow.yaml` | Gallery functionality |
| `image-upload.yaml` | Upload image via photo picker |
| `gallery-edit-title.yaml` | Edit gallery item titles |
| `gallery-delete.yaml` | Delete gallery items |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JAVA_HOME` | Path to Java installation | `/opt/homebrew/opt/openjdk@17` |
| `MAESTRO_DRIVER_STARTUP_TIMEOUT` | Driver startup timeout (ms) | `120000` |

### Troubleshooting

**"No devices connected"**
- Start an iOS simulator: `open -a Simulator`
- List available simulators: `xcrun simctl list devices available`

**"iOS driver not ready in time"**
- Increase timeout in `e2e/.env.e2e`: `MAESTRO_DRIVER_STARTUP_TIMEOUT=180000`

**"Failed to connect to localhost:8787"**
- Start the backend server: `pnpm dev:server` (from project root)

**"App not installed on simulator"**
- Build and install: `cd apps/mobile && npx expo run:ios`

**"Java not found"**
- Verify Java is installed: `java -version`
- Check `JAVA_HOME` is set correctly in `e2e/.env.e2e`

The test script (`e2e/run-e2e.sh`) validates all prerequisites before running tests:
- Maestro installation
- Java installation
- Running iOS simulator
- App installed on simulator
- Backend server running

---

## CI Integration

The CI workflow (`.github/workflows/ci.yml`) runs web E2E tests on every push to `main` and on pull requests.

| Job | What It Does |
|-----|--------------|
| Lint & Typecheck | Runs `biome check` and `tsc --noEmit` |
| E2E Tests (Web) | Playwright tests with local server |
| Build All | Verifies all packages compile |

### Pre-commit Hooks

The repo uses Husky to run checks before each commit:

1. `lint-staged` - Runs `biome check` on staged files
2. `typecheck` - Runs `tsc --noEmit` across all packages

If either check fails, the commit is rejected.
