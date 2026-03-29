'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/ui/metric-card'

interface Canary {
  id: string
  identityId: string
  identityName: string
  canaryType: string
  description: string
  placementLocation: string
  enabled: boolean
  triggerCount: number
  lastTriggeredAt: string | null
  lastTriggeredSourceIp: string | null
  createdAt: string
}

interface CreateCanaryForm {
  canaryType: string
  name: string
  description: string
  placementLocation: string
  alertWebhookUrl: string
}

export default function CanariesPage() {
  const t = useTranslations('canaries')
  const tCommon = useTranslations('common')

  const [canaries, setCanaries] = useState<Canary[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, triggeredEver: 0, triggered24h: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [triggers, setTriggers] = useState<Record<string, any[]>>({})

  const [form, setForm] = useState<CreateCanaryForm>({
    canaryType: 'fake_admin',
    name: '',
    description: '',
    placementLocation: '',
    alertWebhookUrl: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/canaries')
      if (res.ok) {
        const data = await res.json()
        setCanaries(data.items || [])
        setStats(data.stats || { total: 0, active: 0, triggeredEver: 0, triggered24h: 0 })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createCanary = useCallback(async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/canaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreate(false)
        setForm({ canaryType: 'fake_admin', name: '', description: '', placementLocation: '', alertWebhookUrl: '' })
        await fetchData()
      }
    } finally {
      setCreating(false)
    }
  }, [form, fetchData])

  const toggleCanary = useCallback(async (id: string, enabled: boolean) => {
    await fetch(`/api/canaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    await fetchData()
  }, [fetchData])

  const loadTriggers = useCallback(async (canaryId: string) => {
    if (triggers[canaryId]) return
    const res = await fetch(`/api/canaries/${canaryId}/triggers`)
    if (res.ok) {
      const data = await res.json()
      setTriggers(prev => ({ ...prev, [canaryId]: data.items || [] }))
    }
  }, [triggers])

  const canaryTypeIcons: Record<string, string> = {
    fake_admin: '\uD83D\uDC51',
    fake_service: '\u2699\uFE0F',
    fake_gmsa: '\uD83D\uDD10',
    fake_vpn: '\uD83C\uDF10',
    fake_api_key: '\uD83D\uDD11',
  }

  if (loading && canaries.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          {t('deployNew')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label={t('totalCanaries')} value={stats.total} color="blue" />
        <MetricCard label={t('activeCanaries')} value={stats.active} color="green" />
        <MetricCard label={t('triggeredEver')} value={stats.triggeredEver} color="orange" />
        <MetricCard label={t('triggered24h')} value={stats.triggered24h} color="red" />
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('deployNew')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('canaryType')}</label>
              <select
                value={form.canaryType}
                onChange={(e) => setForm(f => ({ ...f, canaryType: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
              >
                <option value="fake_admin">{t('fakeAdmin')}</option>
                <option value="fake_service">{t('fakeService')}</option>
                <option value="fake_gmsa">{t('fakeGmsa')}</option>
                <option value="fake_vpn">{t('fakeVpn')}</option>
                <option value="fake_api_key">{t('fakeApiKey')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('name')}</label>
              <input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('description')}</label>
              <input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('placement')}</label>
              <input
                value={form.placementLocation}
                onChange={(e) => setForm(f => ({ ...f, placementLocation: e.target.value }))}
                placeholder={t('placementPlaceholder')}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t('webhookUrl')}</label>
              <input
                value={form.alertWebhookUrl}
                onChange={(e) => setForm(f => ({ ...f, alertWebhookUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)]">
              {tCommon('cancel')}
            </button>
            <button
              onClick={createCanary}
              disabled={creating || !form.name || !form.description || !form.placementLocation}
              className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? tCommon('loading') : t('deploy')}
            </button>
          </div>
        </div>
      )}

      {/* Canary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {canaries.map((canary) => (
          <div
            key={canary.id}
            className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-5 cursor-pointer hover:border-[var(--color-info)] transition-colors"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={() => {
              setExpandedId(expandedId === canary.id ? null : canary.id)
              loadTriggers(canary.id)
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{canaryTypeIcons[canary.canaryType] || '?'}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{canary.identityName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{canary.canaryType.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleCanary(canary.id, !canary.enabled) }}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  canary.enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {canary.enabled ? t('enabled') : t('disabled')}
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">{canary.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{canary.triggerCount}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t('triggers')}</p>
              </div>
              {canary.lastTriggeredAt && (
                <div className="text-end">
                  <p className="text-xs text-[var(--color-critical)] font-medium">{t('lastTriggered')}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {new Date(canary.lastTriggeredAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {expandedId === canary.id && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t('placement')}: {canary.placementLocation}</p>
                {(triggers[canary.id] || []).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">{t('recentTriggers')}</p>
                    {(triggers[canary.id] || []).slice(0, 5).map((trig: any) => (
                      <div key={trig.id} className="flex items-center justify-between text-xs bg-[var(--bg-secondary)] rounded p-2">
                        <span className="text-[var(--text-primary)]">{trig.eventType}</span>
                        <span className="text-[var(--text-secondary)]">{trig.sourceIp}</span>
                        <span className="text-[var(--text-secondary)]">{new Date(trig.triggeredAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">{t('noTriggers')}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {canaries.length === 0 && !loading && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-8 text-center">
          <p className="text-[var(--text-secondary)]">{t('noCanaries')}</p>
        </div>
      )}
    </div>
  )
}
