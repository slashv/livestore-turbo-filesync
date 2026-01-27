import { useOnlineStatus } from '../hooks/useOnlineStatus'

export interface ConnectionStatusProps {
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * Connection status indicator with toggle switch.
 *
 * Displays a colored circle indicating connection status:
 * - Gray: Sync is disabled (switch is OFF)
 * - Green: Sync is enabled AND online
 * - Red: Sync is enabled AND offline
 *
 * The toggle controls both LiveStore sync and LiveStore-FileSync.
 */
export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const { isOnline, isSyncEnabled, toggle } = useOnlineStatus()

  // Determine indicator color
  const indicatorColor = !isSyncEnabled
    ? 'bg-gray-400' // Disabled
    : isOnline
      ? 'bg-green-500' // Online
      : 'bg-red-500' // Offline

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="connection-status">
      {/* Status indicator circle */}
      <div
        className={`w-2.5 h-2.5 rounded-full ${indicatorColor}`}
        data-testid="connection-indicator"
        title={!isSyncEnabled ? 'Sync disabled' : isOnline ? 'Online' : 'Offline'}
      />

      {/* Toggle switch - temporarily hidden due to issues */}
      {/* <button
        type="button"
        role="switch"
        aria-checked={isSyncEnabled}
        onClick={toggle}
        className={`
          relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:ring-offset-2
          ${isSyncEnabled ? 'bg-rose-600' : 'bg-gray-200'}
        `}
        data-testid="connection-toggle"
      >
        <span className="sr-only">Toggle sync</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-4 w-4 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${isSyncEnabled ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button> */}
    </div>
  )
}
