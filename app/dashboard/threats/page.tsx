'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { MetricCard } from '@/components/dashboard/metric-card'
import { KillChainViz } from '@/components/dashboard/kill-chain-viz'
import { ThreatCard } from '@/components/dashboard/threat-card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ThreatStats {
  totalActive: number
  bySeverity: Record<string, number>
  byKillChainPhase: Record<string, number>
  byThreatType: Record<string, number>
  avgConfidence: number
  threatsToday: number
  threatsWeek: number
  threatsMonth: number
}

interface ThreatFeedItem {
  id: string
  threatType: string
  severity: string
  status: string
  identityName: string | null
  identityTier: string | null
  killChainPhase: string
  confidence: number
  sourceIp: string | null
  sourceLocation: string | null
  mitreTechniqueIds: string[] | null
  mitreTechniqueName: string | null
  targetResource: string | null
  firstSeenAt: string
  lastSeenAt: string
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#22c55e',
}

export default function ThreatsPage() {
  const t = useTranslations('threats')
  const tSev = useTranslations('severity')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const [stats, setStats] = useState<ThreatStats | null>(null)
  const [threats, setThreats] = useState<ThreatFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<{
    threatType?: string
    severity?: string
    status?: string
    killChainPhase?: string
  }>({})

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, feedRes] = await Promise.all([
        fetch('/api/threats/stats'),
        fetch('/api/threats/feed'),
      ])
      if (!statsRes.ok || !feedRes.ok) throw new Error('Failed to load')
      const [statsData, feedData] = await Promise.all([
        statsRes.json(),
        feedRes.json(),
      ])
      setStats(statsData)
      setThreats(feedData.threats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleInvestigate = useCallback(async (id: string) => {
    try {
      await fetch(`/api/threats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'investigating' }),
      })
      router.push(`/dashboard/threats/${id}`)
    } catch {
      router.push(`/dashboard/threats/${id}`)
    }
  }, [router])

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await fetch(`/api/threats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'false_positive', rationale: 'Dismissed from threat feed' }),
      })
      setThreats(prev => prev.filter(t => t.id !== id))
      fetchData()
    } catch { /* ignore */ }
  }, [fetchData])

  const handlePhaseClick = useCallback((phase: string) => {
    setFilters(prev =>
      prev.killChainPhase === phase ? { ...prev, killChainPhase: undefined } : { ...prev, killChainPhase: phase }
    )
  }, [])

  // Apply client-side filters to the feed
  const filteredThreats = threats.filter(t => {
    if (filters.threatType && t.threatType !== filters.threatType) return false
    if (filters.severity && t.severity !== filters.severity) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.killChainPhase && t.killChainPhase !== filters.killChainPhase) return false
    return true
  })

  if (loading) {
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

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="bg-[var(--color-critical-bg)] border border-[var(--color-critical)] rounded-xl p-6">
          <p className="font-medium" style={{ color: 'var(--color-critical)' }}>{t('failedToLoad')}</p>
        </div>
      </div>
    )
  }

  const severityPieData = Object.entries(stats.bySeverity)
    .filter(([, v]) => v > 0)
    .map(([severity, count]) => ({
      name: tSev(severity),
      value: count,
      color: SEVERITY_COLORS[severity] || '#94a3b8',
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        {stats.totalActive > 0 && (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-[var(--color-critical)] text-white animate-pulse">
            {stats.totalActive} {t('active')}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label={t('activeThreats')}
          value={stats.totalActive}
          color={stats.totalActive > 0 ? 'red' : 'green'}
        />
        <MetricCard label={t('threatsToday')} value={stats.threatsToday} color="orange" />
        <MetricCard label={t('avgConfidence')} value={`${stats.avgConfidence}%`} color="blue" />
        <MetricCard label={t('threatsMonth')} value={stats.threatsMonth} color="blue" />
      </div>

      {/* Kill chain visualization */}
      <KillChainViz
        phaseCounts={stats.byKillChainPhase}
        onPhaseClick={handlePhaseClick}
        selectedPhase={filters.killChainPhase}
      />

      {/* Content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat feed (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.threatType || ''}
              onChange={e => setFilters(p => ({ ...p, threatType: e.target.value || undefined }))}
              className="text-xs px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
            >
              <option value="">{t('allTypes')}</option>
              {Object.keys(stats.byThreatType).map(type => (
                <option key={type} value={type}>{t(`threatTypes.${type}`)}</option>
              ))}
            </select>
            <select
              value={filters.severity || ''}
              onChange={e => setFilters(p => ({ ...p, severity: e.target.value || undefined }))}
              className="text-xs px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
            >
              <option value="">{tSev('allSeverities')}</option>
              {['critical', 'high', 'medium', 'low'].map(s => (
                <option key={s} value={s}>{tSev(s)}</option>
              ))}
            </select>
            <select
              value={filters.status || ''}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value || undefined }))}
              className="text-xs px-2 py-1.5 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
            >
              <option value="">{t('allStatuses')}</option>
              {['active', 'investigating', 'contained', 'resolved', 'false_positive'].map(s => (
                <option key={s} value={s}>{t(`statuses.${s}`)}</option>
              ))}
            </select>
            {Object.keys(filters).some(k => (filters as any)[k]) && (
              <button
                onClick={() => setFilters({})}
                className="text-xs px-2 py-1.5 text-[var(--color-info)] hover:underline"
              >
                {tCommon('clearFilters')}
              </button>
            )}
          </div>

          {/* Threat cards */}
          {filteredThreats.length === 0 ? (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-8 text-center text-[var(--text-muted)]">
              {t('noThreats')}
            </div>
          ) : (
            filteredThreats.map(threat => (
              <ThreatCard
                key={threat.id}
                threat={threat}
                onInvestigate={handleInvestigate}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </div>

        {/* Severity donut (1/3 width) */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('severityBreakdown')}</h3>
          {severityPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {severityPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[var(--text-muted)]">
              {t('noThreats')}
            </div>
          )}
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {severityPieData.map(entry => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[var(--text-secondary)]">{entry.name}</span>
                </div>
                <span className="font-medium text-[var(--text-primary)]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
