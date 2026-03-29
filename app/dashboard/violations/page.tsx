'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useViolationList } from '@/lib/hooks/use-violations'
import { MetricCard } from '@/components/ui/metric-card'
import { RiskGauge } from '@/components/ui/risk-gauge'
import { ViolationBreakdown } from '@/components/charts/violation-breakdown'
import { ViolationFeed } from '@/components/dashboard/violation-feed'
import { formatRelativeTime } from '@/lib/utils/formatters'
import Link from 'next/link'

export default function ViolationsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const t = useTranslations('violations')
  const tSeverity = useTranslations('severity')
  const tCommon = useTranslations('common')

  const { data, isLoading, error } = useViolationList({ ...filters, page, pageSize: 25 })

  const handleFilter = useCallback((key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev }
      if (!value) delete next[key]
      else next[key] = value
      return next
    })
    setPage(1)
  }, [])

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  if (isLoading) {
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

  const { summary, exceptions } = data

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      {/* Severity summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label={tSeverity('critical')} value={summary.bySeverity.critical || 0} color="red" />
        <MetricCard label={tSeverity('high')} value={summary.bySeverity.high || 0} color="orange" />
        <MetricCard label={tSeverity('medium')} value={summary.bySeverity.medium || 0} color="blue" />
        <MetricCard label={tSeverity('low')} value={summary.bySeverity.low || 0} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('violationTypes')}</h3>
          <ViolationBreakdown byType={summary.byType} />
        </div>
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 flex flex-col items-center justify-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 self-start">{t('remediationRate')}</h3>
          <RiskGauge value={summary.remediationRate} label={t('violationsRemediated')} size={160} />
          <div className="grid grid-cols-3 gap-4 mt-6 text-center w-full">
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{summary.byStatus.open || 0}</p>
              <p className="text-xs text-[var(--text-secondary)]">{tCommon('open')}</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-low)' }}>{summary.byStatus.remediated || 0}</p>
              <p className="text-xs text-[var(--text-secondary)]">{tCommon('remediated')}</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-info)' }}>{summary.byStatus.excepted || 0}</p>
              <p className="text-xs text-[var(--text-secondary)]">{tCommon('excepted')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Violation feed with filters */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)]" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="p-4 border-b border-[var(--border-default)] flex flex-wrap gap-2">
          <select
            value={filters.violationType || ''}
            onChange={(e) => handleFilter('violationType', e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
          >
            <option value="">{t('allTypes')}</option>
            <option value="tier_breach">{t('tierBreach')}</option>
            <option value="sod_conflict">{t('sodConflict')}</option>
            <option value="excessive_privilege">{t('excessivePrivilege')}</option>
            <option value="dormant_access">{t('dormantAccess')}</option>
            <option value="orphaned_identity">{t('orphanedIdentity')}</option>
            <option value="missing_mfa">{t('missingMfa')}</option>
            <option value="expired_certification">{t('expiredCertification')}</option>
            <option value="password_age">{t('passwordAge')}</option>
          </select>
          <select
            value={filters.severity || ''}
            onChange={(e) => handleFilter('severity', e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
          >
            <option value="">{tSeverity('allSeverities')}</option>
            <option value="critical">{tSeverity('critical')}</option>
            <option value="high">{tSeverity('high')}</option>
            <option value="medium">{tSeverity('medium')}</option>
            <option value="low">{tSeverity('low')}</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
          >
            <option value="">{tCommon('all')}</option>
            <option value="open">{tCommon('open')}</option>
            <option value="acknowledged">{tCommon('acknowledged')}</option>
            <option value="remediated">{tCommon('remediated')}</option>
            <option value="excepted">{tCommon('excepted')}</option>
            <option value="false_positive">{tCommon('falsePositive')}</option>
          </select>
          <span className="flex items-center text-sm text-[var(--text-secondary)]">
            {t('violationsCount', { count: data.total })}
          </span>
        </div>

        <ViolationFeed violations={data.data} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
            <p className="text-sm text-[var(--text-secondary)]">{tCommon('page')} {page} {tCommon('of')} {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)]"
              >
                {tCommon('previous')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-lg disabled:opacity-50 hover:bg-[var(--bg-secondary)]"
              >
                {tCommon('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exception tracker */}
      {exceptions.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
            {t('activeExceptions')} ({exceptions.length})
          </h3>
          <div className="space-y-3">
            {exceptions.map((exc) => (
              <div key={exc.id} className="flex items-center justify-between p-3 bg-[var(--color-info-bg)] rounded-lg">
                <div>
                  <Link
                    href={`/dashboard/identities/${exc.identityId}`}
                    className="text-sm font-medium text-[var(--color-info)] hover:underline"
                  >
                    {exc.identityName}
                  </Link>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">
                    {exc.violationType.replace(/_/g, ' ')} — {exc.exceptionReason}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-[var(--text-secondary)]">{t('expires')}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {exc.exceptionExpiresAt ? formatRelativeTime(exc.exceptionExpiresAt) : tCommon('na')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
