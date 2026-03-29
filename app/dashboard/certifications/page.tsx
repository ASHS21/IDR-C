'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/ui/metric-card'
import { formatRelativeTime } from '@/lib/utils/formatters'
import Link from 'next/link'

export default function CertificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['entitlements', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/entitlements')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const t = useTranslations('certifications')

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="animate-pulse bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-64" />
      </div>
    )
  }

  const cert = data.certificationBreakdown
  const total = Object.values(cert).reduce((sum: number, c) => sum + Number(c), 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label={t('certified')} value={cert.certified || 0} color="green" />
        <MetricCard label={t('pending')} value={cert.pending || 0} color="blue" />
        <MetricCard label={t('expired')} value={cert.expired || 0} color={cert.expired > 0 ? 'red' : 'green'} />
        <MetricCard label={t('revoked')} value={cert.revoked || 0} />
      </div>

      {/* Certification progress */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('certificationProgress')}</h3>
        <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-4 overflow-hidden">
          {total > 0 && (
            <div className="h-full flex">
              <div className="bg-green-500 h-full" style={{ width: `${(Number(cert.certified || 0) / total) * 100}%` }} />
              <div className="bg-yellow-500 h-full" style={{ width: `${(Number(cert.pending || 0) / total) * 100}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${(Number(cert.expired || 0) / total) * 100}%` }} />
              <div className="bg-slate-400 h-full" style={{ width: `${(Number(cert.revoked || 0) / total) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex gap-6 mt-3 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> {t('certified')} ({total > 0 ? Math.round((Number(cert.certified || 0) / total) * 100) : 0}%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500" /> {t('pending')} ({total > 0 ? Math.round((Number(cert.pending || 0) / total) * 100) : 0}%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> {t('expired')} ({total > 0 ? Math.round((Number(cert.expired || 0) / total) * 100) : 0}%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400" /> {t('revoked')} ({total > 0 ? Math.round((Number(cert.revoked || 0) / total) * 100) : 0}%)</span>
        </div>
      </div>

      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{t('certificationCampaigns')}</h3>
        <p className="text-sm text-[var(--text-tertiary)]">{t('campaignNote')}</p>
      </div>
    </div>
  )
}
