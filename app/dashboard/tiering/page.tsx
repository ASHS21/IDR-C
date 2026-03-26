'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTieringData } from '@/lib/hooks/use-tiering'
import { TierPyramid } from '@/components/dashboard/tier-pyramid'
import { TierHeatmap } from '@/components/charts/tier-heatmap'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AD_TIER_CONFIG, getRiskLevel } from '@/lib/utils/constants'

export default function TieringPage() {
  const { data, isLoading, error } = useTieringData()
  const t = useTranslations('tiering')
  const tIdentity = useTranslations('identity')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="bg-[var(--color-critical-bg)] border border-[var(--color-critical)] rounded-xl p-6">
          <p className="font-medium" style={{ color: 'var(--color-critical)' }}>{t('failedToLoad')}</p>
        </div>
      </div>
    )
  }

  const violationCount = data.crossTierIdentities.length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label={t('tier0Identities')} value={data.tierCounts.tier_0 || 0} color="red" />
        <MetricCard label={t('tier1Identities')} value={data.tierCounts.tier_1 || 0} color="orange" />
        <MetricCard label={t('tier2Identities')} value={data.tierCounts.tier_2 || 0} color="blue" />
        <MetricCard label={t('tierViolations')} value={violationCount} color={violationCount > 0 ? 'red' : 'green'} />
      </div>

      {/* Pyramid + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('tierDistribution')}</h3>
          <TierPyramid tierCounts={data.tierCounts} total={data.totalIdentities} />
        </div>
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('tierAccessMatrix')}</h3>
          <TierHeatmap heatmap={data.heatmap} />
        </div>
      </div>

      {/* Cross-tier access paths */}
      {data.crossTierIdentities.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
            {t('crossTierPaths')} ({data.crossTierIdentities.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-4 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('identityCol')}</th>
                  <th className="px-4 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('typeCol')}</th>
                  <th className="px-4 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('assignedTier')}</th>
                  <th className="px-4 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('effectiveTier')}</th>
                  <th className="px-4 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('riskScore')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {data.crossTierIdentities.map((identity) => {
                  const tierConfig = AD_TIER_CONFIG[identity.adTier as keyof typeof AD_TIER_CONFIG]
                  const effectiveConfig = identity.effectiveTier
                    ? AD_TIER_CONFIG[identity.effectiveTier as keyof typeof AD_TIER_CONFIG]
                    : null
                  const risk = getRiskLevel(identity.riskScore)

                  return (
                    <tr key={identity.id} className="hover:bg-[var(--bg-secondary)]">
                      <td className="px-4 py-2">
                        <Link
                          href={`/dashboard/identities/${identity.id}`}
                          className="font-medium text-[var(--color-info)] hover:underline"
                        >
                          {identity.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-[var(--text-secondary)]">
                        {identity.type === 'human' ? tIdentity('human') : tIdentity('non_human')}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ color: tierConfig?.color, backgroundColor: tierConfig?.bgColor }}>
                          {tierConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {effectiveConfig && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ color: effectiveConfig.color, backgroundColor: effectiveConfig.bgColor }}>
                            {effectiveConfig.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-semibold" style={{ color: risk.color }}>
                          {identity.riskScore}
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

      {/* Tier 0 Inventory + Unclassified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
            {t('tier0Inventory')} ({t('identitiesCount', { count: data.tier0Identities.length })}, {t('resourcesCount', { count: data.tier0Resources.length })})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.tier0Identities.map((i) => (
              <Link
                key={i.id}
                href={`/dashboard/identities/${i.id}`}
                className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-secondary)] text-sm"
              >
                <span className="font-medium text-[var(--text-primary)]">
                  {i.displayName}
                </span>
                <span className="text-xs text-[var(--text-secondary)] capitalize">{i.subType.replace(/_/g, ' ')}</span>
              </Link>
            ))}
            {data.tier0Resources.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 text-sm">
                <span className="text-[var(--text-secondary)]">{r.name}</span>
                <span className="text-xs text-[var(--text-secondary)] capitalize">{r.type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {data.unclassifiedIdentities.length > 0 && (
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
              {t('unclassifiedIdentities')} ({data.unclassifiedIdentities.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.unclassifiedIdentities.map((i) => (
                <Link
                  key={i.id}
                  href={`/dashboard/identities/${i.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-[var(--bg-secondary)] text-sm"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {i.displayName}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{i.sourceSystem.replace(/_/g, ' ')}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
