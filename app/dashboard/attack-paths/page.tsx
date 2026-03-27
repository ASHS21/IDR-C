'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Route, AlertTriangle, Shield, Zap, ArrowRight, RefreshCw, Search,
  LayoutGrid, TableIcon,
} from 'lucide-react'
import { AttackPathGraph } from '@/components/dashboard/attack-path-graph'
import type { AttackPathData } from '@/components/dashboard/attack-path-graph'

interface AttackPath {
  id: string
  sourceIdentityId: string
  targetIdentityId: string | null
  targetResourceId: string | null
  pathNodes: Array<{ id: string; type: string; name: string; tier?: string; riskScore?: number; subType?: string }>
  pathEdges: Array<{ source: string; target: string; type: string; label: string; technique: string; mitreId?: string; exploitability?: string; confirmed?: boolean }>
  pathLength: number
  riskScore: number
  attackTechnique: string
  mitreId: string | null
  aiNarrative: string | null
  status: string
  discoveredAt: string
}

interface Stats {
  totalPaths: number
  criticalCount: number
  highCount: number
  avgLength: number
  shortestPath: number
  shortestToDA: number
  maxRiskScore: number
  identitiesWithT0Paths: number
}

type ViewMode = 'table' | 'graph'

function riskBadgeColor(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (score >= 60) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
}

function statusBadge(status: string): string {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'acknowledged': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'remediated': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
  }
}

