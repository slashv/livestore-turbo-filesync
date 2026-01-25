import { deleteFile } from '@livestore-filesync/core'
import { queryDb } from '@livestore/livestore'
import { useAppStore } from '@repo/core'
import { tables } from '@repo/schema'
import { useEffect, useState } from 'react'
import { FileSyncImage } from './FileSyncImage'
import { ImageDebugInfo } from './ImageDebugInfo'

type Image = typeof tables.images.rowSchema.Type

export interface ImageCardProps {
  image: Image
  onDelete: () => void
  onUpdateTitle: (title: string) => void
  /** Whether to enable thumbnail resolution (default: true) */
  enableThumbnails?: boolean
}

export function ImageCard({
  image,
  onDelete,
  onUpdateTitle,
  enableThumbnails = true,
}: ImageCardProps) {
  const store = useAppStore()

  const file = store.useQuery(
    queryDb(tables.files.where({ id: image.fileId }).first(), { label: 'gallery-files' })
  )

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(image.title)

  // Update edit title when image title changes (sync from other clients)
  useEffect(() => {
    setEditTitle(image.title)
  }, [image.title])

  if (!file) return null

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

  return (
    <div
      className="overflow-hidden bg-white rounded-lg shadow"
      data-testid={`image-card-${image.id}`}
    >
      <div className="relative bg-gray-100 aspect-square">
        <FileSyncImage
          fileId={file.id}
          size={enableThumbnails ? 'small' : 'full'}
          className="object-cover w-full h-full"
          alt={image.title}
        >
          {({ canDisplay, isUploading, isDownloading, isUsingThumbnail }) => (
            <>
              {/* Image type indicator (thumbnail vs original) */}
              {canDisplay && (
                <div
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white ${
                    isUsingThumbnail ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                  data-testid={`image-type-${image.id}`}
                >
                  {isUsingThumbnail ? 'Thumbnail' : 'Original'}
                </div>
              )}

              {/* Sync status overlay */}
              {canDisplay && (isUploading || isDownloading) && (
                <div
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1 ${
                    isUploading ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  data-testid={`sync-status-${image.id}`}
                >
                  <div className="w-3 h-3 rounded-full border-2 border-white animate-spin border-t-transparent" />
                  {isUploading ? 'Uploading' : 'Downloading'}
                </div>
              )}
            </>
          )}
        </FileSyncImage>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
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
              className="flex-1 px-2 py-1 text-sm bg-white rounded border border-gray-300 focus:outline-none focus:border-rose-400"
              // biome-ignore lint/a11y/noAutofocus: auto focus is intentional for inline editing
              autoFocus
              data-testid={`title-input-${image.id}`}
            />
          ) : (
            <input
              type="text"
              value={image.title}
              readOnly
              onClick={() => setIsEditing(true)}
              className="flex-1 px-2 py-1 text-sm font-medium text-gray-700 truncate bg-gray-50 rounded border border-gray-200 cursor-pointer hover:border-gray-300 hover:bg-white"
              title="Click to edit"
              data-testid={`title-${image.id}`}
            />
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-gray-400 transition-colors hover:text-red-500"
            data-testid={`delete-button-${image.id}`}
          >
            Delete
          </button>
        </div>

        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            Debug
          </summary>
          <ImageDebugInfo fileId={file.id} />
        </details>
      </div>
    </div>
  )
}
