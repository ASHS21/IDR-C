'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Download, RefreshCw, Search, AlertTriangle, Shield, Route,
  Crosshair, UserX, TrendingUp, FileWarning, Bird, CheckCircle2,
  ChevronDown, X,
} from 'lucide-react'
import { formatRelativeTime, formatDateTime } from '@/lib/utils/formatters'

// ── Types ──

interface UnifiedResult {
  id: string
  findingType: 'violation' | 'attack_path' | 'threat' | 'shadow_admin' | 'peer_anomaly' | 'gpo_risk' | 'canary_trigger'
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: string
  identityId: string | null
  identityName: string | null
  identityType: string | null
  adTier: string | null
  effectiveTier: string | null
  tierViolation: boolean
  detectedAt: string
  resolvedAt: string | null
  category: string
  mitreTechnique: string | null
  riskScore: number | null
  sourceUrl: string
  metadata: Record<string, any>
}

interface ResultsResponse {
  results: UnifiedResult[]
  total: number
  page: number
  pageSize: number
  summary: {
    bySeverity: Record<string, number>
    byType: Record<string, number>
    byStatus: Record<string, number>
    byTier: Record<string, number>
  }
}

type TabKey = 'all' | 'violation' | 'attack_path' | 'threat' | 'shadow_admin' | 'peer_anomaly' | 'gpo_risk' | 'canary_trigger'

// ── Helpers ──

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'open':
    case 'active': return 'bg-red-500'
    case 'acknowledged':
    case 'investigating': return 'bg-amber-500'
    case 'remediated':
    case 'resolved':
    case 'investigated': return 'bg-green-500'
    case 'excepted':
    case 'contained': return 'bg-blue-500'
    case 'false_positive':
    case 'dismissed': return 'bg-slate-400'
    default: return 'bg-slate-400'
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'violation': return AlertTriangle
    case 'attack_path': return Route
    case 'threat': return Crosshair
    case 'shadow_admin': return UserX
    case 'peer_anomaly': return TrendingUp
    case 'gpo_risk': return FileWarning
    case 'canary_trigger': return Bird
    default: return Shield
  }
}

function typeBadgeColor(type: string): string {
  switch (type) {
    case 'violation': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    case 'attack_path': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    case 'threat': return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    case 'shadow_admin': return 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400'
    case 'peer_anomaly': return 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
    case 'gpo_risk': return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'canary_trigger': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
    default: return 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'
  }
}

function tierBadge(tier: string | null, effectiveTier: string | null): string {
  if (!tier) return ''
  const display = tier.replace('_', ' ').toUpperCase()
  if (effectiveTier && effectiveTier !== tier) {
    return `${display} -> ${effectiveTier.replace('_', ' ').toUpperCase()}`
  }
  return display
}

function riskBarWidth(score: number | null): string {
  if (score === null || score === undefined) return '0%'
  return `${Math.min(100, Math.max(0, score))}%`
}

function riskBarColor(score: number | null): string {
  if (score === null) return 'bg-slate-300'
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-green-500'
}

// ── Export CSV ──

