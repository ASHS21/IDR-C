import { SYNC_STATUS_CONFIG } from '@/lib/utils/constants'
import { formatRelativeTime } from '@/lib/utils/formatters'

interface IntegrationHealth {
  id: string
  name: string
  type: string
  syncStatus: string
  lastSyncAt: string | null
}

interface IntegrationHealthStripProps {
  integrations: IntegrationHealth[]
}

export function IntegrationHealthStrip({ integrations }: IntegrationHealthStripProps) {
  if (!integrations || integrations.length === 0) {
    return (
      <p className="text-sm text-slate-400">No integrations configured</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {integrations.map((integration) => {
        const config = SYNC_STATUS_CONFIG[integration.syncStatus as keyof typeof SYNC_STATUS_CONFIG]
          || SYNC_STATUS_CONFIG.disconnected
        return (
          <div
            key={integration.id}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <div>
              <p className="text-sm font-medium text-slate-700">{integration.name}</p>
              <p className="text-xs text-slate-500">
                {integration.lastSyncAt
                  ? `Synced ${formatRelativeTime(integration.lastSyncAt)}`
                  : 'Never synced'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
