import { deleteFile, getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import { queryDb } from '@livestore/livestore'
import { tables } from '@repo/schema'
import { useEffect, useMemo, useState } from 'react'
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

  // Query for the specific file by ID
  const fileQuery = useMemo(
    () => queryDb(tables.files.where({ id: image.fileId }), { label: `file-${image.fileId}` }),
    [image.fileId]
  )
  const files = store.useQuery(fileQuery)
  const file = files[0]

  // Get local file state for display status
  const [localFileState] = store.useClientDocument(tables.localFileState)
  const displayState = file
    ? getFileDisplayState(file, localFileState?.localFiles ?? {})
    : { canDisplay: false, isUploading: false }

  // Resolve URLs when file changes
  useEffect(() => {
    if (!file) return

    // Skip thumbnail for now - wasm-vips has issues
    // resolveThumbnailUrl(image.fileId, 'small').then(setThumbnailUrl)
    resolveFileUrl(image.fileId).then(setFullUrl)
  }, [image.fileId, file])

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
            // biome-ignore lint/a11y/noAutofocus: auto focus is intentional for inline editing
            autoFocus
            data-testid={`title-input-${image.id}`}
          />
        ) : (
          <button
            type="button"
            className="w-full text-left font-medium text-gray-700 truncate cursor-pointer hover:text-rose-600"
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
          className="mt-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          data-testid={`delete-button-${image.id}`}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
