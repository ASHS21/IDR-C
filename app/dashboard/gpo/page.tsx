'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/dashboard/metric-card'
import { GpoLinksTree } from '@/components/dashboard/gpo-links-tree'
import { Shield, AlertTriangle, Link2, UserX, Search, Loader2 } from 'lucide-react'

interface GpoItem {
  id: string
  name: string
  displayName: string | null
  gpoGuid: string | null
  status: string
  adTier: string
  version: number
  description: string | null
  ownerIdentityId: string | null
  ownerName: string | null
  linkCount: number
  permissionCount: number
  createdAt: string
  modifiedInSourceAt: string | null
}

interface GpoStats {
  total: number
  byTier: Record<string, number>
  dangerousCount: number
  enforcedCount: number
  unlinkedCount: number
  noOwnerCount: number
  nonAdminModifiable: number
}

interface GpoRisk {
  gpoId: string
  gpoName: string
  gpoTier: string
  riskType: string
  description: string
  severity: string
  affectedIdentity?: string
  affectedIdentityTier?: string
}

interface GpoPermission {
  id: string
  gpoId: string
  trusteeName: string
  permissionType: string
  dangerous: boolean
  adTierOfGpo: string
  trusteeIdentityId: string | null
  trusteeGroupId: string | null
  identityName?: string
  identityTier?: string
  groupName?: string
  groupTier?: string
  gpoName?: string
}

type Tab = 'all' | 'risky' | 'links' | 'permissions'

const TIER_BADGE: Record<string, string> = {
  tier_0: 'bg-red-500/10 text-red-500 border-red-500/30',
  tier_1: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  tier_2: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  unclassified: 'bg-gray-400/10 text-gray-400 border-gray-400/30',
}

const STATUS_BADGE: Record<string, string> = {
  enabled: 'bg-green-500/10 text-green-500',
  disabled: 'bg-gray-500/10 text-gray-400',
  enforced: 'bg-blue-500/10 text-blue-500',
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-amber-500/10 text-amber-500',
  low: 'bg-gray-500/10 text-gray-400',
}

