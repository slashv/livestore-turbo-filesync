/**
 * Thumbnail generation hook for Expo/React Native
 *
 * This is a simplified implementation that generates thumbnails on the main thread
 * using ExpoImageProcessor. For a production app, you might want to:
 * - Use a background task (expo-task-manager)
 * - Generate thumbnails lazily on display
 * - Cache more aggressively
 *
 * For now, we rely on expo-image's built-in caching and efficient loading
 * instead of pre-generating thumbnails. The full images are already preprocessed
 * to a reasonable size (1500px max) by the FileSyncProvider.
 */

import {
  type ProcessedImageUri,
  type UriImageProcessor,
  createExpoImageProcessor,
} from '@livestore-filesync/expo'
import { useEffect, useRef } from 'react'

interface ThumbnailConfig {
  sizes: Record<string, number>
  format: 'jpeg' | 'webp' | 'png'
  quality?: number
}

interface ThumbnailResult {
  uri: string
  width: number
  height: number
}

// Singleton processor to avoid re-initializing
let processorInstance: UriImageProcessor | null = null

async function getProcessor(): Promise<UriImageProcessor> {
  if (!processorInstance) {
    processorInstance = createExpoImageProcessor()
    await processorInstance.init()
  }
  return processorInstance
}

/**
 * Generate a thumbnail for a given source URI
 *
 * @param sourceUri - The source image URI
 * @param maxDimension - Maximum dimension (width or height) for the thumbnail
 * @param format - Output format (jpeg recommended for cross-platform)
 * @param quality - Output quality (0-100)
 * @returns The processed thumbnail result
 */
export async function generateThumbnail(
  sourceUri: string,
  maxDimension: number,
  format: 'jpeg' | 'webp' | 'png' = 'jpeg',
  quality = 80
): Promise<ThumbnailResult> {
  const processor = await getProcessor()

  const result = await processor.process(sourceUri, {
    maxDimension,
    format,
    quality,
  })

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  }
}

/**
 * Generate multiple thumbnail sizes for a given source URI
 *
 * @param sourceUri - The source image URI
 * @param sizes - Map of size names to max dimensions
 * @param format - Output format
 * @param quality - Output quality
 * @returns Map of size names to thumbnail results
 */
export async function generateThumbnails(
  sourceUri: string,
  sizes: Record<string, number>,
  format: 'jpeg' | 'webp' | 'png' = 'jpeg',
  quality = 80
): Promise<Record<string, ThumbnailResult>> {
  const processor = await getProcessor()

  const results = await processor.processMultiple(sourceUri, sizes, {
    format,
    quality,
  })

  return Object.fromEntries(
    Object.entries(results).map(([name, result]: [string, ProcessedImageUri]) => [
      name,
      { uri: result.uri, width: result.width, height: result.height },
    ])
  )
}

/**
 * Hook to manage thumbnail generation (placeholder for future enhancement)
 *
 * Currently, this is a no-op hook that could be expanded to:
 * - Track thumbnail generation state
 * - Queue thumbnail generation
 * - Integrate with the thumbnail state table
 *
 * For now, we rely on:
 * 1. Image preprocessing in FileSyncProvider (resizes to 1500px max)
 * 2. expo-image's efficient loading and caching
 */
export function useThumbnails(_config: ThumbnailConfig) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Pre-initialize the processor for faster first thumbnail generation
    getProcessor().catch((error) => {
      console.error('[useThumbnails] Failed to initialize processor:', error)
    })
  }, [])

  // Return utility functions
  return {
    generateThumbnail,
    generateThumbnails,
  }
}
