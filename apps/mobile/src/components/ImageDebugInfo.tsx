import { getFileDisplayState } from '@livestore-filesync/core'
import type { Store } from '@livestore/livestore'
import { queryDb } from '@livestore/livestore'
import type { ReactApi } from '@livestore/react'
import { type schema, tables } from '@repo/schema'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type AppStore = Store<typeof schema> & ReactApi

export interface ImageDebugInfoProps {
  fileId: string
  store: AppStore
}

export function ImageDebugInfo({ fileId, store }: ImageDebugInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const [localFileState] = store.useClientDocument(tables.localFileState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: fileId }).first(), { label: 'image-debug-file' })
  )

  if (!file) return null

  const displayState = getFileDisplayState(file, localFileState?.localFiles ?? {})
  const { canDisplay, localState: localFile } = displayState

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        testID={`debug-toggle-${fileId}`}
      >
        <Text style={styles.toggleText}>Debug {isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.debugInfo} testID={`debug-info-${fileId}`}>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>File Path:</Text>
            <Text style={styles.debugValue} numberOfLines={1}>
              {file.path}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Remote Key:</Text>
            <Text style={styles.debugValue} numberOfLines={1}>
              {file.remoteKey || 'null'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Content Hash:</Text>
            <Text style={styles.debugValue} numberOfLines={1}>
              {file.contentHash}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Updated At:</Text>
            <Text style={styles.debugValue}>{String(file.updatedAt)}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Local Hash:</Text>
            <Text style={styles.debugValue} numberOfLines={1}>
              {localFile?.localHash || 'null'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Download:</Text>
            <Text style={styles.debugValue}>{localFile?.downloadStatus || 'null'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Upload:</Text>
            <Text style={styles.debugValue}>{localFile?.uploadStatus || 'null'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Can Display:</Text>
            <Text
              style={[styles.debugValue, canDisplay ? styles.successStatus : styles.errorStatus]}
            >
              {String(canDisplay)}
            </Text>
          </View>
          {localFile?.lastSyncError && (
            <View style={styles.debugRow} testID={`debug-error-row-${fileId}`}>
              <Text style={styles.debugLabel}>Error:</Text>
              <Text style={[styles.debugValue, styles.errorStatus]}>{localFile.lastSyncError}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  toggleButton: {
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  debugInfo: {
    marginTop: 4,
    gap: 2,
  },
  debugRow: {
    flexDirection: 'row',
  },
  debugLabel: {
    fontSize: 10,
    color: '#6b7280',
    width: 80,
    fontWeight: '500',
  },
  debugValue: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
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
