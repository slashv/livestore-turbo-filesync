import { deleteFile, getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import { resolveThumbnailUrl } from '@livestore-filesync/image/thumbnails'
import type { Store } from '@livestore/livestore'
import { queryDb } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { type schema, tables } from '@repo/schema'
import { useEffect, useMemo, useState } from 'react'

type Image = typeof tables.images.rowSchema.Type
type AppStore = Store<typeof schema> & ReactApi

export interface ImageCardProps {
  image: Image
  store: AppStore
  onDelete: () => void
  onUpdateTitle: (title: string) => void
  /** Whether to enable thumbnail resolution (default: true) */
  enableThumbnails?: boolean
}

export function ImageCard({
  image,
  store,
  onDelete,
  onUpdateTitle,
  enableThumbnails = true,
}: ImageCardProps) {
  // Get local file state for display status
  const [localFileState] = store.useClientDocument(tables.localFileState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: image.fileId }).first(), { label: 'gallery-files' })
  )
  if (!file) return null
  const displayState = getFileDisplayState(file, localFileState?.localFiles ?? {})
  const { canDisplay, isUploading, isDownloading, localState: localFile } = displayState

  // State for URLs
  const [src, setSrc] = useState<string | null>(null)
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(image.title)

  // Get thumbnail state for tracking thumbnail generation
  const [thumbnailStateDoc] = store.useClientDocument(tables.thumbnailState)
  const thumbnailState = thumbnailStateDoc?.files?.[file.id]
  const smallThumbnailStatus = useMemo(
    () => thumbnailState?.sizes?.small?.status ?? 'pending',
    [thumbnailState]
  )

  // Resolve file URL on mount and when file updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: file.updatedAt is intentional for reactivity
  useEffect(() => {
    resolveFileUrl(file.id).then((url) => {
      if (url) setSrc(url)
    })
  }, [file.id, file.updatedAt])

  // Resolve thumbnail URL when thumbnail state changes to 'done'
  useEffect(() => {
    if (enableThumbnails && smallThumbnailStatus === 'done') {
      resolveThumbnailUrl(file.id, 'small').then((url) => {
        if (url) setThumbnailSrc(url)
      })
    }
  }, [file.id, smallThumbnailStatus, enableThumbnails])

  // Update edit title when image title changes (sync from other clients)
  useEffect(() => {
    setEditTitle(image.title)
  }, [image.title])

  const handleDelete = async () => {
    onDelete()
    await deleteFile(file.id)
  }

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle.trim() !== image.title) {
      onUpdateTitle(editTitle.trim())
    }
    setIsEditing(false)
  }

  // Use thumbnail if available, fallback to full image
  const displaySrc = thumbnailSrc || src
  const isShowingThumbnail = !!thumbnailSrc

  // Determine sync status for display
  const syncStatus = isUploading ? 'uploading' : isDownloading ? 'downloading' : 'synced'

  return (
    <div
      className="overflow-hidden bg-white rounded-lg shadow"
      data-testid={`image-card-${image.id}`}
      data-sync-status={syncStatus}
      data-image-type={isShowingThumbnail ? 'thumbnail' : 'original'}
    >
      <div className="relative bg-gray-100 aspect-square">
        {canDisplay && displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt={image.title}
              className="object-cover w-full h-full"
              data-testid={`image-${image.id}`}
            />
            {/* Image type indicator (thumbnail vs original) */}
            <div
              className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
                isShowingThumbnail ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'
              }`}
              data-testid={`image-type-${image.id}`}
            >
              {isShowingThumbnail ? 'Thumbnail' : 'Original'}
            </div>
          </>
        ) : (
          <div
            className="flex flex-col gap-2 justify-center items-center w-full h-full text-sm text-gray-400"
            data-testid={`image-placeholder-${image.id}`}
          >
            {isUploading && (
              <>
                <div className="w-6 h-6 rounded-full border-2 border-rose-400 animate-spin border-t-transparent" />
                <span>Uploading...</span>
              </>
            )}
            {isDownloading && (
              <>
                <div className="w-6 h-6 rounded-full border-2 border-blue-400 animate-spin border-t-transparent" />
                <span>Downloading...</span>
              </>
            )}
            {!isUploading && !isDownloading && <span>Waiting for file...</span>}
          </div>
        )}
        {/* Sync status indicator overlay */}
        {(isUploading || isDownloading) && canDisplay && displaySrc && (
          <div
            className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
              isUploading ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'
            }`}
            data-testid={`sync-status-${image.id}`}
          >
            <div className="w-3 h-3 rounded-full border-2 border-white animate-spin border-t-transparent" />
            {isUploading ? 'Uploading' : 'Downloading'}
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
            className="px-2 py-1 w-full rounded border focus:outline-none focus:border-rose-400"
            // biome-ignore lint/a11y/noAutofocus: auto focus is intentional for inline editing
            autoFocus
            data-testid={`title-input-${image.id}`}
          />
        ) : (
          <button
            type="button"
            className="w-full font-medium text-left text-gray-700 truncate cursor-pointer hover:text-rose-600"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
            data-testid={`title-${image.id}`}
          >
            {image.title}
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          className="mt-2 text-sm text-gray-400 transition-colors hover:text-red-500"
          data-testid={`delete-button-${image.id}`}
        >
          Delete
        </button>

        {/* Debug info */}
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">Debug</summary>
          <table className="mt-1 w-full text-left">
            <tbody>
              <tr>
                <td className="pr-2">src:</td>
                <td className="truncate max-w-[150px]">{src || 'null'}</td>
              </tr>
              <tr>
                <td className="pr-2">File Path:</td>
                <td className="max-w-[150px]">{file.path}</td>
              </tr>
              <tr>
                <td className="pr-2">Remote Key:</td>
                <td className="truncate max-w-[150px]">{file.remoteKey || 'null'}</td>
              </tr>
              <tr>
                <td className="pr-2">Content Hash:</td>
                <td className="truncate max-w-[150px]">{file.contentHash}</td>
              </tr>
              <tr>
                <td className="pr-2">Updated At:</td>
                <td>{String(file.updatedAt)}</td>
              </tr>
              <tr>
                <td className="pr-2">Local Hash:</td>
                <td className="truncate max-w-[150px]">{localFile?.localHash || 'null'}</td>
              </tr>
              <tr>
                <td className="pr-2">Download:</td>
                <td>{localFile?.downloadStatus || 'null'}</td>
              </tr>
              <tr>
                <td className="pr-2">Upload:</td>
                <td>{localFile?.uploadStatus || 'null'}</td>
              </tr>
              <tr>
                <td className="pr-2">Can Display:</td>
                <td>{String(canDisplay)}</td>
              </tr>
              {localFile?.lastSyncError && (
                <tr>
                  <td className="pr-2">Error:</td>
                  <td className="text-red-500">{localFile.lastSyncError}</td>
                </tr>
              )}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}
