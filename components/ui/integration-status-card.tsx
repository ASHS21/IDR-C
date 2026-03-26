import { Cloud, Server, Shield, Compass, Key, Database } from 'lucide-react'

interface IntegrationStatusCardProps {
  integration: {
    id: string
    name: string
    type: string
    syncStatus: string
    lastSyncAt: string | null
    lastSyncRecordCount: number
    syncFrequencyMinutes: number
  }
  onSync?: (id: string) => void
}

const SOURCE_ICONS: Record<string, typeof Server> = {
  active_directory: Server,
  azure_ad: Cloud,
  okta: Shield,
  sailpoint: Compass,
  cyberark: Key,
  azure_logs: Cloud,
  sso_provider: Shield,
}

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse?: boolean }> = {
  connected: { color: 'var(--color-low)', label: 'Connected' },
  syncing: { color: 'var(--color-info)', label: 'Syncing', pulse: true },
  error: { color: 'var(--color-critical)', label: 'Error' },
  disconnected: { color: 'var(--text-tertiary)', label: 'Disconnected' },
}

function timeAgo(date: string | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isStale(lastSync: string | null, frequency: number): boolean {
  if (!lastSync) return true
  const elapsed = Date.now() - new Date(lastSync).getTime()
  return elapsed > frequency * 60 * 1000 * 2
}

export function IntegrationStatusCard({ integration, onSync }: IntegrationStatusCardProps) {
  const Icon = SOURCE_ICONS[integration.type] || Database
  const status = STATUS_CONFIG[integration.syncStatus] || STATUS_CONFIG.disconnected
  const stale = isStale(integration.lastSyncAt, integration.syncFrequencyMinutes)

  return (
    <div
      className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Icon size={20} className="text-[var(--text-secondary)]" />
          </div>
          <div>
            <h3 className="text-body font-medium text-[var(--text-primary)]">{integration.name}</h3>
            <p className="text-caption text-[var(--text-tertiary)] capitalize">{integration.type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${status.pulse ? 'animate-pulse-dot' : ''}`}
            style={{ backgroundColor: status.color }}
          />
          <span className="text-micro font-medium" style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>

      {stale && integration.syncStatus !== 'disconnected' && (
        <div className="mb-3 px-3 py-2 rounded-[var(--radius-badge)] text-micro font-medium" style={{ backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' }}>
          Sync is overdue — last synced {timeAgo(integration.lastSyncAt)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-caption">
        <div>
          <p className="text-[var(--text-tertiary)]">Last Sync</p>
          <p className="text-[var(--text-primary)] font-medium">{timeAgo(integration.lastSyncAt)}</p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)]">Records</p>
          <p className="text-[var(--text-primary)] font-medium">{integration.lastSyncRecordCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[var(--text-tertiary)]">Frequency</p>
          <p className="text-[var(--text-primary)] font-medium">Every {integration.syncFrequencyMinutes}m</p>
        </div>
      </div>

      {onSync && (
        <button
          onClick={() => onSync(integration.id)}
          className="mt-4 w-full py-2 text-micro font-medium rounded-[var(--radius-button)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)] transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  )
}
