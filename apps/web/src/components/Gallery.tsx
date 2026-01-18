import { Gallery as SharedGallery } from '@repo/ui'
import { useAppStore } from '~/livestore/store'

export function Gallery({ userId }: { userId: string }) {
  const store = useAppStore(userId)

  return <SharedGallery store={store} />
}