function downloadCsv(data: UnifiedResult[], filename: string) {
  const headers = [
    'ID', 'Type', 'Title', 'Severity', 'Status', 'Identity', 'Identity Type',
    'AD Tier', 'Effective Tier', 'Tier Violation', 'Category', 'MITRE Technique',
    'Risk Score', 'Detected At', 'Resolved At', 'Source URL',
  ]
  const rows = data.map(r => [
    r.id, r.findingType, `"${r.title.replace(/"/g, '""')}"`, r.severity, r.status,
    r.identityName || '', r.identityType || '', r.adTier || '', r.effectiveTier || '',
    r.tierViolation ? 'Yes' : 'No', r.category, r.mitreTechnique || '',
    r.riskScore?.toString() || '', r.detectedAt, r.resolvedAt || '', r.sourceUrl,
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tab Config ──

const TABS: { key: TabKey; labelKey: string; icon: any }[] = [
  { key: 'all', labelKey: 'allFindings', icon: Shield },
  { key: 'violation', labelKey: 'violations', icon: AlertTriangle },
  { key: 'attack_path', labelKey: 'attackPaths', icon: Route },
  { key: 'threat', labelKey: 'threats', icon: Crosshair },
  { key: 'shadow_admin', labelKey: 'shadowAdmins', icon: UserX },
  { key: 'peer_anomaly', labelKey: 'peerAnomalies', icon: TrendingUp },
  { key: 'gpo_risk', labelKey: 'gpoRisks', icon: FileWarning },
  { key: 'canary_trigger', labelKey: 'canaryTriggers', icon: Bird },
]

// ── Main Page ──

export default function ResultsPage() {
  const t = useTranslations('results')
  const tSev = useTranslations('severity')
  const tCommon = useTranslations('common')
  const tTiers = useTranslations('tiers')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // State from URL params
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get('tab') as TabKey) || 'all')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [tierFilter, setTierFilter] = useState(searchParams.get('tier') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'detectedAt')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Data state
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Sync filters to URL
  const updateUrl = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value)
      else sp.delete(key)
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const sp = new URLSearchParams()
      sp.set('page', String(page))
      sp.set('pageSize', '25')
      if (activeTab !== 'all') sp.set('findingType', activeTab)
      if (severityFilter) sp.set('severity', severityFilter)
      if (statusFilter) sp.set('status', statusFilter)
      if (tierFilter) sp.set('tier', tierFilter)
      if (searchQuery) sp.set('search', searchQuery)
      sp.set('sortBy', sortBy)
      sp.set('sortOrder', sortOrder)

      const res = await fetch(`/api/results?${sp}`)
      if (!res.ok) throw new Error('Failed to load')
      const json: ResultsResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, activeTab, severityFilter, statusFilter, tierFilter, searchQuery, sortBy, sortOrder])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  // Handlers
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
    setSelectedRows(new Set())
    updateUrl({ tab: tab === 'all' ? '' : tab, page: '' })
  }, [updateUrl])

  const handleFilterChange = useCallback((key: string, value: string) => {
    switch (key) {
      case 'severity': setSeverityFilter(value); break
      case 'status': setStatusFilter(value); break
      case 'tier': setTierFilter(value); break
    }
    setPage(1)
    updateUrl({ [key]: value, page: '' })
  }, [updateUrl])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1)
    updateUrl({ search: value, page: '' })
  }, [updateUrl])

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
      setSortOrder(newOrder)
      updateUrl({ sortOrder: newOrder })
    } else {
      setSortBy(column)
      setSortOrder('desc')
      updateUrl({ sortBy: column, sortOrder: 'desc' })
    }
    setPage(1)
  }, [sortBy, sortOrder, updateUrl])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    updateUrl({ page: String(newPage) })
  }, [updateUrl])

  const handleExportAll = useCallback(async () => {
    setExporting(true)
    try {
      const sp = new URLSearchParams()
      sp.set('page', '1')
      sp.set('pageSize', '10000')
      if (activeTab !== 'all') sp.set('findingType', activeTab)
      if (severityFilter) sp.set('severity', severityFilter)
      if (statusFilter) sp.set('status', statusFilter)
      if (tierFilter) sp.set('tier', tierFilter)
      if (searchQuery) sp.set('search', searchQuery)
      sp.set('sortBy', sortBy)
      sp.set('sortOrder', sortOrder)

      const res = await fetch(`/api/results?${sp}`)
      if (res.ok) {
        const json: ResultsResponse = await res.json()
        downloadCsv(json.results, `security-results-${new Date().toISOString().slice(0, 10)}.csv`)
      }
    } finally {
      setExporting(false)
    }
  }, [activeTab, severityFilter, statusFilter, tierFilter, searchQuery, sortBy, sortOrder])

  const handleToggleRow = useCallback((id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    if (!data) return
    if (selectedRows.size === data.results.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.results.map(r => r.id)))
    }
  }, [data, selectedRows])

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0
  const summary = data?.summary || { bySeverity: {}, byType: {}, byStatus: {}, byTier: {} }
  const unresolvedCount = Object.entries(summary.byStatus)
    .filter(([k]) => !['remediated', 'resolved', 'investigated', 'false_positive', 'dismissed'].includes(k))
    .reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-h2 font-bold text-[var(--text-primary)]">{t('title')}</h1>
          <p className="text-body text-[var(--text-tertiary)] mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-micro text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="rounded border-[var(--border-default)]"
            />
            {t('autoRefresh')}
          </label>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-badge)] text-body hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-info)] text-white rounded-[var(--radius-badge)] hover:opacity-90 transition-opacity disabled:opacity-50 text-body"
          >
            <Download size={14} />
            {t('exportAll')}
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <SummaryPill color="red" label={tSev('critical')} count={summary.bySeverity.critical || 0} />
          <SummaryPill color="orange" label={tSev('high')} count={summary.bySeverity.high || 0} />
          <SummaryPill color="amber" label={tSev('medium')} count={summary.bySeverity.medium || 0} />
          <SummaryPill color="green" label={tSev('low')} count={summary.bySeverity.low || 0} />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full">
            <span className="text-micro font-semibold text-[var(--text-primary)]">{data.total}</span>
            <span className="text-micro text-[var(--text-secondary)]">{t('totalFindings')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full">
            <span className="text-micro font-semibold text-[var(--text-primary)]">{unresolvedCount}</span>
            <span className="text-micro text-[var(--text-secondary)]">{t('unresolved')}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border-default)] -mb-px">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const count = tab.key === 'all' ? (data?.total || 0) : (summary.byType[tab.key] || 0)
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
              }`}
            >
              <Icon size={14} />
              {t(tab.labelKey)}
              {count > 0 && (
                <span className={`text-micro px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[var(--color-info)]/10 text-[var(--color-info)]' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={tCommon('search')}
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-[var(--radius-badge)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={severityFilter}
          onChange={e => handleFilterChange('severity', e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-badge)] text-body bg-[var(--bg-primary)]"
        >
          <option value="">{tSev('allSeverities')}</option>
          <option value="critical">{tSev('critical')}</option>
          <option value="high">{tSev('high')}</option>
          <option value="medium">{tSev('medium')}</option>
          <option value="low">{tSev('low')}</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-badge)] text-body bg-[var(--bg-primary)]"
        >
          <option value="">{tCommon('all')}</option>
          <option value="open">{tCommon('open')}</option>
          <option value="active">Active</option>
          <option value="acknowledged">{tCommon('acknowledged')}</option>
          <option value="remediated">{tCommon('remediated')}</option>
          <option value="excepted">{tCommon('excepted')}</option>
        </select>

        <select
          value={tierFilter}
          onChange={e => handleFilterChange('tier', e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-badge)] text-body bg-[var(--bg-primary)]"
        >
          <option value="">{tTiers('allTiers')}</option>
          <option value="tier_0">{tTiers('tier_0')}</option>
          <option value="tier_1">{tTiers('tier_1')}</option>
          <option value="tier_2">{tTiers('tier_2')}</option>
          <option value="unclassified">{tTiers('unclassified')}</option>
        </select>

        <select
          value={sortBy}
          onChange={e => handleSort(e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-badge)] text-body bg-[var(--bg-primary)]"
        >
          <option value="detectedAt">{t('detected')}</option>
          <option value="severity">{tSev('critical')}/{tSev('low')}</option>
          <option value="riskScore">Risk Score</option>
          <option value="identityName">{t('finding')}</option>
        </select>

        {(severityFilter || statusFilter || tierFilter || searchQuery) && (
          <button
            onClick={() => {
              setSeverityFilter('')
              setStatusFilter('')
              setTierFilter('')
              setSearchQuery('')
              setPage(1)
              updateUrl({ severity: '', status: '', tier: '', search: '', page: '' })
            }}
            className="text-body text-[var(--color-info)] hover:underline"
          >
            {tCommon('clearFilters')}
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--color-info)]/5 border border-[var(--color-info)]/20 rounded-[var(--radius-card)]">
          <span className="text-body text-[var(--text-secondary)]">
            {selectedRows.size} {t('selected')}
          </span>
          <button
            onClick={() => {
              const selected = (data?.results || []).filter(r => selectedRows.has(r.id))
              downloadCsv(selected, `selected-results-${new Date().toISOString().slice(0, 10)}.csv`)
            }}
            className="px-3 py-1 text-micro bg-[var(--color-info)] text-white rounded-[var(--radius-badge)]"
          >
            {t('exportFiltered')}
          </button>
          <button
            onClick={() => setSelectedRows(new Set())}
            className="px-3 py-1 text-micro border border-[var(--border-default)] rounded-[var(--radius-badge)] hover:bg-[var(--bg-secondary)]"
          >
            {tCommon('cancel')}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-[var(--radius-card)] bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--bg-primary)] rounded-[var(--radius-card)] border border-[var(--border-default)] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {loading && !data ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] animate-pulse">
            {tCommon('loading')}
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={48} className="mx-auto mb-3 opacity-20 text-[var(--text-tertiary)]" />
            <p className="text-body font-medium text-[var(--text-secondary)]">{tCommon('noResults')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] text-[var(--text-tertiary)] text-micro uppercase tracking-wider">
                    <th className="px-3 py-3 text-start w-8">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === data.results.length && data.results.length > 0}
                        onChange={handleToggleAll}
                        className="rounded border-[var(--border-default)]"
                      />
                    </th>
                    <th className="px-3 py-3 text-start">#</th>
                    <th className="px-3 py-3 text-start min-w-[280px]">{t('finding')}</th>
                    <th className="px-3 py-3 text-start">{t('type')}</th>
                    <th className="px-3 py-3 text-center cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('severity')}>
                      {tSev('critical').charAt(0)}/{tSev('low').charAt(0)}
                      {sortBy === 'severity' && <span className="ms-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th className="px-3 py-3 text-start min-w-[140px]">Identity</th>
                    <th className="px-3 py-3 text-center">Tier</th>
                    <th className="px-3 py-3 text-center cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('riskScore')}>
                      Risk
                      {sortBy === 'riskScore' && <span className="ms-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-end cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('detectedAt')}>
                      {t('detected')}
                      {sortBy === 'detectedAt' && <span className="ms-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {data.results.map((result, idx) => {
                    const Icon = typeIcon(result.findingType)
                    const rowNum = (data.page - 1) * data.pageSize + idx + 1
                    return (
                      <tr
                        key={result.id}
                        className={`hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${
                          selectedRows.has(result.id) ? 'bg-[var(--color-info)]/5' : ''
                        }`}
                        onClick={() => router.push(result.sourceUrl)}
                      >
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(result.id)}
                            onChange={() => handleToggleRow(result.id)}
                            className="rounded border-[var(--border-default)]"
                          />
                        </td>
                        <td className="px-3 py-3 text-micro text-[var(--text-tertiary)]">{rowNum}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <Icon size={14} className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-body font-medium text-[var(--text-primary)] truncate max-w-[350px]">
                                {result.title}
                              </p>
                              {result.mitreTechnique && (
                                <span className="text-micro font-mono text-[var(--text-tertiary)]">{result.mitreTechnique}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium ${typeBadgeColor(result.findingType)}`}>
                            {t(TABS.find(tab => tab.key === result.findingType)?.labelKey || 'allFindings')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-micro font-semibold ${severityColor(result.severity)}`}>
                            {tSev(result.severity)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {result.identityName ? (
                            <div className="flex items-center gap-2">
                              <span className="text-body text-[var(--text-primary)] truncate max-w-[120px]">{result.identityName}</span>
                              {result.identityType && (
                                <span className={`text-micro px-1.5 py-0.5 rounded ${
                                  result.identityType === 'human'
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                                }`}>
                                  {result.identityType === 'human' ? 'H' : 'NHI'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-micro text-[var(--text-tertiary)]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {result.adTier ? (
                            <span className={`text-micro px-1.5 py-0.5 rounded font-medium ${
                              result.adTier === 'tier_0' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              result.adTier === 'tier_1' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              result.adTier === 'tier_2' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                              'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {tierBadge(result.adTier, result.effectiveTier)}
                            </span>
                          ) : (
                            <span className="text-micro text-[var(--text-tertiary)]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {result.riskScore !== null ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-12 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${riskBarColor(result.riskScore)}`}
                                  style={{ width: riskBarWidth(result.riskScore) }}
                                />
                              </div>
                              <span className="text-micro font-medium text-[var(--text-secondary)]">{result.riskScore}</span>
                            </div>
                          ) : (
                            <span className="text-micro text-[var(--text-tertiary)]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className={`w-2 h-2 rounded-full ${statusDotColor(result.status)}`} />
                            <span className="text-micro capitalize text-[var(--text-secondary)]">
                              {result.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-end">
                          <span
                            className="text-micro text-[var(--text-secondary)]"
                            title={formatDateTime(result.detectedAt)}
                          >
                            {formatRelativeTime(result.detectedAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
                <p className="text-body text-[var(--text-secondary)]">
                  {tCommon('showing')} {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} {tCommon('of')} {data.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-body border border-[var(--border-default)] rounded-[var(--radius-badge)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
                  >
                    {tCommon('previous')}
                  </button>
                  {/* Page number pills */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1.5 text-body border rounded-[var(--radius-badge)] ${
                          page === pageNum
                            ? 'bg-[var(--color-info)] text-white border-[var(--color-info)]'
                            : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-body border border-[var(--border-default)] rounded-[var(--radius-badge)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
                  >
                    {tCommon('next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub Components ──

function SummaryPill({ color, label, count }: { color: string; label: string; count: number }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colorClasses[color] || ''}`}>
      <span className="text-micro font-bold">{count}</span>
      <span className="text-micro">{label}</span>
    </div>
  )
}
