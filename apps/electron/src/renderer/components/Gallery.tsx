import { Gallery as SharedGallery } from '@repo/ui'

export function Gallery() {
  return (
    <SharedGallery
      headerContent={<div className="h-6" />}
      footerText={
        <>
          Electron App
          <br />
          <span className="text-xs">Synced with LiveStore FileSync</span>
        </>
      }
      enableThumbnails={import.meta.env.DEV}
    />
  )
}
