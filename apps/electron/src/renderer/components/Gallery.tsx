import { Gallery as SharedGallery } from '@repo/ui'
import { useAppStore } from '~/livestore/store'

export function Gallery({ userId }: { userId: string }) {
  const store = useAppStore(userId)

  return (
    <SharedGallery
      store={store}
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
