import { getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import type { Store } from '@livestore/livestore'
import { queryDb } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { type schema, tables } from '@repo/schema'
import { Image } from 'expo-image'
import { type ReactNode, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native'

type AppStore = Store<typeof schema> & ReactApi

export interface FileSyncImageState {
  isUploading: boolean
  isDownloading: boolean
  canDisplay: boolean
  src: string | null
}

export interface FileSyncImageProps {
  fileId: string
  store: AppStore
  style?: StyleProp<ViewStyle>
  children?: (state: FileSyncImageState) => ReactNode
}

export function FileSyncImage({ fileId, store, style, children }: FileSyncImageProps) {
  const [localFileState] = store.useClientDocument(tables.localFileState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: fileId }).first(), { label: 'filesync-image-file' })
  )

  const [src, setSrc] = useState<string | null>(null)

  // Early return if file doesn't exist yet
  if (!file || !localFileState) {
    return null
  }

  const { canDisplay, isUploading, isDownloading } = getFileDisplayState(
    file,
    localFileState.localFiles
  )

  // Resolve file URL on mount and when file updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: file.updatedAt intentionally triggers re-resolution
  useEffect(() => {
    let cancelled = false

    const resolveUrl = async () => {
      const url = await resolveFileUrl(fileId)
      if (!cancelled && url) {
        setSrc(url)
      }
    }

    resolveUrl()

    return () => {
      cancelled = true
    }
  }, [fileId, file.updatedAt])

  const state: FileSyncImageState = {
    isUploading,
    isDownloading,
    canDisplay,
    src,
  }

  // Show placeholder if not displayable or no src
  if (!canDisplay || !src) {
    return (
      <View style={[styles.placeholder, style]} testID="filesync-image-placeholder">
        {isUploading && <ActivityIndicator size="small" color="#b83f45" />}
        {isDownloading && <ActivityIndicator size="small" color="#3b82f6" />}
        {!isUploading && !isDownloading && <Text style={styles.placeholderText}>...</Text>}
        {children?.(state)}
      </View>
    )
  }

  return (
    <View style={[styles.container, style]} testID="filesync-image">
      <Image
        source={{ uri: src }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        testID="filesync-image-img"
      />
      {children?.(state)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderText: {
    fontSize: 12,
    color: '#9ca3af',
  },
})
