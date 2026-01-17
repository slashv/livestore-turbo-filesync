# Gallery App Implementation Plan

Replace the todo app with a simple image gallery that syncs files across web, electron, and mobile using `livestore-filesync`. The gallery displays images in a grid, allows editing titles, and syncs automatically between clients.

## Overview

- **What:** Simple gallery app with image upload, title editing, cross-platform sync
- **Why:** Test/demo `livestore-filesync` in a real cross-platform app with authentication
- **Features:** Image preprocessing (resize/compress), thumbnail generation, per-user isolation

---

## Phase 1: Server-Side Setup (R2 Storage)

### 1.1 Create R2 Buckets

Create in Cloudflare dashboard:
- `livestore-gallery-dev` (development)
- `livestore-gallery-prod` (production)

### 1.2 Update `apps/server/wrangler.toml`

Add R2 bucket bindings:

```toml
# R2 bucket for file storage (add after durable_objects section)
[[r2_buckets]]
binding = "FILE_BUCKET"
bucket_name = "livestore-gallery-prod"

# In [env.dev] section, add:
[[env.dev.r2_buckets]]
binding = "FILE_BUCKET"
bucket_name = "livestore-gallery-dev"
```

### 1.3 Update `apps/server/src/env.ts`

```typescript
import type { D1Database, DurableObjectNamespace, R2Bucket } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  SYNC_BACKEND_DO: DurableObjectNamespace
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  FILE_BUCKET: R2Bucket        // NEW
  FILE_SIGNING_SECRET: string  // NEW
}
```

### 1.4 Update `apps/server/src/index.ts`

Integrate R2 handler with existing Hono server:

```typescript
import { createR2Handler } from '@livestore-filesync/r2'

// After existing imports and before app definition

// Create file routes handler
const fileRoutes = createR2Handler<Request, Env, ExecutionContext>({
  bucket: (env) => env.FILE_BUCKET,
  basePath: '/api',
  filesBasePath: '/livestore-filesync-files',
  getSigningSecret: (env) => env.FILE_SIGNING_SECRET,
  
  // Validate auth using existing better-auth session
  validateAuth: async (request, env) => {
    const auth = createAuth(env)
    const authHeader = request.headers.get('Authorization')
    const cookie = request.headers.get('Cookie')
    
    const headers = new Headers()
    if (authHeader) headers.set('Authorization', authHeader)
    if (cookie) headers.set('Cookie', cookie)
    
    const session = await auth.api.getSession({ headers })
    if (!session) return null // Deny
    
    // Return user ID as allowed prefix (user can only access their files)
    return [`${session.user.id}/`]
  }
})

// Add file routes to Hono app (before the sync endpoint)
app.all('/api/v1/*', async (c) => {
  const response = await fileRoutes.handle(c.req.raw, c.env, c.executionCtx)
  if (response) return response
  return c.json({ error: 'Not found' }, 404)
})

app.all('/livestore-filesync-files/*', async (c) => {
  const response = await fileRoutes.handle(c.req.raw, c.env, c.executionCtx)
  if (response) return response
  return c.json({ error: 'Not found' }, 404)
})
```

### 1.5 Add Secrets

```bash
# Local development - add to apps/server/.dev.vars
FILE_SIGNING_SECRET=dev-signing-secret-change-in-production

# Production
wrangler secret put FILE_SIGNING_SECRET
wrangler secret put FILE_SIGNING_SECRET --env dev
```

---

## Phase 2: Schema Changes

### 2.1 Update `packages/schema/src/index.ts`

Replace todo schema with gallery + filesync schema:

