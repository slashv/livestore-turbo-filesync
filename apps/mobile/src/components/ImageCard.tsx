import { deleteFile } from '@livestore-filesync/core'
import type { Store } from '@livestore/livestore'
import { queryDb } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { type schema, tables } from '@repo/schema'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { FileSyncImage } from './FileSyncImage'
import { ImageDebugInfo } from './ImageDebugInfo'

type ImageRow = typeof tables.images.rowSchema.Type
type AppStore = Store<typeof schema> & ReactApi

export interface ImageCardProps {
  image: ImageRow
  store: AppStore
  onDelete: () => void
  onUpdateTitle: (title: string) => void
}

export function ImageCard({ image, store, onDelete, onUpdateTitle }: ImageCardProps) {
  const file = store.useQuery(
    queryDb(tables.files.where({ id: image.fileId }).first(), { label: 'gallery-files' })
  )

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(image.title)

  // Update edit title when image title changes (sync from other clients)
  useEffect(() => {
    setEditTitle(image.title)
  }, [image.title])

  const handleDelete = async () => {
    if (!file) return

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
      {/* Image container with square aspect ratio */}
      <View style={styles.imageContainer}>
        {file ? (
          <FileSyncImage fileId={file.id} store={store} style={styles.image}>
            {({ canDisplay, isUploading, isDownloading }) => (
              <>
                {/* Sync status overlay */}
                {canDisplay && (isUploading || isDownloading) && (
                  <View
                    style={[
                      styles.statusBadge,
                      isUploading ? styles.uploadingBadge : styles.downloadingBadge,
                    ]}
                    testID={`sync-status-${image.id}`}
                  >
                    <ActivityIndicator size="small" color="#fff" style={styles.statusSpinner} />
                    <Text style={styles.statusText}>
                      {isUploading ? 'Uploading' : 'Downloading'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </FileSyncImage>
        ) : (
          <View style={styles.loadingPlaceholder}>
            <ActivityIndicator size="small" color="#9ca3af" />
          </View>
        )}
      </View>

      {/* Content area */}
      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.titleRow}>
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
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.titleButton}
              testID={`title-${image.id}`}
            >
              <Text style={styles.title} numberOfLines={1}>
                {image.title}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} testID={`delete-button-${image.id}`}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Debug info (hidden by default) */}
        {file && <ImageDebugInfo fileId={file.id} store={store} />}
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
  loadingPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
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
    backgroundColor: '#f43f5e',
  },
  downloadingBadge: {
    backgroundColor: '#3b82f6',
  },
  statusSpinner: {
    width: 12,
    height: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  titleInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f43f5e',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButton: {
    fontSize: 12,
    color: '#9ca3af',
  },
})
