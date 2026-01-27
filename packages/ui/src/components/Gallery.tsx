import { saveFile } from '@livestore-filesync/core'
import { queryDb } from '@livestore/livestore'
import { events, tables } from '@repo/store'
import { type ReactNode, useCallback, useRef, useState } from 'react'
import { useAppStore } from '../AppStoreProvider'
import { ImageCard } from './ImageCard'

const imagesQuery = queryDb(tables.images.where({ deletedAt: null }), { label: 'images' })

export interface GalleryProps {
  /** Content to render before the title (e.g., spacer for electron title bar) */
  headerContent?: ReactNode
  /** Footer text to display at the bottom */
  footerText?: ReactNode
  /** Whether to enable thumbnail resolution (default: true) */
  enableThumbnails?: boolean
}

export function Gallery({
  headerContent,
  footerText = 'Synced with LiveStore FileSync',
  enableThumbnails = true,
}: GalleryProps) {
  const store = useAppStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragFileCount, setDragFileCount] = useState(0)

  const images = store.useQuery(imagesQuery)

  const uploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        try {
          const result = await saveFile(file)
          const imageId = crypto.randomUUID()
          const title = file.name.replace(/\.[^/.]+$/, '')
          store.commit(
            events.imageCreated({
              id: imageId,
              title,
              fileId: result.fileId,
              createdAt: new Date(),
            })
          )
        } catch (error) {
          console.error('[Gallery] Error uploading file:', error)
        }
      }
    },
    [store]
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    await uploadFiles(Array.from(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items) {
      setDragFileCount(e.dataTransfer.items.length)
    }
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
      setDragFileCount(0)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    setDragFileCount(0)

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  return (
    <div
      className="px-4 py-10 mx-auto max-w-6xl"
      data-testid="gallery"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {headerContent}

      <h1 className="mb-8 text-4xl font-thin text-center text-rose-800">gallery</h1>

      <div className="p-4 mb-6 bg-white rounded-lg shadow-lg">
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
          className="py-3 w-full text-gray-500 rounded-lg border-2 border-gray-300 border-dashed transition-colors hover:border-rose-400 hover:text-rose-600"
          data-testid="upload-button"
        >
          + Upload Images
        </button>
      </div>

      {images.length === 0 && !isDragging ? (
        <div className="py-20 text-center text-gray-400" data-testid="empty-state">
          <p>No images yet. Upload some to get started!</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="image-grid"
        >
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              enableThumbnails={enableThumbnails}
              onDelete={() =>
                store.commit(events.imageDeleted({ id: image.id, deletedAt: new Date() }))
              }
              onUpdateTitle={(title) =>
                store.commit(events.imageTitleUpdated({ id: image.id, title }))
              }
            />
          ))}
          {isDragging &&
            Array.from({ length: dragFileCount }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral placeholders with no stable identity
                key={`placeholder-${i}`}
                className="overflow-hidden rounded-lg border-2 border-rose-300 border-dashed bg-rose-50"
                data-testid={`drop-placeholder-${i}`}
              >
                <div className="flex justify-center items-center w-full bg-rose-50 aspect-square">
                  <span className="text-sm text-rose-400">Drop to upload</span>
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="mt-8 text-sm text-center text-gray-400">{footerText}</p>
    </div>
  )
}