```typescript
import { createFileSyncSchema } from '@livestore-filesync/core/schema'
import { createThumbnailSchema } from '@livestore-filesync/image/thumbnails/schema'
import { Events, makeSchema, Schema, State } from '@livestore/livestore'

// Sync payload (unchanged)
export const SyncPayload = Schema.Struct({
  authToken: Schema.String,
  cookie: Schema.optional(Schema.String),
  bearerToken: Schema.optional(Schema.String),
})

// Create filesync and thumbnail schemas
export const fileSyncSchema = createFileSyncSchema()
export const thumbnailSchema = createThumbnailSchema()

// Custom images table (references files via fileId)
const imagesTable = State.SQLite.table({
  name: 'images',
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    title: State.SQLite.text(),
    fileId: State.SQLite.text(),  // References files.id
    createdAt: State.SQLite.integer(),
    deletedAt: State.SQLite.integer({ nullable: true }),
  },
})

// UI State (client-only)
const uiStateTable = State.SQLite.clientDocument({
  name: 'uiState',
  schema: Schema.Struct({}),
  default: {},
})

// Combined tables
export const tables = {
  ...fileSyncSchema.tables,
  ...thumbnailSchema.tables,
  images: imagesTable,
  uiState: uiStateTable,
} as const

// Custom events for images
const imageCreated = Events.synced({
  name: 'v1.ImageCreated',
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    fileId: Schema.String,
    createdAt: Schema.DateFromNumber,
  }),
})

const imageTitleUpdated = Events.synced({
  name: 'v1.ImageTitleUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
  }),
})

const imageDeleted = Events.synced({
  name: 'v1.ImageDeleted',
  schema: Schema.Struct({
    id: Schema.String,
    deletedAt: Schema.DateFromNumber,
  }),
})

// Combined events
export const events = {
  ...fileSyncSchema.events,
  ...thumbnailSchema.events,
  imageCreated,
  imageTitleUpdated,
  imageDeleted,
  uiStateSet: tables.uiState.set,
}

// Materializers
const materializers = State.SQLite.materializers(events, {
  ...fileSyncSchema.createMaterializers(tables),
  ...thumbnailSchema.createMaterializers(tables),
  'v1.ImageCreated': ({ id, title, fileId, createdAt }) =>
    tables.images.insert({ id, title, fileId, createdAt: createdAt.getTime(), deletedAt: null }),
  'v1.ImageTitleUpdated': ({ id, title }) =>
    tables.images.update({ title }).where({ id }),
  'v1.ImageDeleted': ({ id, deletedAt }) =>
    tables.images.update({ deletedAt: deletedAt.getTime() }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
```

### 2.2 Update `packages/core/src/queries.ts`

```typescript
import { queryDb } from '@livestore/livestore'
import { tables } from '@repo/schema'

// Query non-deleted images
export const imagesQuery = queryDb(
  tables.images.where({ deletedAt: null }),
  { label: 'images' }
)

export type Image = typeof tables.images.rowSchema.Type
```

### 2.3 Update `packages/core/src/actions.ts`

```typescript
import type { Store } from '@livestore/livestore'
import { events, tables } from '@repo/schema'

export function createGalleryActions(store: Store<typeof tables, typeof events>) {
  return {
    createImage: (id: string, title: string, fileId: string) => {
      store.commit(events.imageCreated({ id, title, fileId, createdAt: new Date() }))
    },
    updateTitle: (id: string, title: string) => {
      store.commit(events.imageTitleUpdated({ id, title }))
    },
    deleteImage: (id: string) => {
      store.commit(events.imageDeleted({ id, deletedAt: new Date() }))
    },
  }
}
```

### 2.4 Update `packages/core/src/index.ts`

```typescript
export * from './queries'
export * from './actions'
```

### 2.5 Delete `packages/core/src/utils.ts`

Remove todo-specific utilities (no longer needed).

---

## Phase 3: Web App Implementation

### 3.1 Create `apps/web/src/components/FileSyncProvider.tsx`

