import { getRandomValues } from 'expo-crypto'

// Polyfill crypto.getRandomValues for environments that don't have it
const g = globalThis as unknown as Record<string, unknown>
g.crypto = g.crypto ?? {}

const crypto = g.crypto as Record<string, unknown>
crypto.getRandomValues = (arr: Uint8Array) => getRandomValues(arr)

// Polyfill performance.mark and performance.measure
const perf = g.performance as Record<string, unknown>
perf.mark = perf.mark ?? (() => {})
perf.measure = perf.measure ?? (() => {})
