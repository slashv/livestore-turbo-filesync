import { createFileSyncSchema } from '@livestore-filesync/core/schema'
import { createThumbnailSchema } from '@livestore-filesync/image/thumbnails/schema'
import { Events, Schema, State, makeSchema } from '@livestore/livestore'

// Sync payload schema for authentication
// - authToken: User ID for store identification
// - cookie: Optional session cookie for mobile auth (via expo plugin)
// - bearerToken: Optional bearer token for Electron auth (via bearer plugin)
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
    fileId: State.SQLite.text(), // References files.id
    createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
  },
})

// UI State (client-only)
const uiStateTable = State.SQLite.clientDocument({
  name: 'uiState',
  schema: Schema.Struct({}),
  default: { value: {} },
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
    createdAt: Schema.Date,
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
    deletedAt: Schema.Date,
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
  'v1.ImageCreated': ({ id, title, fileId, createdAt }) =>
    tables.images.insert({ id, title, fileId, createdAt, deletedAt: null }),
  'v1.ImageTitleUpdated': ({ id, title }) => tables.images.update({ title }).where({ id }),
  'v1.ImageDeleted': ({ id, deletedAt }) => tables.images.update({ deletedAt }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })

export const schema = makeSchema({ events, state })