```typescript
import { initFileSync } from '@livestore-filesync/core'
import { createImagePreprocessor } from '@livestore-filesync/image/preprocessor'
import { initThumbnails } from '@livestore-filesync/image/thumbnails'
import { layer as opfsLayer } from '@livestore-filesync/opfs'
import { type ReactNode, useEffect, useState } from 'react'
import { useAppStore } from '~/livestore/store'

interface FileSyncProviderProps {
  userId: string
  children: ReactNode
}

export function FileSyncProvider({ userId, children }: FileSyncProviderProps) {
  const store = useAppStore(userId)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Initialize file sync with image preprocessing
    const disposeFileSync = initFileSync(store, {
      fileSystem: opfsLayer(),
      remote: {
        signerBaseUrl: '/api',
      },
      options: {
        preprocessors: {
          'image/*': createImagePreprocessor({
            maxDimension: 1500,
            quality: 85,
            format: 'jpeg',
          }),
        },
      },
    })

    // Initialize thumbnail generation
    const disposeThumbnails = initThumbnails(store, {
      sizes: { small: 200, medium: 400 },
      format: 'webp',
      fileSystem: opfsLayer(),
      workerUrl: new URL('../workers/thumbnail.worker.ts', import.meta.url),
    })

    setReady(true)

    return () => {
      void disposeFileSync()
      void disposeThumbnails()
    }
  }, [store])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading...
      </div>
    )
  }

  return <>{children}</>
}
```

### 3.2 Create `apps/web/src/workers/thumbnail.worker.ts`

```typescript
import '@livestore-filesync/image/thumbnails/worker'
```

### 3.3 Create `apps/web/src/components/Gallery.tsx`

```typescript
import { saveFile } from '@livestore-filesync/core'
import { createGalleryActions, imagesQuery } from '@repo/core'
import { useRef } from 'react'
import { useAppStore } from '~/livestore/store'
import { ImageCard } from './ImageCard'

export function Gallery({ userId }: { userId: string }) {
  const store = useAppStore(userId)
  const inputRef = useRef<HTMLInputElement>(null)

  const images = store.useQuery(imagesQuery)
  const actions = createGalleryActions(store)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      const result = await saveFile(file)
      const imageId = crypto.randomUUID()
      const title = file.name.replace(/\.[^/.]+$/, '')
      actions.createImage(imageId, title, result.fileId)
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4" data-testid="gallery">
      <h1 className="text-4xl font-thin text-center text-rose-800 mb-8">gallery</h1>

      <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
          data-testid="file-input"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-rose-400 hover:text-rose-600 transition-colors"
          data-testid="upload-button"
        >
          + Upload Images
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center text-gray-400 py-20" data-testid="empty-state">
          <p>No images yet. Upload some to get started!</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="image-grid"
        >
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              userId={userId}
              onDelete={() => actions.deleteImage(image.id)}
              onUpdateTitle={(title) => actions.updateTitle(image.id, title)}
            />
          ))}
        </div>
      )}

      <p className="text-center text-gray-400 text-sm mt-8">
        Synced with LiveStore FileSync
      </p>
    </div>
  )
}
```

### 3.4 Create `apps/web/src/components/ImageCard.tsx`

```typescript
import { deleteFile, getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import { resolveThumbnailUrl } from '@livestore-filesync/image/thumbnails'
import { tables } from '@repo/schema'
import { useEffect, useState } from 'react'
import { useAppStore } from '~/livestore/store'

interface Image {
  id: string
  title: string
  fileId: string
  createdAt: number
  deletedAt: number | null
}

interface ImageCardProps {
  image: Image
  userId: string
  onDelete: () => void
  onUpdateTitle: (title: string) => void
}

export function ImageCard({ image, userId, onDelete, onUpdateTitle }: ImageCardProps) {
  const store = useAppStore(userId)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(image.title)

  // Get file record
  const file = store.useQuery(tables.files.get(image.fileId))

  // Get local file state for display status
  const [localFileState] = store.useClientDocument(tables.localFileState)
  const displayState = file
    ? getFileDisplayState(file, localFileState?.localFiles ?? {})
    : { canDisplay: false, isUploading: false }

  // Resolve URLs
  useEffect(() => {
    if (!file) return

    resolveThumbnailUrl(image.fileId, 'small').then(setThumbnailUrl)
    resolveFileUrl(image.fileId).then(setFullUrl)
  }, [image.fileId, file?.updatedAt])

  // Update edit title when image title changes (sync from other clients)
  useEffect(() => {
    setEditTitle(image.title)
  }, [image.title])

  const handleDelete = async () => {
    onDelete()
    await deleteFile(image.fileId)
  }

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle.trim() !== image.title) {
      onUpdateTitle(editTitle.trim())
    }
    setIsEditing(false)
  }

  const imageUrl = thumbnailUrl || fullUrl

  return (
    <div
      className="bg-white rounded-lg shadow overflow-hidden"
      data-testid={`image-card-${image.id}`}
    >
      <div className="aspect-square bg-gray-100 relative">
        {displayState.canDisplay && imageUrl ? (
          <img
            src={imageUrl}
            alt={image.title}
            className="w-full h-full object-cover"
            data-testid={`image-${image.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            {displayState.isUploading ? 'Uploading...' : 'Loading...'}
          </div>
        )}
      </div>

      <div className="p-3">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit()
              if (e.key === 'Escape') {
                setEditTitle(image.title)
                setIsEditing(false)
              }
            }}
            className="w-full px-2 py-1 border rounded focus:outline-none focus:border-rose-400"
            autoFocus
            data-testid={`title-input-${image.id}`}
          />
        ) : (
          <h3
            className="font-medium text-gray-700 truncate cursor-pointer hover:text-rose-600"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
            data-testid={`title-${image.id}`}
          >
            {image.title}
          </h3>
        )}

        <button
          type="button"
          onClick={handleDelete}
          className="mt-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          data-testid={`delete-button-${image.id}`}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

