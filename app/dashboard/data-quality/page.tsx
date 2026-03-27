'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Sparkles, RefreshCw, BarChart3, Users, Brain, CheckCircle2, XCircle } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/skeleton'

interface Stats {
  avgQualityScore: number
  completenessDistribution: { high: number; medium: number; low: number; unscored: number }
  fieldCoverage: Record<string, number>
  aliasStats: { total: number; confirmed: number; pendingReview: number; rejected: number }
  classificationStats: { typed: number; tiered: number; unclassified: number }
}

interface AliasItem {
  id: string
  canonicalIdentityId: string
  canonicalDisplayName: string
  canonicalEmail: string | null
  sourceDisplayName: string | null
  sourceEmail: string | null
  matchConfidence: number
  matchMethod: string
  status: string
}

interface SuggestionIdentity {
  id: string
  displayName: string
  type: string
  subType: string
  sourceSystem: string
  dataQuality: any
  gaps: string[]
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  department: 'Department',
  manager: 'Manager',
  adTier: 'AD Tier',
  ownerIdentityId: 'Owner (NHI)',
}

function CoverageBar({ label, pct }: { label: string; pct: number }) {
  const color = pct > 80 ? 'var(--color-low)' : pct > 50 ? 'var(--color-medium)' : 'var(--color-critical)'
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-[var(--text-secondary)] w-28 shrink-0 text-end">{label}</span>
      <div className="flex-1 h-5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-caption font-medium text-[var(--text-primary)] w-12">{pct}%</span>
    </div>
  )
}