export default function AttackPathsPage() {
  const t = useTranslations('attackPaths')
  const tCommon = useTranslations('common')
  const [paths, setPaths] = useState<AttackPath[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterTechnique, setFilterTechnique] = useState('')
  const [filterMinRisk, setFilterMinRisk] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [highlightPathId, setHighlightPathId] = useState<string | undefined>(undefined)
  const [selectedPathFilter, setSelectedPathFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterMinRisk > 0) params.set('minRiskScore', String(filterMinRisk))
      if (filterTechnique) params.set('technique', filterTechnique)

      const [pathsRes, statsRes] = await Promise.all([
        fetch(`/api/attack-paths?${params}`),
        fetch('/api/attack-paths/stats'),
      ])
      if (pathsRes.ok) {
        const data = await pathsRes.json()
        setPaths(data.paths || [])
      }
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
    } catch (err) {
      setError('Failed to load attack paths')
    } finally {
      setLoading(false)
    }
  }, [filterTechnique, filterMinRisk])

  useEffect(() => { fetchData() }, [fetchData])

  const triggerScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/attack-paths', { method: 'POST' })
      if (res.ok) {
        await fetchData()
      } else {
        setError('Scan failed')
      }
    } catch {
      setError('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  // Convert paths to graph data format
  const graphPaths: AttackPathData[] = paths
    .filter(p => selectedPathFilter === 'all' || p.id === selectedPathFilter)
    .map(p => ({
      id: p.id,
      pathNodes: (p.pathNodes as any[]).map(n => ({
        id: n.id,
        name: n.name,
        type: n.type,
        tier: n.tier,
        riskScore: n.riskScore,
        subType: n.subType,
      })),
      pathEdges: (p.pathEdges as any[]).map(e => ({
        source: e.source,
        target: e.target,
        technique: e.technique,
        label: e.label,
        mitreId: e.mitreId,
        type: e.type,
        exploitability: e.exploitability,
        confirmed: e.confirmed,
      })),
      riskScore: p.riskScore,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-[var(--text-primary)]">{t('title')}</h1>
          <p className="text-body text-[var(--text-tertiary)] mt-1">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-[var(--radius-badge)] border border-[var(--border-default)] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-micro font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-[var(--color-info)] text-white'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <TableIcon size={14} />
              Table
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-2 text-micro font-medium transition-colors ${
                viewMode === 'graph'
                  ? 'bg-[var(--color-info)] text-white'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <LayoutGrid size={14} />
              Graph
            </button>
          </div>

          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-info)] text-white rounded-[var(--radius-badge)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            {scanning ? t('scanning') : t('runScan')}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Route} label={t('totalPaths')} value={stats.totalPaths} />
          <StatCard icon={AlertTriangle} label={t('criticalPaths')} value={stats.criticalCount} color="text-[var(--color-critical)]" />
          <StatCard icon={Zap} label={t('avgLength')} value={stats.avgLength} suffix={t('hops')} />
          <StatCard icon={Shield} label={t('shortestToDA')} value={stats.shortestToDA} suffix={t('hops')} />
          <StatCard icon={Route} label={t('identitiesWithT0')} value={stats.identitiesWithT0Paths} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t('filterByTechnique')}
            value={filterTechnique}
            onChange={e => setFilterTechnique(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-[var(--radius-badge)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body"
          />
        </div>
        <select
          value={filterMinRisk}
          onChange={e => setFilterMinRisk(Number(e.target.value))}
          className="px-3 py-2 rounded-[var(--radius-badge)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body"
        >
          <option value={0}>{t('allRiskLevels')}</option>
          <option value={80}>{t('criticalOnly')}</option>
          <option value={60}>{t('highAndAbove')}</option>
          <option value={40}>{t('mediumAndAbove')}</option>
        </select>

        {/* Path selector for graph view */}
        {viewMode === 'graph' && paths.length > 0 && (
          <select
            value={selectedPathFilter}
            onChange={e => {
              setSelectedPathFilter(e.target.value)
              setHighlightPathId(e.target.value === 'all' ? undefined : e.target.value)
            }}
            className="px-3 py-2 rounded-[var(--radius-badge)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body max-w-xs"
          >
            <option value="all">All Paths ({paths.length})</option>
            {paths.slice(0, 30).map(p => {
              const source = (p.pathNodes as any[])?.[0]?.name || 'Unknown'
              const target = (p.pathNodes as any[])?.[(p.pathNodes as any[]).length - 1]?.name || 'Unknown'
              return (
                <option key={p.id} value={p.id}>
                  {source} → {target} (Risk: {p.riskScore})
                </option>
              )
            })}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-[var(--radius-card)] bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16 text-[var(--text-tertiary)]">{tCommon('loading')}</div>
      ) : paths.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-[var(--text-tertiary)]">
          <Route size={48} className="mb-3 opacity-30" />
          <p className="text-body font-medium">{t('noPaths')}</p>
          <p className="text-caption mt-1">{t('noPathsDescription')}</p>
        </div>
      ) : viewMode === 'graph' ? (
        /* ── Graph View ── */
        <div className="space-y-4">
          <AttackPathGraph
            paths={graphPaths}
            highlightPathId={highlightPathId}
            onNodeClick={(node) => {
              // If there's a connected identity, could navigate there
            }}
            onEdgeClick={(edge) => {
              // Could show a detail panel for the technique
            }}
          />

          {/* Clickable path list below graph */}
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
            <div className="px-4 py-3 border-b border-[var(--border-default)]">
              <p className="text-micro font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                Click a path to highlight in graph
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-default)]">
              {paths.slice(0, 30).map(path => {
                const sourceNode = (path.pathNodes as any[])?.[0]
                const targetNode = (path.pathNodes as any[])?.[(path.pathNodes as any[]).length - 1]
                const isHighlighted = highlightPathId === path.id
                return (
                  <button
                    key={path.id}
                    onClick={() => {
                      if (highlightPathId === path.id) {
                        setHighlightPathId(undefined)
                        setSelectedPathFilter('all')
                      } else {
                        setHighlightPathId(path.id)
                        setSelectedPathFilter(path.id)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-start transition-colors ${
                      isHighlighted ? 'bg-[var(--color-info)]/10' : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-full text-micro font-semibold ${riskBadgeColor(path.riskScore)}`}>
                      {path.riskScore}
                    </span>
                    <span className="text-body text-[var(--text-primary)] font-medium truncate">
                      {sourceNode?.name || 'Unknown'}
                    </span>
                    <ArrowRight size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="text-body text-[var(--text-primary)] truncate">
                      {targetNode?.name || 'Unknown'}
                    </span>
                    <span className="text-micro text-[var(--text-tertiary)] ms-auto flex-shrink-0">
                      {path.pathLength} hops | {path.attackTechnique}
                    </span>
                    <Link
                      href={`/dashboard/attack-paths/${path.id}`}
                      className="text-micro text-[var(--color-info)] hover:underline flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      Details
                    </Link>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Table View ── */
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-secondary)] text-[var(--text-tertiary)] text-micro uppercase tracking-wider">
                  <th className="px-4 py-3 text-start">{t('source')}</th>
                  <th className="px-4 py-3 text-start">{t('target')}</th>
                  <th className="px-4 py-3 text-center">{t('length')}</th>
                  <th className="px-4 py-3 text-center">{t('riskScore')}</th>
                  <th className="px-4 py-3 text-start">{t('technique')}</th>
                  <th className="px-4 py-3 text-start">{t('mitreId')}</th>
                  <th className="px-4 py-3 text-center">{t('statusCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {paths.map(path => {
                  const sourceNode = (path.pathNodes as any[])?.[0]
                  const targetNode = (path.pathNodes as any[])?.[(path.pathNodes as any[]).length - 1]
                  return (
                    <tr key={path.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/attack-paths/${path.id}`} className="text-body font-medium text-[var(--text-primary)] hover:text-[var(--color-info)]">
                          {sourceNode?.name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
                          <span className="text-body text-[var(--text-primary)]">{targetNode?.name || 'Unknown'}</span>
                          {targetNode?.tier && (
                            <span className={`text-micro px-1.5 py-0.5 rounded ${targetNode.tier === 'tier_0' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}`}>
                              {targetNode.tier.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-body">{path.pathLength}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-micro font-semibold ${riskBadgeColor(path.riskScore)}`}>
                          {path.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body text-[var(--text-secondary)]">{path.attackTechnique}</td>
                      <td className="px-4 py-3 text-micro font-mono text-[var(--text-tertiary)]">{path.mitreId || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-micro font-medium capitalize ${statusBadge(path.status)}`}>
                          {path.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix, color }: {
  icon: any
  label: string
  value: number
  suffix?: string
  color?: string
}) {
  return (
    <div className="p-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color || 'text-[var(--text-tertiary)]'} />
        <span className="text-micro text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-h3 font-bold ${color || 'text-[var(--text-primary)]'}`}>
        {value}{suffix ? <span className="text-caption font-normal text-[var(--text-tertiary)] ms-1">{suffix}</span> : null}
      </p>
    </div>
  )
}
