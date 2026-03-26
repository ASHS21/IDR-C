'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { SYNC_STATUS_CONFIG } from '@/lib/utils/constants'
import { formatRelativeTime, formatDateTime } from '@/lib/utils/formatters'
import { IntegrationWizard } from '@/components/dashboard/integration-wizard'

export default function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [wizardOpen, setWizardOpen] = useState(false)
  const t = useTranslations('integrations')
  const tCommon = useTranslations('common')

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await fetch('/api/integrations')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  async function handleSync(source: { id: string; type: string; name: string }) {
    setSyncingIds(prev => new Set(prev).add(source.id))
    try {
      const res = await fetch(`/api/sync/${source.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: source.id }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sync failed' }))
        throw new Error(err.error || 'Sync failed')
      }

      await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    } catch (err: any) {
      alert(err.message || 'Failed to trigger sync')
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev)
        next.delete(source.id)
        return next
      })
    }
  }

  function handleWizardCreated() {
    queryClient.invalidateQueries({ queryKey: ['integrations'] })
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-info)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('connectNew')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.sources.map((source: any) => {
          const isSyncing = syncingIds.has(source.id) || source.syncStatus === 'syncing'
          const statusConfig = isSyncing
            ? SYNC_STATUS_CONFIG['syncing' as keyof typeof SYNC_STATUS_CONFIG]
            : SYNC_STATUS_CONFIG[source.syncStatus as keyof typeof SYNC_STATUS_CONFIG]
          return (
            <div key={source.id} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{source.name}</h3>
                <span
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ color: statusConfig?.color, backgroundColor: `${statusConfig?.color}15` }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig?.color }} />
                  {isSyncing ? t('syncing') : statusConfig?.label}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">{t('type')}</span>
                  <span className="text-[var(--text-secondary)] capitalize">{source.type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">{t('lastSync')}</span>
                  <span className="text-[var(--text-secondary)]">
                    {source.lastSyncAt ? formatRelativeTime(source.lastSyncAt) : tCommon('never')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">{t('records')}</span>
                  <span className="text-[var(--text-secondary)]">{source.lastSyncRecordCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">{t('frequency')}</span>
                  <span className="text-[var(--text-secondary)]">{source.syncFrequencyMinutes}m</span>
                </div>
              </div>
              <button
                className="mt-4 w-full py-2 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSyncing}
                onClick={() => handleSync(source)}
              >
                {isSyncing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('syncing')}
                  </span>
                ) : (
                  t('triggerSync')
                )}
              </button>
            </div>
          )
        })}
      </div>

      <IntegrationWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleWizardCreated}
      />
    </div>
  )
}
