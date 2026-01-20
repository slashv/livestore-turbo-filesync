import { saveFile } from '@livestore-filesync/core'
import { ExpoFile } from '@livestore-filesync/expo'
import { createGalleryActions, imagesQuery } from '@repo/core'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAppStore } from '../livestore/store'
import { ImageCard } from './ImageCard'

interface GalleryProps {
  userId: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const NUM_COLUMNS = 2
const CARD_GAP = 12
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS

export function Gallery({ userId }: GalleryProps) {
  const store = useAppStore(userId)
  const images = store.useQuery(imagesQuery)
  const actions = createGalleryActions(store)
  const [isUploading, setIsUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handlePickImage = async () => {
    console.log('[Gallery] handlePickImage started')

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    console.log('[Gallery] Permission status:', status)
    if (status !== 'granted') {
      console.warn('[Gallery] Media library permission denied')
      return
    }

    // Launch image picker (gallery only, no camera)
    console.log('[Gallery] Launching image picker...')
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    })
    console.log('[Gallery] Raw image picker result keys:', Object.keys(result))

    console.log(
      '[Gallery] Image picker result:',
      result.canceled ? 'canceled' : `${result.assets?.length} assets`
    )

    if (result.canceled) return

    setIsUploading(true)

    try {
      console.log('[Gallery] expo-file-system module import test...')
      try {
        const fsModule = await import('expo-file-system')
        console.log('[Gallery] expo-file-system keys:', Object.keys(fsModule))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defaultKeys = (fsModule as any).default ? Object.keys((fsModule as any).default) : []
        if (defaultKeys.length > 0) {
          console.log('[Gallery] expo-file-system default keys:', defaultKeys)
        }
      } catch (fsError) {
        console.error('[Gallery] expo-file-system import failed:', fsError)
      }

      for (const asset of result.assets) {
        console.log('[Gallery] Processing asset:', {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
        })
        console.log('[Gallery] Asset keys:', Object.keys(asset))

        // Create ExpoFile from the picked image
        const file = ExpoFile.fromUri(asset.uri, {
          type: asset.mimeType ?? 'image/jpeg',
          name: asset.fileName ?? `image-${Date.now()}.jpg`,
        })
        console.log('[Gallery] Created ExpoFile:', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        })

        // Test reading the file first to diagnose issues
        try {
          console.log('[Gallery] Testing file read via arrayBuffer()...')
          const testBuffer = await file.arrayBuffer()
          console.log('[Gallery] File read successful, size:', testBuffer.byteLength)
        } catch (readError) {
          console.error('[Gallery] File read FAILED:', readError)
          if (readError instanceof Error) {
            console.error('[Gallery] Read error details:', {
              name: readError.name,
              message: readError.message,
              stack: readError.stack,
            })
          }
          throw readError
        }

        // Save file through filesync
        console.log('[Gallery] Calling saveFile...')
        const saveResult = await saveFile(file as unknown as File)
        console.log('[Gallery] saveFile result:', saveResult)

        // Create image record in store
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageId = (globalThis as any).crypto.randomUUID() as string
        const title = (asset.fileName ?? `Image ${Date.now()}`).replace(/\.[^/.]+$/, '')
        console.log('[Gallery] Creating image record:', {
          imageId,
          title,
          fileId: saveResult.fileId,
        })
        actions.createImage(imageId, title, saveResult.fileId)
        console.log('[Gallery] Image record created successfully')
      }
    } catch (error) {
      console.error('[Gallery] Error uploading files:', error)
      // Log more details about the error
      if (error instanceof Error) {
        console.error('[Gallery] Error name:', error.name)
        console.error('[Gallery] Error message:', error.message)
        console.error('[Gallery] Error stack:', error.stack)
      }
    } finally {
      setIsUploading(false)
      console.log('[Gallery] handlePickImage completed')
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // Just wait a moment - the sync is automatic
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
    setRefreshing(false)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: (typeof images)[0] }) => (
      <View style={styles.cardWrapper}>
        <ImageCard
          image={item}
          store={store}
          onDelete={() => actions.deleteImage(item.id)}
          onUpdateTitle={(title) => actions.updateTitle(item.id, title)}
        />
      </View>
    ),
    [store, actions]
  )

  const keyExtractor = useCallback((item: (typeof images)[0]) => item.id, [])

  return (
    <View style={styles.container} testID="gallery">
      <Text style={styles.title}>gallery</Text>

      {/* Upload button */}
      <View style={styles.uploadContainer}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickImage}
          disabled={isUploading}
          testID="upload-button"
        >
          {isUploading ? (
            <ActivityIndicator color="#b83f45" />
          ) : (
            <Text style={styles.uploadButtonText}>+ Upload Images</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Image grid */}
      {images.length === 0 ? (
        <View style={styles.emptyState} testID="empty-state">
          <Text style={styles.emptyStateText}>No images yet. Upload some to get started!</Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#b83f45" />
          }
          testID="image-grid"
        />
      )}

      <Text style={styles.footer}>Synced with LiveStore FileSync</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: '200',
    color: '#b83f45',
    textAlign: 'center',
    marginVertical: 16,
  },
  uploadContainer: {
    paddingHorizontal: CARD_GAP,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  grid: {
    paddingHorizontal: CARD_GAP / 2,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'flex-start',
    gap: CARD_GAP,
    marginHorizontal: CARD_GAP / 2,
    marginBottom: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
})
