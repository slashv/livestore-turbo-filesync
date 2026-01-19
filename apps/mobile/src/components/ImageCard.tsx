import { deleteFile, getFileDisplayState, resolveFileUrl } from '@livestore-filesync/core'
import type { Store } from '@livestore/livestore'
import { queryDb } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { type schema, tables } from '@repo/schema'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

type ImageRow = typeof tables.images.rowSchema.Type
type AppStore = Store<typeof schema> & ReactApi

export interface ImageCardProps {
  image: ImageRow
  store: AppStore
  onDelete: () => void
  onUpdateTitle: (title: string) => void
}

export function ImageCard({ image, store, onDelete, onUpdateTitle }: ImageCardProps) {
  // Get local file state for display status
  const [localFileState] = store.useClientDocument(tables.localFileState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: image.fileId }).first(), { label: 'gallery-files' })
  )

  // State for URLs
  const [src, setSrc] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(image.title)

  // Early return if file doesn't exist yet
  if (!file) return null

  const displayState = getFileDisplayState(file, localFileState?.localFiles ?? {})
  const { canDisplay, isUploading, isDownloading } = displayState

  // Resolve file URL on mount and when file updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: file.updatedAt intentionally triggers re-resolution
  useEffect(() => {
    resolveFileUrl(file.id).then((url) => {
      if (url) setSrc(url)
    })
  }, [file.id, file.updatedAt])

  // Update edit title when image title changes (sync from other clients)
  useEffect(() => {
    setEditTitle(image.title)
  }, [image.title])

  const handleDelete = async () => {
    onDelete()
    await deleteFile(file.id)
  }

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle.trim() !== image.title) {
      onUpdateTitle(editTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <View style={styles.card} testID={`image-card-${image.id}`}>
      <View style={styles.imageContainer}>
        {canDisplay && src ? (
          <>
            <Image
              source={{ uri: src }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              testID={`image-display-${image.id}`}
            />
            {/* Sync status indicator overlay */}
            {(isUploading || isDownloading) && (
              <View
                style={[
                  styles.statusBadge,
                  isUploading ? styles.uploadingBadge : styles.downloadingBadge,
                ]}
                testID={isUploading ? 'sync-status-uploading' : 'sync-status-downloading'}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.statusText}>{isUploading ? 'Uploading' : 'Downloading'}</Text>
              </View>
            )}
            {/* Synced indicator (shown when not uploading/downloading) */}
            {!isUploading && !isDownloading && (
              <View style={[styles.statusBadge, styles.syncedBadge]} testID="sync-status-synced">
                <Text style={styles.statusText}>Synced</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholder} testID={`image-placeholder-${image.id}`}>
            {isUploading && (
              <>
                <ActivityIndicator size="large" color="#b83f45" />
                <Text style={styles.placeholderText}>Uploading...</Text>
              </>
            )}
            {isDownloading && (
              <>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.placeholderText}>Downloading...</Text>
              </>
            )}
            {!isUploading && !isDownloading && (
              <Text style={styles.placeholderText}>Waiting for file...</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        {isEditing ? (
          <TextInput
            style={styles.titleInput}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={handleTitleSubmit}
            onSubmitEditing={handleTitleSubmit}
            autoFocus
            testID={`title-input-${image.id}`}
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} testID={`image-title-${image.id}`}>
            <Text style={styles.title} numberOfLines={1}>
              {image.title}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleDelete} testID={`delete-button-${image.id}`}>
          <Text style={styles.deleteButton}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  uploadingBadge: {
    backgroundColor: '#b83f45',
  },
  downloadingBadge: {
    backgroundColor: '#3b82f6',
  },
  syncedBadge: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#b83f45',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButton: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
})
