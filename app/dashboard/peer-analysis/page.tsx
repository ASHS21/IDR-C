'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/dashboard/metric-card'

interface PeerGroup {
  id: string
  name: string
  department: string
  adTier: string
  subType: string
  memberCount: number
  medianEntitlementCount: number
  avgEntitlementCount: number
  stddevEntitlementCount: number
}

interface PeerAnomaly {
  id: string
  identityId: string
  identityName: string
  identityTier: string
  identityDepartment: string
  peerGroupId: string
  peerGroupName: string
  anomalyType: string
  entitlementCount: number
  peerMedian: number
  deviationScore: number
  excessEntitlements: any[]
  uniqueEntitlements: any[]
  status: string
  detectedAt: string
}

export default function PeerAnalysisPage() {
  const t = useTranslations('peerAnalysis')
  const tCommon = useTranslations('common')

  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([])
  const [anomalies, setAnomalies] = useState<PeerAnomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [groupRes, anomalyRes] = await Promise.all([
        fetch('/api/peer-groups'),
        fetch('/api/peer-anomalies'),
      ])
      if (groupRes.ok) {
        const gd = await groupRes.json()
        setPeerGroups(gd.items || [])
      }
      if (anomalyRes.ok) {
        const ad = await anomalyRes.json()
        setAnomalies(ad.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const recompute = useCallback(async () => {
    setComputing(true)
    try {
      await fetch('/api/peer-groups', { method: 'POST' })
      await fetchData()
    } finally {
      setComputing(false)
    }
  }, [fetchData])

  const updateAnomalyStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/peer-anomalies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchData()
  }, [fetchData])

  const avgDeviation = anomalies.length > 0
    ? (anomalies.reduce((s, a) => s + a.deviationScore, 0) / anomalies.length).toFixed(1)
    : '0'

  if (loading && peerGroups.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
          onClick={recompute}
          disabled={computing}
          className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {computing ? t('computing') : t('recompute')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label={t('totalPeerGroups')} value={peerGroups.length} color="blue" />
        <MetricCard label={t('totalAnomalies')} value={anomalies.length} color="orange" />
        <MetricCard label={t('avgDeviation')} value={avgDeviation} color="red" />
      </div>

      {/* Peer group cards */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('peerGroupsTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {peerGroups.slice(0, 12).map((pg) => {
            const groupAnomalies = anomalies.filter(a => a.peerGroupId === pg.id).length
            return (
              <div key={pg.id} className="border border-[var(--border-default)] rounded-lg p-3">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{pg.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[var(--text-secondary)]">{pg.memberCount} {t('members')}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{t('median')}: {pg.medianEntitlementCount.toFixed(0)}</span>
                  {groupAnomalies > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full">
                      {groupAnomalies} {t('anomaliesLabel')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Anomaly table */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)]" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="p-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">{t('anomaliesTitle')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('identity')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('peerGroup')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('entitlements')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('vsMedian')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('deviation')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('statusCol')}</th>
                <th className="text-start py-3 px-4 text-[var(--text-secondary)] font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anomaly) => (
                <>
                  <tr
                    key={anomaly.id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                    onClick={() => setExpandedAnomaly(expandedAnomaly === anomaly.id ? null : anomaly.id)}
                  >
                    <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{anomaly.identityName}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{anomaly.peerGroupName}</td>
                    <td className="py-3 px-4 text-[var(--text-primary)] font-semibold">{anomaly.entitlementCount}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{anomaly.peerMedian.toFixed(0)}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${anomaly.deviationScore > 3 ? 'text-[var(--color-critical)]' : 'text-[var(--color-high)]'}`}>
                        {anomaly.deviationScore.toFixed(1)}x
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        anomaly.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        anomaly.status === 'reviewed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {anomaly.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {anomaly.status === 'open' && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateAnomalyStatus(anomaly.id, 'reviewed') }}
                            className="px-2 py-1 text-xs bg-[var(--color-info)] text-white rounded"
                          >
                            {t('review')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateAnomalyStatus(anomaly.id, 'dismissed') }}
                            className="px-2 py-1 text-xs border border-[var(--border-default)] rounded hover:bg-[var(--bg-secondary)]"
                          >
                            {t('dismissBtn')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedAnomaly === anomaly.id && (
                    <tr key={`${anomaly.id}-details`}>
                      <td colSpan={7} className="px-4 py-3 bg-[var(--bg-secondary)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(anomaly.excessEntitlements as any[])?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{t('excessEntitlements')}</p>
                              <ul className="text-xs text-[var(--text-primary)] space-y-0.5">
                                {(anomaly.excessEntitlements as any[]).slice(0, 5).map((e: any, i: number) => (
                                  <li key={i}>{e.permissionName} ({e.tier}) - {e.peersWithSame} {t('peersHave')}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(anomaly.uniqueEntitlements as any[])?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{t('uniqueEntitlements')}</p>
                              <ul className="text-xs text-[var(--text-primary)] space-y-0.5">
                                {(anomaly.uniqueEntitlements as any[]).slice(0, 5).map((e: any, i: number) => (
                                  <li key={i}>{e.permissionName} ({e.tier})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {anomalies.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            {t('noAnomalies')}
          </div>
        )}
      </div>
    </div>
  )
}