export default function GpoPage() {
  const t = useTranslations('gpo')
  const tCommon = useTranslations('common')
  const tTiers = useTranslations('tiers')
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [gpos, setGpos] = useState<GpoItem[]>([])
  const [stats, setStats] = useState<GpoStats | null>(null)
  const [risks, setRisks] = useState<GpoRisk[]>([])
  const [linksData, setLinksData] = useState<any[]>([])
  const [permissions, setPermissions] = useState<GpoPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (tierFilter) params.set('tier', tierFilter)
      if (statusFilter) params.set('status', statusFilter)

      const [gpoRes, statsRes, risksRes] = await Promise.all([
        fetch(`/api/gpo?${params}`),
        fetch('/api/gpo/stats'),
        fetch('/api/gpo/risks'),
      ])

      if (gpoRes.ok) {
        const data = await gpoRes.json()
        setGpos(data.gpos)
      }
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      if (risksRes.ok) {
        const data = await risksRes.json()
        setRisks(data.risks)
      }
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }, [search, tierFilter, statusFilter])

  // Fetch links map data when that tab is active
  const fetchLinksData = useCallback(async () => {
    try {
      // Get all GPOs with their links for the tree
      const res = await fetch('/api/gpo?limit=200')
      if (!res.ok) return
      const data = await res.json()
      const allLinks: any[] = []

      // For each GPO, get its links
      for (const gpo of data.gpos) {
        if (gpo.linkCount > 0) {
          const detailRes = await fetch(`/api/gpo/${gpo.id}`)
          if (detailRes.ok) {
            const detail = await detailRes.json()
            for (const link of detail.links) {
              allLinks.push({
                ...link,
                gpoName: gpo.name,
                gpoTier: gpo.adTier,
              })
            }
          }
        }
      }
      setLinksData(allLinks)
    } catch {
      // error
    }
  }, [])

  // Fetch permissions data
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/gpo?limit=200')
      if (!res.ok) return
      const data = await res.json()
      const allPerms: GpoPermission[] = []

      for (const gpo of data.gpos) {
        if (gpo.permissionCount > 0) {
          const detailRes = await fetch(`/api/gpo/${gpo.id}`)
          if (detailRes.ok) {
            const detail = await detailRes.json()
            for (const perm of detail.permissions) {
              allPerms.push({
                ...perm,
                gpoName: gpo.name,
              })
            }
          }
        }
      }
      setPermissions(allPerms)
    } catch {
      // error
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    if (activeTab === 'links') fetchLinksData()
    if (activeTab === 'permissions') fetchPermissions()
  }, [activeTab, fetchLinksData, fetchPermissions])

  const runScan = useCallback(async () => {
    setScanning(true)
    try {
      await fetch('/api/gpo/scan', { method: 'POST' })
      await fetchData()
    } finally {
      setScanning(false)
    }
  }, [fetchData])

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'all', label: t('allGpos') },
    { key: 'risky', label: t('riskyGpos') },
    { key: 'links', label: t('linksMap') },
    { key: 'permissions', label: t('permissions') },
  ]

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--color-info)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-bold text-[var(--text-primary)]">{t('title')}</h1>
          <p className="text-caption text-[var(--text-tertiary)]">{t('description')}</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-card)] bg-[var(--color-info)] text-white text-caption font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          {scanning ? tCommon('loading') : t('scan')}
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <MetricCard label={t('stats.total')} value={stats.total} />
          <MetricCard label={t('stats.tier0')} value={stats.byTier.tier_0 || 0} color="red" />
          <MetricCard label={t('stats.tier1')} value={stats.byTier.tier_1 || 0} color="orange" />
          <MetricCard label={t('stats.tier2')} value={stats.byTier.tier_2 || 0} />
          <MetricCard label={t('stats.risky')} value={stats.dangerousCount} color="red" />
          <MetricCard label={t('stats.enforced')} value={stats.enforcedCount} color="blue" />
          <MetricCard label={t('stats.unlinked')} value={stats.unlinkedCount} color="orange" />
          <MetricCard label={t('stats.noOwner')} value={stats.noOwnerCount} color="orange" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border-default)]">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-caption font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tCommon('search')}
                className="w-full ps-9 pe-3 py-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption text-[var(--text-primary)]"
            >
              <option value="">{tTiers('allTiers')}</option>
              <option value="tier_0">{tTiers('tier_0')}</option>
              <option value="tier_1">{tTiers('tier_1')}</option>
              <option value="tier_2">{tTiers('tier_2')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-caption text-[var(--text-primary)]"
            >
              <option value="">All Statuses</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="enforced">Enforced</option>
            </select>
          </div>

          {/* GPO Table */}
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-default)]">
            <table className="w-full text-caption">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.name')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.guid')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.tier')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.status')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.links')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('permissions')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.owner')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {gpos.map((gpo) => (
                  <tr
                    key={gpo.id}
                    className="hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/gpo/${gpo.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{gpo.name}</p>
                      {gpo.description && (
                        <p className="text-micro text-[var(--text-tertiary)] truncate max-w-[250px]">{gpo.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)] font-mono text-micro">{gpo.gpoGuid || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-micro px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE[gpo.adTier] || TIER_BADGE.unclassified}`}>
                        {gpo.adTier.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-micro px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[gpo.status] || ''}`}>
                        {gpo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{gpo.linkCount}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{gpo.permissionCount}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{gpo.ownerName || <span className="text-[var(--text-tertiary)]">{tCommon('none')}</span>}</td>
                  </tr>
                ))}
                {gpos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                      {tCommon('noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'risky' && (
        <div className="space-y-4">
          {risks.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <AlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-body">{tCommon('noData')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-default)]">
              <table className="w-full text-caption">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.name')}</th>
                    <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.tier')}</th>
                    <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">Risk Reason</th>
                    <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">Affected</th>
                    <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {risks.map((risk, i) => (
                    <tr
                      key={`${risk.gpoId}-${i}`}
                      className="hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/gpo/${risk.gpoId}`)}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{risk.gpoName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-micro px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE[risk.gpoTier] || TIER_BADGE.unclassified}`}>
                          {risk.gpoTier.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[400px] truncate">{risk.description}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{risk.affectedIdentity || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-micro px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[risk.severity] || ''}`}>
                          {risk.severity.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
          <GpoLinksTree links={linksData} />
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-default)]">
            <table className="w-full text-caption">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">Identity / Group</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">GPO</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.permission')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.dangerous')}</th>
                  <th className="text-start px-4 py-3 font-medium text-[var(--text-tertiary)]">{t('fields.tierGap')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {permissions.map((perm) => {
                  const trusteeTier = perm.identityTier || perm.groupTier || 'unknown'
                  const gpoTier = perm.adTierOfGpo
                  const hasTierGap = gpoTier === 'tier_0' && trusteeTier !== 'tier_0' && trusteeTier !== 'unknown'
                  return (
                    <tr key={perm.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{perm.trusteeName}</p>
                        <p className="text-micro text-[var(--text-tertiary)]">{trusteeTier}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{perm.gpoName || '-'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{perm.permissionType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        {perm.dangerous ? (
                          <span className="text-micro px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">YES</span>
                        ) : (
                          <span className="text-micro text-[var(--text-tertiary)]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasTierGap ? (
                          <span className="text-micro px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
                            {trusteeTier.toUpperCase()} → {gpoTier.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-micro text-[var(--text-tertiary)]">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                      {tCommon('noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
