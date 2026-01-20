import { Gallery as SharedGallery } from '@repo/ui'
import { useAppStore } from '~/livestore/store'

export function Gallery() {
  const store = useAppStore()

  return <SharedGallery store={store} />
}