### 3.5 Update `apps/web/src/routes/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { FileSyncProvider } from '~/components/FileSyncProvider'
import { Gallery } from '~/components/Gallery'
import { useAuth } from '~/components/AuthProvider'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <FileSyncProvider userId={user.id}>
      <Gallery userId={user.id} />
    </FileSyncProvider>
  )
}
```

### 3.6 Delete `apps/web/src/components/TodoApp.tsx`

Remove the old todo component.

---

## Phase 4: E2E Tests

### 4.1 Add Test Fixture

Copy a test image to `apps/web/e2e/fixtures/test-image.png`

Can copy from: `libs/livestore-filesync/tests/e2e/fixtures/images/blue.png`

### 4.2 Create `apps/web/e2e/tests/gallery-sync.spec.ts`

```typescript
import { expect, test } from '@playwright/test'
import path from 'path'

const testImagePath = path.join(__dirname, '../fixtures/test-image.png')

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const testUser = {
  email: `e2e-gallery-${testRunId}@test.local`,
  password: 'password123',
  name: 'E2E Gallery User',
}

const API_URL = 'http://localhost:8787'

test.describe('Gallery Sync E2E', () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API_URL}/api/register`, { data: testUser })
  })

  test('upload image and verify it appears', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('email-input').fill(testUser.email)
    await page.getByTestId('password-input').fill(testUser.password)
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('empty-state')).toBeVisible()

    // Upload image
    await page.getByTestId('file-input').setInputFiles(testImagePath)

    // Verify image appears
    await expect(page.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('empty-state')).not.toBeVisible()
  })

  test('sync image between two browser instances', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login on both
    for (const page of [page1, page2]) {
      await page.goto('/')
      await page.getByTestId('email-input').fill(testUser.email)
      await page.getByTestId('password-input').fill(testUser.password)
      await page.getByTestId('login-button').click()
      await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    }

    // Upload image on page1
    await page1.getByTestId('file-input').setInputFiles(testImagePath)
    await expect(page1.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 15000 })

    // Verify image syncs to page2
    await expect(page2.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 30000 })

    await context1.close()
    await context2.close()
  })

  test('edit title syncs between browsers', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login on both
    for (const page of [page1, page2]) {
      await page.goto('/')
      await page.getByTestId('email-input').fill(testUser.email)
      await page.getByTestId('password-input').fill(testUser.password)
      await page.getByTestId('login-button').click()
      await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    }

    // Wait for existing images to load
    await expect(page1.locator('[data-testid^="image-card-"]').first()).toBeVisible({ timeout: 15000 })
    await expect(page2.locator('[data-testid^="image-card-"]').first()).toBeVisible({ timeout: 15000 })

    // Edit title on page1
    const titleElement = page1.locator('[data-testid^="title-"]').first()
    await titleElement.click()

    const newTitle = `Edited-${Date.now()}`
    await page1.locator('[data-testid^="title-input-"]').fill(newTitle)
    await page1.locator('[data-testid^="title-input-"]').press('Enter')

    // Verify title syncs to page2
    await expect(page2.locator('[data-testid^="title-"]').first()).toHaveText(newTitle, { timeout: 15000 })

    await context1.close()
    await context2.close()
  })
})
```

