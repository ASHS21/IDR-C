'use client'

import { useTranslations } from 'next-intl'
import { useOverviewMetrics } from '@/lib/hooks/use-metrics'
import { MetricCard } from '@/components/ui/metric-card'
import { RiskGauge } from '@/components/ui/risk-gauge'
import { TierBadge } from '@/components/ui/tier-badge'
import { IdentityAvatar } from '@/components/ui/identity-avatar'
import { RiskTrendChart } from '@/components/charts/risk-trend'
import { IntegrationHealthStrip } from '@/components/dashboard/integration-health-strip'
import { CardSkeleton } from '@/components/ui/skeleton'
import { getRiskLevel } from '@/lib/utils/constants'
import Link from 'next/link'
import { AlertTriangle, Shield, TrendingUp, Users } from 'lucide-react'
import { ExportPdfButton } from '@/components/dashboard/export-pdf-button'

export default function DashboardOverview() {
  const { data, isLoading, error } = useOverviewMetrics()
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const tSeverity = useTranslations('severity')

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-critical)] bg-[var(--color-critical-bg)] p-6">
          <p className="text-body font-medium" style={{ color: 'var(--color-critical)' }}>
            {t('failedToLoad')}
          </p>
          <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('checkConnection')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>
        <ExportPdfButton reportType="risk_summary" label="Export Risk Summary" />
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label={t('totalIdentities')} value={data.totalIdentities} />
        <MetricCard label={t('activeViolations')} value={data.activeViolations} severity={data.activeViolations > 0 ? 'critical' : undefined} />
        <MetricCard label={t('tierViolations')} value={data.tierViolations} severity={data.tierViolations > 0 ? 'high' : undefined} />
        <MetricCard label={t('criticalRisk')} value={data.riskDistribution?.critical ?? 0} severity={(data.riskDistribution?.critical ?? 0) > 0 ? 'critical' : undefined} />
      </div>

      {/* Risk Trend + Top 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Risk Posture Trend (3 cols) */}
        <div className="lg:col-span-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">{t('riskPosture')}</h3>
          <RiskTrendChart data={data.riskTrendData} />
        </div>

        {/* Top Riskiest (2 cols) */}
        <div className="lg:col-span-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('topRiskiest')}</h3>
            <Link href="/dashboard/identities?sortBy=riskScore&sortOrder=desc" className="text-micro text-[var(--color-info)] hover:underline">
              {tCommon('viewAll')} →
            </Link>
          </div>
          <div className="space-y-2">
            {data.topRiskyIdentities.map((identity: any, i: number) => {
              const risk = getRiskLevel(identity.riskScore)
              return (
                <Link
                  key={identity.id}
                  href={`/dashboard/identities/${identity.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <span className="text-caption font-mono text-[var(--text-tertiary)] w-5">{i + 1}</span>
                  <IdentityAvatar
                    name={identity.displayName}
                    type={identity.type}
                    subType={identity.subType}
                    status={identity.status}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-medium text-[var(--text-primary)] truncate">{identity.displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TierBadge tier={identity.adTier} effectiveTier={identity.tierViolation ? 'tier_0' : null} size="xs" />
                    </div>
                  </div>
                  <RiskGauge score={identity.riskScore} size="sm" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tier Compliance + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Compliance gauge (2 cols) */}
        <div className="lg:col-span-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 flex flex-col items-center justify-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 self-start">{t('tierCompliance')}</h3>
          <RiskGauge score={data.tierCompliancePercentage} size="lg" label={t('identitiesWithoutViolations')} />

          {/* Risk distribution */}
          <div className="grid grid-cols-4 gap-2 w-full mt-6">
            {(['low', 'medium', 'high', 'critical'] as const).map((level) => {
              const colors = {
                low: { bg: 'var(--color-low-bg)', text: 'var(--color-low)' },
                medium: { bg: 'var(--color-medium-bg)', text: 'var(--color-medium)' },
                high: { bg: 'var(--color-high-bg)', text: 'var(--color-high)' },
                critical: { bg: 'var(--color-critical-bg)', text: 'var(--color-critical)' },
              }
              return (
                <div key={level} className="rounded-md p-2.5 text-center" style={{ backgroundColor: colors[level].bg }}>
                  <p className="text-heading font-semibold" style={{ color: colors[level].text }}>
                    {data.riskDistribution?.[level] ?? 0}
                  </p>
                  <p className="text-micro text-[var(--text-secondary)]">{tSeverity(level)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending Actions (3 cols) */}
        <div className="lg:col-span-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">{t('pendingActions')}</h3>
          <div className="space-y-3">
            {data.pendingActions.map((action: any) => (
              <div
                key={action.type}
                className="flex items-center justify-between p-4 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: action.count > 0 ? 'var(--color-high-bg)' : 'var(--color-low-bg)' }}>
                    <AlertTriangle size={16} style={{ color: action.count > 0 ? 'var(--color-high)' : 'var(--color-low)' }} />
                  </div>
                  <div>
                    <p className="text-body font-medium text-[var(--text-primary)]">{action.label}</p>
                    <p className="text-micro text-[var(--text-tertiary)]">{tCommon('requiresAttention')}</p>
                  </div>
                </div>
                <span className="text-title font-semibold" style={{ color: action.count > 0 ? 'var(--color-high)' : 'var(--color-low)' }}>
                  {action.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Health */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">{t('integrationHealth')}</h3>
        <IntegrationHealthStrip integrations={data.integrationHealth} />
      </div>
    </div>
  )
}
