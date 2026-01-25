import { getFileDisplayState } from '@livestore-filesync/core'
import { queryDb } from '@livestore/livestore'
import { useAppStore } from '@repo/core'
import { tables } from '@repo/schema'

export interface ImageDebugInfoProps {
  fileId: string
}

export function ImageDebugInfo({ fileId }: ImageDebugInfoProps) {
  const store = useAppStore()

  const [localFileState] = store.useClientDocument(tables.localFileState)
  const file = store.useQuery(
    queryDb(tables.files.where({ id: fileId }).first(), { label: 'image-debug-file' })
  )

  if (!file) return null

  const displayState = getFileDisplayState(file, localFileState?.localFiles ?? {})
  const { canDisplay, localState: localFile } = displayState

  return (
    <table className="mt-1 w-full text-left text-xs text-gray-500">
      <tbody>
        <tr>
          <td className="pr-2">File Path:</td>
          <td className="max-w-[150px]">{file.path}</td>
        </tr>
        <tr>
          <td className="pr-2">Remote Key:</td>
          <td className="truncate max-w-[150px]">{file.remoteKey || 'null'}</td>
        </tr>
        <tr>
          <td className="pr-2">Content Hash:</td>
          <td className="truncate max-w-[150px]">{file.contentHash}</td>
        </tr>
        <tr>
          <td className="pr-2">Updated At:</td>
          <td>{String(file.updatedAt)}</td>
        </tr>
        <tr>
          <td className="pr-2">Local Hash:</td>
          <td className="truncate max-w-[150px]">{localFile?.localHash || 'null'}</td>
        </tr>
        <tr>
          <td className="pr-2">Download:</td>
          <td>{localFile?.downloadStatus || 'null'}</td>
        </tr>
        <tr>
          <td className="pr-2">Upload:</td>
          <td>{localFile?.uploadStatus || 'null'}</td>
        </tr>
        <tr>
          <td className="pr-2">Can Display:</td>
          <td>{String(canDisplay)}</td>
        </tr>
        {localFile?.lastSyncError && (
          <tr>
            <td className="pr-2">Error:</td>
            <td className="text-red-500">{localFile.lastSyncError}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