### 4.3 Update `apps/web/e2e/tests/registration-flow.spec.ts`

Change todo-specific assertions to gallery:

```typescript
// Change: await expect(page.getByTestId('todo-input')).toBeVisible({ timeout: 15000 })
// To: await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
```

Remove todo creation/deletion in registration test - just verify gallery loads.

### 4.4 Delete `apps/web/e2e/tests/todo-flow.spec.ts`

---

## Phase 5: Electron (After Web Works)

### Changes Required

1. Mirror component changes from web app
2. Update `apps/electron/src/renderer/` with:
   - FileSyncProvider
   - Gallery component
   - ImageCard component
   - Thumbnail worker
3. Ensure worker URLs work with electron-vite bundling
4. Test file sync between web and electron clients

### Key Differences

- Worker URL resolution may differ
- May need to adjust vite config for worker bundling

---

## Phase 6: Mobile (Future Work)

### Blockers

- No `@livestore-filesync/opfs` support on React Native
- Need to create/use expo-filesystem adapter
- wasm-vips doesn't work on RN (thumbnails need alternative)

### Options

1. Create `@livestore-filesync/expo` adapter using `expo-file-system`
2. Skip thumbnails on mobile (show full images)
3. Server-side thumbnail generation (would require backend changes)

---

## Implementation Checklist

### Phase 1: Server
- [ ] Create R2 buckets in Cloudflare dashboard
- [ ] Update `apps/server/wrangler.toml` with R2 bindings
- [ ] Update `apps/server/src/env.ts` with new types
- [ ] Update `apps/server/src/index.ts` with R2 handler
- [ ] Add `FILE_SIGNING_SECRET` to `.dev.vars`
- [ ] Test file endpoints with curl

### Phase 2: Schema
- [ ] Update `packages/schema/src/index.ts`
- [ ] Update `packages/core/src/queries.ts`
- [ ] Update `packages/core/src/actions.ts`
- [ ] Update `packages/core/src/index.ts`
- [ ] Delete `packages/core/src/utils.ts`
- [ ] Run `pnpm typecheck` to verify

### Phase 3: Web App
- [ ] Create `FileSyncProvider.tsx`
- [ ] Create `workers/thumbnail.worker.ts`
- [ ] Create `Gallery.tsx`
- [ ] Create `ImageCard.tsx`
- [ ] Update `routes/index.tsx`
- [ ] Delete `TodoApp.tsx`
- [ ] Test locally with `pnpm dev:web`

### Phase 4: E2E Tests
- [ ] Copy test fixture image
- [ ] Create `gallery-sync.spec.ts`
- [ ] Update `registration-flow.spec.ts`
- [ ] Delete `todo-flow.spec.ts`
- [ ] Run `pnpm test:e2e:web`

### Phase 5: Electron
- [ ] Mirror web component changes
- [ ] Update electron renderer components
- [ ] Test file sync with web

### Phase 6: Mobile
- [ ] Research expo-filesystem adapter
- [ ] Implement mobile file handling
- [ ] Test sync with web/electron

---

## Configuration Notes

### File Key Format

Files are stored with user ID prefix for isolation:
```
{userId}/{contentHash}.{extension}
```

### Image Preprocessing

- Max dimension: 1500px (maintains aspect ratio)
- Quality: 85% JPEG
- Applied to all `image/*` mime types

### Thumbnails

- Sizes: `small` (200px), `medium` (400px)
- Format: WebP
- Generated client-side using wasm-vips worker
- Stored in OPFS (not synced to remote)

### Grid Layout

- 1 column on mobile (<640px)
- 2 columns on tablet (640-1024px)
- 3 columns on desktop (>1024px)
- Aspect ratio: 1:1 (square)
