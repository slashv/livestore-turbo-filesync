import { saveFile } from '@livestore-filesync/core'
import type { Store } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { createGalleryActions, imagesQuery } from '@repo/core'
import type { schema } from '@repo/schema'
import { type ReactNode, useRef } from 'react'
import { ImageCard } from './ImageCard'

type AppStore = Store<typeof schema> & ReactApi

export interface GalleryProps {
  store: AppStore
  /** Content to render before the title (e.g., spacer for electron title bar) */
  headerContent?: ReactNode
  /** Footer text to display at the bottom */
  footerText?: ReactNode
  /** Whether to enable thumbnail resolution (default: true) */
  enableThumbnails?: boolean
}

export function Gallery({
  store,
  headerContent,
  footerText = 'Synced with LiveStore FileSync',
  enableThumbnails = true,
}: GalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const images = store.useQuery(imagesQuery)
  const actions = createGalleryActions(store)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      try {
        const result = await saveFile(file)
        const imageId = crypto.randomUUID()
        const title = file.name.replace(/\.[^/.]+$/, '')
        actions.createImage(imageId, title, result.fileId)
      } catch (error) {
        console.error('[Gallery] Error uploading file:', error)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="px-4 py-10 mx-auto max-w-6xl" data-testid="gallery">
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

      {images.length === 0 ? (
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
              store={store}
              enableThumbnails={enableThumbnails}
              onDelete={() => actions.deleteImage(image.id)}
              onUpdateTitle={(title) => actions.updateTitle(image.id, title)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-center text-gray-400">{footerText}</p>
    </div>
  )
}
