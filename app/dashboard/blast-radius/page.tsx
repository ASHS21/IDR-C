'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/dashboard/metric-card'
import { BlastRadiusViz } from '@/components/dashboard/blast-radius-viz'

interface BlastNode {
  id: string
  name: string
  type: 'identity' | 'resource' | 'group'
  subType?: string
  tier?: string
  criticality?: string
}

interface BlastResult {
  center: { id: string; name: string; type: string; subType: string; tier: string; riskScore: number }
  rings: { depth: number; nodes: BlastNode[] }[]
  stats: {
    totalReachable: number
    tierBreaches: number
    criticalAssets: number
    identityCount: number
    resourceCount: number
    groupCount: number
  }
}

export default function BlastRadiusPage() {
  const t = useTranslations('blastRadius')
  const tCommon = useTranslations('common')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; displayName: string; type: string; adTier: string }[]>([])
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null)
  const [blastData, setBlastData] = useState<BlastResult | null>(null)
  const [narration, setNarration] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [topImpactful, setTopImpactful] = useState<{ id: string; name: string; totalReachable: number; tier: string }[]>([])
  const [topLoading, setTopLoading] = useState(false)

  const searchIdentities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/identities?search=${encodeURIComponent(query)}&pageSize=10`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [])

  const analyzeBlastRadius = useCallback(async (identityId: string) => {
    setSelectedIdentity(identityId)
    setLoading(true)
    setNarration(null)
    try {
      const res = await fetch('/api/blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId, maxDepth: 3 }),
      })
      if (res.ok) {
        const data = await res.json()
        setBlastData(data)

        // Get AI narration
        try {
          const narRes = await fetch('/api/blast-radius/narrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (narRes.ok) {
            const narData = await narRes.json()
            setNarration(narData.narrative || null)
          }
        } catch {
          // narration optional
        }
      }
    } catch {
      // error handled
    } finally {
      setLoading(false)
      setSearchResults([])
      setSearchQuery('')
    }
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      {/* Search */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">{t('selectIdentity')}</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              searchIdentities(e.target.value)
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {searchResults.map((identity) => (
                <button
                  key={identity.id}
                  onClick={() => analyzeBlastRadius(identity.id)}
                  className="w-full text-start px-4 py-2 hover:bg-[var(--bg-secondary)] text-sm flex items-center justify-between"
                >
                  <span className="text-[var(--text-primary)]">{identity.displayName}</span>
                  <span className="text-xs text-[var(--text-secondary)] capitalize">{identity.type} / {identity.adTier?.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[var(--color-info)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">{t('computing')}</p>
        </div>
      )}

      {blastData && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label={t('totalReachable')} value={blastData.stats.totalReachable} color="blue" />
            <MetricCard label={t('t0Assets')} value={blastData.stats.tierBreaches} color="red" />
            <MetricCard label={t('criticalAssets')} value={blastData.stats.criticalAssets} color="orange" />
            <MetricCard label={t('identitiesReachable')} value={blastData.stats.identityCount} color="green" />
          </div>

          {/* Narration */}
          {narration && (
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('aiAnalysis')}</h3>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">{narration}</p>
            </div>
          )}

          {/* Visualization */}
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('blastRadiusMap')}</h3>
            <BlastRadiusViz center={blastData.center} rings={blastData.rings} />
          </div>

          {/* Ring details */}
          {blastData.rings.map((ring) => (
            <div key={ring.depth} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                {t('ringDepth', { depth: ring.depth })} ({ring.nodes.length} {t('nodes')})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-start py-2 px-3 text-[var(--text-secondary)] font-medium">{t('name')}</th>
                      <th className="text-start py-2 px-3 text-[var(--text-secondary)] font-medium">{t('type')}</th>
                      <th className="text-start py-2 px-3 text-[var(--text-secondary)] font-medium">{t('tier')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ring.nodes.slice(0, 20).map((node) => (
                      <tr key={node.id} className="border-b border-[var(--border-subtle)]">
                        <td className="py-2 px-3 text-[var(--text-primary)]">{node.name}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            node.type === 'identity' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            node.type === 'resource' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {node.type}{node.subType ? ` / ${node.subType}` : ''}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {node.tier === 'tier_0' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              T0
                            </span>
                          )}
                          {node.tier === 'tier_1' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              T1
                            </span>
                          )}
                          {node.tier === 'tier_2' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              T2
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ring.nodes.length > 20 && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2 px-3">
                    +{ring.nodes.length - 20} {t('moreNodes')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
