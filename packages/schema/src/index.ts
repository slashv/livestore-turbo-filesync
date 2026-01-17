import { Events, Schema, SessionIdSymbol, State, makeSchema } from '@livestore/livestore'

// Tables define the SQLite schema for local-first state
export const tables = {
  todos: State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: '' }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),
  // Client documents are local-only state (not synced to other clients)
  uiState: State.SQLite.clientDocument({
    name: 'uiState',
    schema: Schema.Struct({
      newTodoText: Schema.String,
      filter: Schema.Literal('all', 'active', 'completed'),
    }),
    default: { id: SessionIdSymbol, value: { newTodoText: '', filter: 'all' } },
  }),
}

// Events describe data changes and are synced across clients
export const events = {
  todoCreated: Events.synced({
    name: 'v1.TodoCreated',
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  todoCompleted: Events.synced({
    name: 'v1.TodoCompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: 'v1.TodoUncompleted',
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: 'v1.TodoDeleted',
    schema: Schema.Struct({ id: Schema.String, deletedAt: Schema.Date }),
  }),
  todoClearedCompleted: Events.synced({
    name: 'v1.TodoClearedCompleted',
    schema: Schema.Struct({ deletedAt: Schema.Date }),
  }),
  // Client document set event (auto-generated)
  uiStateSet: tables.uiState.set,
}

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
  'v1.TodoCreated': ({ id, text }) => tables.todos.insert({ id, text, completed: false }),
  'v1.TodoCompleted': ({ id }) => tables.todos.update({ completed: true }).where({ id }),
  'v1.TodoUncompleted': ({ id }) => tables.todos.update({ completed: false }).where({ id }),
  'v1.TodoDeleted': ({ id, deletedAt }) => tables.todos.update({ deletedAt }).where({ id }),
  'v1.TodoClearedCompleted': ({ deletedAt }) =>
    tables.todos.update({ deletedAt }).where({ completed: true }),
})

const state = State.SQLite.makeState({ tables, materializers })

// Export the complete schema
export const schema = makeSchema({ events, state })

// Sync payload schema for authentication
// - authToken: User ID for store identification
// - cookie: Optional session cookie for mobile auth (via expo plugin)
// - bearerToken: Optional bearer token for Electron auth (via bearer plugin)
export const SyncPayload = Schema.Struct({
  authToken: Schema.String,
  cookie: Schema.optional(Schema.String),
  bearerToken: Schema.optional(Schema.String),
})
