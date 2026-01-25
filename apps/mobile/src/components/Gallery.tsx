import { saveFile } from '@livestore-filesync/core'
import { ExpoFile } from '@livestore-filesync/expo'
import { imagesQuery } from '@repo/core'
import { events } from '@repo/schema'
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
import { useAuth } from './AuthProvider'
import { ImageCard } from './ImageCard'

interface GalleryProps {
  userId: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const NUM_COLUMNS = 2
const CARD_GAP = 12
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GAP * 3) / 2

export function Gallery({ userId }: GalleryProps) {
  const store = useAppStore(userId)
  const images = store.useQuery(imagesQuery)
  const { user, signOut } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handlePickImage = async () => {
    // Request permissions
    await ImagePicker.requestMediaLibraryPermissionsAsync()

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    })

    if (result.canceled) return

    setIsUploading(true)
    try {
      for (const asset of result.assets) {
        const file = ExpoFile.fromUri(asset.uri, {
          type: asset.mimeType ?? 'image/jpeg',
          name: asset.fileName ?? `image-${Date.now()}.jpg`,
        })

        const saveResult = await saveFile(file as unknown as File)

        const imageId = (globalThis as any).crypto.randomUUID() as string
        const title = (asset.fileName ?? `Image ${Date.now()}`).replace(/\.[^/.]+$/, '')
        store.commit(
          events.imageCreated({
            id: imageId,
            title,
            fileId: saveResult.fileId,
            createdAt: new Date(),
          })
        )
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setIsUploading(false)
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
          onDelete={() => store.commit(events.imageDeleted({ id: item.id, deletedAt: new Date() }))}
          onUpdateTitle={(title) => store.commit(events.imageTitleUpdated({ id: item.id, title }))}
        />
      </View>
    ),
    [store]
  )

  const keyExtractor = useCallback((item: (typeof images)[0]) => item.id, [])

  return (
    <View style={styles.container} testID="gallery">
      {/* Header with user info and sign out */}
      <View style={styles.header}>
        <Text style={styles.userEmail} numberOfLines={1}>
          {user?.email}
        </Text>
        <TouchableOpacity onPress={signOut} testID="sign-out-button">
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

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
          columnWrapperStyle={styles.columnWrapper}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    flexShrink: 1,
  },
  signOutText: {
    fontSize: 14,
    color: '#b83f45',
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
    paddingHorizontal: CARD_GAP,
    paddingTop: CARD_GAP,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
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