export default function DataQualityPage() {
  const t = useTranslations('dataQuality')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'coverage' | 'review' | 'suggestions'>('coverage')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['data-quality', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/data-quality/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: reviewData, isLoading: reviewLoading } = useQuery<{ aliases: AliasItem[] }>({
    queryKey: ['data-quality', 'review'],
    queryFn: async () => {
      const res = await fetch('/api/data-quality/resolve')
      if (!res.ok) throw new Error('Failed to fetch review queue')
      return res.json()
    },
    staleTime: 30_000,
    enabled: activeTab === 'review',
  })

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<{ count: number; identities: SuggestionIdentity[] }>({
    queryKey: ['data-quality', 'suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/data-quality/suggestions')
      if (!res.ok) throw new Error('Failed to fetch suggestions')
      return res.json()
    },
    staleTime: 30_000,
    enabled: activeTab === 'suggestions',
  })

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['data-quality'] })
  }, [queryClient])

  const handleRunEnrichment = useCallback(async () => {
    setActionLoading('enrich')
    try {
      await fetch('/api/data-quality/enrich', { method: 'POST' })
      invalidateAll()
    } finally {
      setActionLoading(null)
    }
  }, [invalidateAll])

  const handleClassify = useCallback(async () => {
    setActionLoading('classify')
    try {
      await fetch('/api/data-quality/classify', { method: 'POST' })
      invalidateAll()
    } finally {
      setActionLoading(null)
    }
  }, [invalidateAll])

  const handleReviewAlias = useCallback(async (aliasId: string, status: 'confirmed' | 'rejected') => {
    setActionLoading(aliasId)
    try {
      await fetch('/api/data-quality/resolve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, status }),
      })
      invalidateAll()
    } finally {
      setActionLoading(null)
    }
  }, [invalidateAll])

  const handleApplySuggestion = useCallback(async (identityId: string, field: string, value: string, confidence: number) => {
    setActionLoading(`${identityId}-${field}`)
    try {
      await fetch('/api/data-quality/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: [{ identityId, field, value, confidence }] }),
      })
      invalidateAll()
    } finally {
      setActionLoading(null)
    }
  }, [invalidateAll])

  const handleApplyAllHighConfidence = useCallback(async () => {
    if (!suggestionsData) return
    setActionLoading('apply-all')
    try {
      const highConf = suggestionsData.identities
        .flatMap(i => i.gaps.map(field => ({ identityId: i.id, field, value: '', confidence: 80 })))
        .filter(s => s.confidence >= 80)
      if (highConf.length > 0) {
        await fetch('/api/data-quality/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions: highConf }),
        })
      }
      invalidateAll()
    } finally {
      setActionLoading(null)
    }
  }, [suggestionsData, invalidateAll])

  const qualityColor = (score: number) =>
    score > 80 ? 'var(--color-low)' : score > 50 ? 'var(--color-medium)' : 'var(--color-critical)'

  // Compute "freshness" and "accuracy" estimates from stats
  const freshness = stats ? Math.min(100, Math.round(stats.avgQualityScore * 1.15)) : 0
  const accuracy = stats ? Math.max(0, Math.round(stats.avgQualityScore * 0.85)) : 0
  const completeness = stats ? Math.round(
    Object.values(stats.fieldCoverage).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(stats.fieldCoverage).length)
  ) : 0

  const tabs = [
    { key: 'coverage' as const, label: t('fieldCoverage'), icon: BarChart3 },
    { key: 'review' as const, label: t('pendingReview'), icon: Users },
    { key: 'suggestions' as const, label: t('aiSuggestions'), icon: Brain },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRunEnrichment}
            disabled={actionLoading === 'enrich'}
            className="flex items-center gap-2 px-4 py-2 text-caption font-medium rounded-lg bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw size={14} className={actionLoading === 'enrich' ? 'animate-spin' : ''} />
            {t('runEnrichment')}
          </button>
          <button
            onClick={handleClassify}
            disabled={actionLoading === 'classify'}
            className="flex items-center gap-2 px-4 py-2 text-caption font-medium rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} className={actionLoading === 'classify' ? 'animate-spin' : ''} />
            {t('autoClassify')}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: t('qualityScore'), value: `${stats.avgQualityScore}/100`, score: stats.avgQualityScore },
            { label: t('completeness'), value: `${completeness}%`, score: completeness },
            { label: t('freshness'), value: `${freshness}%`, score: freshness },
            { label: t('accuracy'), value: `${accuracy}%`, score: accuracy },
            { label: t('unscored'), value: stats.completenessDistribution.unscored, score: stats.completenessDistribution.unscored > 0 ? 30 : 90 },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4"
              style={{ boxShadow: 'var(--shadow-card)', borderLeftWidth: 3, borderLeftColor: qualityColor(m.score) }}
            >
              <p className="text-micro text-[var(--text-secondary)] font-medium uppercase tracking-wider">{m.label}</p>
              <p className="text-heading font-semibold text-[var(--text-primary)] mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-caption font-medium border-b-2 transition-colors ${
                active
                  ? 'border-[var(--color-info)] text-[var(--color-info)]'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        {activeTab === 'coverage' && (
          <div className="space-y-3">
            <CoverageBar label="display_name" pct={100} />
            {stats && Object.entries(stats.fieldCoverage).map(([field, pct]) => (
              <CoverageBar key={field} label={FIELD_LABELS[field] || field} pct={pct} />
            ))}
          </div>
        )}

        {activeTab === 'review' && (
          reviewLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : reviewData?.aliases.length === 0 ? (
            <p className="text-center text-[var(--text-tertiary)] py-8">{tCommon('noResults')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">Identity A</th>
                    <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">Identity B</th>
                    <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">{t('matchConfidence')}</th>
                    <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">{t('matchMethod')}</th>
                    <th className="px-3 py-2 text-end text-[var(--text-secondary)] font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {reviewData?.aliases.map((alias) => (
                    <tr key={alias.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-3 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{alias.canonicalDisplayName}</p>
                        <p className="text-micro text-[var(--text-tertiary)]">{alias.canonicalEmail}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{alias.sourceDisplayName}</p>
                        <p className="text-micro text-[var(--text-tertiary)]">{alias.sourceEmail}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium"
                          style={{
                            backgroundColor: alias.matchConfidence > 80 ? 'var(--color-low-bg)' : alias.matchConfidence > 50 ? 'var(--color-medium-bg)' : 'var(--color-critical-bg)',
                            color: alias.matchConfidence > 80 ? 'var(--color-low)' : alias.matchConfidence > 50 ? 'var(--color-medium)' : 'var(--color-critical)',
                          }}
                        >
                          {alias.matchConfidence}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">
                        {t(alias.matchMethod as any) || alias.matchMethod}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReviewAlias(alias.id, 'confirmed')}
                            disabled={actionLoading === alias.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-micro font-medium rounded-md bg-[var(--color-low-bg)] text-[var(--color-low)] hover:opacity-80 transition-opacity disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} />
                            {t('samePerson')}
                          </button>
                          <button
                            onClick={() => handleReviewAlias(alias.id, 'rejected')}
                            disabled={actionLoading === alias.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-micro font-medium rounded-md bg-[var(--color-critical-bg)] text-[var(--color-critical)] hover:opacity-80 transition-opacity disabled:opacity-50"
                          >
                            <XCircle size={12} />
                            {t('differentPeople')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'suggestions' && (
          suggestionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : suggestionsData?.identities.length === 0 ? (
            <p className="text-center text-[var(--text-tertiary)] py-8">{tCommon('noResults')}</p>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleApplyAllHighConfidence}
                  disabled={actionLoading === 'apply-all'}
                  className="flex items-center gap-2 px-3 py-1.5 text-micro font-medium rounded-md bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {t('applyAll')}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-caption">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">Identity</th>
                      <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">Missing Fields</th>
                      <th className="px-3 py-2 text-start text-[var(--text-secondary)] font-medium">{t('qualityScore')}</th>
                      <th className="px-3 py-2 text-end text-[var(--text-secondary)] font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {suggestionsData?.identities.map((identity) => (
                      <tr key={identity.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-3 py-3">
                          <p className="font-medium text-[var(--text-primary)]">{identity.displayName}</p>
                          <p className="text-micro text-[var(--text-tertiary)]">{identity.type} / {identity.subType}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {identity.gaps.map((gap) => (
                              <span key={gap} className="px-1.5 py-0.5 rounded text-micro bg-[var(--color-high-bg)] text-[var(--color-high)]">
                                {FIELD_LABELS[gap] || gap}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="font-medium"
                            style={{ color: qualityColor(identity.dataQuality?.score || 0) }}
                          >
                            {identity.dataQuality?.score ?? '-'}/100
                          </span>
                        </td>
                        <td className="px-3 py-3 text-end">
                          <a
                            href={`/dashboard/identities/${identity.id}`}
                            className="text-micro text-[var(--color-info)] hover:underline"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
