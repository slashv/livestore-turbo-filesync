import { getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import { resolveThumbnailUrl } from '@livestore-filesync/image/thumbnails'
import { queryDb } from '@livestore/livestore'
import { useAppStore } from '@repo/core'
import { tables } from '@repo/schema'
import { type ReactNode, useEffect, useState } from 'react'

type FillMode = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

export interface FileSyncImageState {
  isUploading: boolean
  isDownloading: boolean
  canDisplay: boolean
  isUsingThumbnail: boolean
  src: string | null
}

export interface FileSyncImageProps {
  fileId: string
  size?: 'small' | 'medium' | 'large' | 'full'
  fillMode?: FillMode
  className?: string
  alt?: string
  children?: (state: FileSyncImageState) => ReactNode
}

export function FileSyncImage({
  fileId,
  size = 'small',
  fillMode = 'cover',
  className,
  alt,
  children,
}: FileSyncImageProps) {
  const store = useAppStore()

  const [localFileState] = store.useClientDocument(tables.localFileState)
  const [thumbnailStateDoc] = store.useClientDocument(tables.thumbnailState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: fileId }).first(), { label: 'filesync-image-file' })
  )

  const [src, setSrc] = useState<string | null>(null)
  const [isUsingThumbnail, setIsUsingThumbnail] = useState(false)

  const displayState = file ? getFileDisplayState(file, localFileState?.localFiles ?? {}) : null
  const canDisplay = displayState?.canDisplay ?? false
  const isUploading = displayState?.isUploading ?? false
  const isDownloading = displayState?.isDownloading ?? false

  const thumbnailStatus =
    size === 'full'
      ? null
      : (thumbnailStateDoc?.files?.[fileId]?.sizes?.[size]?.status ?? 'pending')

  // Resolve URL when size or file changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: file.updatedAt is intentional for reactivity
  useEffect(() => {
    let cancelled = false

    const resolveUrl = async () => {
      // If requesting full size, use file URL directly
      if (size === 'full') {
        const url = await resolveFileUrl(fileId)
        if (!cancelled && url) {
          setSrc(url)
          setIsUsingThumbnail(false)
        }
        return
      }

      // Try thumbnail first if it's ready
      if (thumbnailStatus === 'done') {
        const thumbnailUrl = await resolveThumbnailUrl(fileId, size)
        if (!cancelled && thumbnailUrl) {
          setSrc(thumbnailUrl)
          setIsUsingThumbnail(true)
          return
        }
      }

      // Fallback to full image
      const url = await resolveFileUrl(fileId)
      if (!cancelled && url) {
        setSrc(url)
        setIsUsingThumbnail(false)
      }
    }

    resolveUrl()

    return () => {
      cancelled = true
    }
  }, [fileId, size, thumbnailStatus, file?.updatedAt])

  if (!file || !localFileState) {
    return null
  }

  const state: FileSyncImageState = {
    isUploading,
    isDownloading,
    canDisplay,
    isUsingThumbnail,
    src,
  }

  // Show placeholder if not displayable or no src
  if (!canDisplay || !src) {
    return (
      <div
        className={className}
        data-testid="filesync-image-placeholder"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isUploading && 'Uploading...'}
        {isDownloading && 'Downloading...'}
        {!isUploading && !isDownloading && 'Waiting for file...'}
        {children?.(state)}
      </div>
    )
  }

  return (
    <div
      data-testid="filesync-image"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ objectFit: fillMode, width: '100%', height: '100%' }}
        data-testid="filesync-image-img"
      />
      {children?.(state)}
    </div>
  )
}
