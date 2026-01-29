/**
 * Thumbnail Worker - Canvas-based processor
 *
 * This worker uses the canvas-based processor instead of wasm-vips.
 * This is a lightweight alternative that doesn't require WASM loading.
 *
 * Note: Canvas processor has limitations:
 * - Converts all images to sRGB (no ICC profile preservation)
 * - No lossless WebP support
 * - Strips all metadata
 */
// Import and re-export the canvas worker setup
// This file is used as a worker entry point via Vite's ?worker import
import { createCanvasProcessor } from '@livestore-filesync/image/processor/canvas'
import { setupThumbnailWorker } from '@livestore-filesync/image/thumbnails'

console.log('[ThumbnailWorker] Worker script starting...')
const processor = createCanvasProcessor()
console.log('[ThumbnailWorker] Canvas processor created:', processor)
setupThumbnailWorker(processor)
console.log('[ThumbnailWorker] Worker setup complete, listening for messages')
