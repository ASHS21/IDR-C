'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/ui/metric-card'
import { AD_TIER_CONFIG } from '@/lib/utils/constants'
import { formatRelativeTime } from '@/lib/utils/formatters'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const CERT_COLORS: Record<string, string> = {
  certified: '#16a34a',
  pending: '#ca8a04',
  expired: '#dc2626',
  revoked: '#6b7280',
}

export default function EntitlementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['entitlements', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/entitlements')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })
  const t = useTranslations('entitlements')
  const tCommon = useTranslations('common')

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-28 animate-pulse" />)}
        </div>
      </div>
    )
  }

  const certData = Object.entries(data.certificationBreakdown).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: Number(count),
    color: CERT_COLORS[status] || '#94a3b8',
  }))

  const permData = Object.entries(data.permissionTypes).map(([type, count]) => ({
    type: type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: Number(count),
  }))

  const totalEntitlements = Object.values(data.certificationBreakdown).reduce((sum: number, c) => sum + Number(c), 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label={t('totalEntitlements')} value={totalEntitlements} color="blue" />
        <MetricCard label={t('unused90Days')} value={data.unusedEntitlements.length} color="orange" />
        <MetricCard label={t('riskTagged')} value={data.riskTaggedCount} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certification breakdown pie */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('certificationStatus')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={certData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {certData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Permission type distribution */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('permissionTypes')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={permData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={95} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Over-provisioned identities */}
      {data.overProvisionedIdentities.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">
            {t('overProvisioned')} ({data.overProvisionedIdentities.length})
          </h3>
          <div className="space-y-2">
            {data.overProvisionedIdentities.map((i: any) => (
              <div key={i.identityId} className="flex items-center justify-between p-3 bg-[var(--color-high-bg)] rounded-lg">
                <Link href={`/dashboard/identities/${i.identityId}`} className="text-sm font-medium text-[var(--color-info)] hover:underline">
                  {i.identityName}
                </Link>
                <span className="text-sm font-bold" style={{ color: 'var(--color-high)' }}>{t('entitlementsCount', { count: i.entitlementCount })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unused entitlements */}
      {data.unusedEntitlements.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('unusedEntitlements')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-3 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('permission')}</th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('identityCol')}</th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('resource')}</th>
                  <th className="px-3 py-2 text-start text-xs font-medium text-[var(--text-secondary)]">{t('lastUsed')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {data.unusedEntitlements.slice(0, 20).map((ent: any) => (
                  <tr key={ent.id}>
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{ent.permissionName}</td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/identities/${ent.identityId}`} className="text-[var(--color-info)] hover:underline text-xs">
                        {ent.identityName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{ent.resourceName}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{ent.lastUsedAt ? formatRelativeTime(ent.lastUsedAt) : tCommon('never')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
