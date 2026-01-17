import { saveFile } from '@livestore-filesync/core'
import { type Image, createGalleryActions, imagesQuery } from '@repo/core'
import { useRef } from 'react'
import { useAppStore } from '~/livestore/store'
import { ImageCard } from './ImageCard'

export function Gallery({ userId }: { userId: string }) {
  const store = useAppStore(userId)
  const inputRef = useRef<HTMLInputElement>(null)

  const images = store.useQuery(imagesQuery) as Image[]
  const actions = createGalleryActions(store)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      try {
        console.log('[Gallery] Saving file:', file.name)
        const result = await saveFile(file)
        console.log('[Gallery] File saved:', result)
        const imageId = crypto.randomUUID()
        const title = file.name.replace(/\.[^/.]+$/, '')
        console.log('[Gallery] Creating image:', { imageId, title, fileId: result.fileId })
        actions.createImage(imageId, title, result.fileId)
        console.log('[Gallery] Image created')
      } catch (error) {
        console.error('[Gallery] Error uploading file:', error)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4" data-testid="gallery">
      <h1 className="text-4xl font-thin text-center text-rose-800 mb-8">gallery</h1>

      <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
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
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-rose-400 hover:text-rose-600 transition-colors"
          data-testid="upload-button"
        >
          + Upload Images
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center text-gray-400 py-20" data-testid="empty-state">
          <p>No images yet. Upload some to get started!</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="image-grid"
        >
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              userId={userId}
              onDelete={() => actions.deleteImage(image.id)}
              onUpdateTitle={(title) => actions.updateTitle(image.id, title)}
            />
          ))}
        </div>
      )}

      <p className="text-center text-gray-400 text-sm mt-8">Synced with LiveStore FileSync</p>
    </div>
  )
}
