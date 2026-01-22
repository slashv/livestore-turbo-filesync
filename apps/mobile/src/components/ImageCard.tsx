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
    resolveFileUrl(file.id).then((url) => setSrc(url))
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

  // Get local file state for this specific file
  const localFile = localFileState?.localFiles?.[file.id]

  return (
    <View style={styles.card} testID={`image-card-${image.id}`}>
      <View style={styles.horizontalLayout}>
        {/* Left side: Image (1/4 width) */}
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
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholder} testID={`image-placeholder-${image.id}`}>
              {isUploading && <ActivityIndicator size="small" color="#b83f45" />}
              {isDownloading && <ActivityIndicator size="small" color="#3b82f6" />}
              {!isUploading && !isDownloading && <Text style={styles.placeholderText}>...</Text>}
            </View>
          )}
        </View>

        {/* Right side: Debug info (3/4 width) */}
        <View style={styles.debugContainer}>
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
                testID={`image-title-${image.id}`}
              >
                <Text style={styles.title} numberOfLines={1}>
                  {image.title}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete} testID={`delete-button-${image.id}`}>
              <Text style={styles.deleteButton}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Debug info */}
          <View style={styles.debugInfo} testID={`debug-info-${image.id}`}>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>src:</Text>
              <Text style={styles.debugValue} testID={`debug-src-${image.id}`}>
                {src || 'null'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>localHash:</Text>
              <Text
                style={styles.debugValue}
                numberOfLines={1}
                testID={`debug-localHash-${image.id}`}
              >
                {localFile?.localHash ? `${localFile.localHash.slice(0, 8)}...` : 'null'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>download:</Text>
              <Text
                style={[styles.debugValue, isDownloading && styles.activeStatus]}
                testID={`debug-download-${image.id}`}
              >
                {localFile?.downloadStatus || 'null'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>upload:</Text>
              <Text
                style={[styles.debugValue, isUploading && styles.activeStatus]}
                testID={`debug-upload-${image.id}`}
              >
                {localFile?.uploadStatus || 'null'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>canDisplay:</Text>
              <Text
                style={[styles.debugValue, canDisplay ? styles.successStatus : styles.errorStatus]}
                testID={`debug-canDisplay-${image.id}`}
              >
                {String(canDisplay)}
              </Text>
            </View>
            {localFile?.lastSyncError && (
              <View style={styles.debugRow} testID={`debug-error-row-${image.id}`}>
                <Text style={styles.debugLabel}>error:</Text>
                <Text
                  style={[styles.debugValue, styles.errorStatus]}
                  testID={`debug-error-${image.id}`}
                >
                  {localFile.lastSyncError}
                </Text>
              </View>
            )}
          </View>
        </View>
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
  horizontalLayout: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: '25%',
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
  },
  placeholderText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  uploadingBadge: {
    backgroundColor: '#b83f45',
  },
  downloadingBadge: {
    backgroundColor: '#3b82f6',
  },
  debugContainer: {
    flex: 1,
    padding: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleButton: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  titleInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    borderWidth: 1,
    borderColor: '#b83f45',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  deleteButton: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  debugInfo: {
    gap: 2,
  },
  debugRow: {
    flexDirection: 'row',
  },
  debugLabel: {
    fontSize: 10,
    color: '#6b7280',
    width: 70,
    fontWeight: '500',
  },
  debugValue: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  activeStatus: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  successStatus: {
    color: '#22c55e',
    fontWeight: '600',
  },
  errorStatus: {
    color: '#ef4444',
    fontWeight: '600',
  },
})
