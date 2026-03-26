'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useIdentityDetail } from '@/lib/hooks/use-identities'
import { IdentityDetailHeader } from '@/components/dashboard/identity-detail-header'
import { IdentityTabs } from '@/components/dashboard/identity-tabs'

export default function IdentityDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data, isLoading, error } = useIdentityDetail(id)
  const t = useTranslations('identity')
  const tCommon = useTranslations('common')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/identities" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          {t('explorer')}
        </Link>
        <span className="text-[var(--text-tertiary)]">/</span>
        <span className="text-[var(--text-primary)] font-medium">
          {data?.identity.displayName || tCommon('loading')}
        </span>
      </nav>

      {isLoading ? (
        <div className="space-y-6">
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-48 animate-pulse">
            <div className="h-6 bg-[var(--bg-secondary)] rounded w-48 mb-4" />
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-32 mb-6" />
            <div className="flex gap-2">
              <div className="h-6 bg-[var(--bg-secondary)] rounded w-16" />
              <div className="h-6 bg-[var(--bg-secondary)] rounded w-16" />
            </div>
          </div>
          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 h-64 animate-pulse" />
        </div>
      ) : error ? (
        <div className="bg-[var(--color-critical-bg)] border border-[var(--color-critical)] rounded-xl p-6">
          <p className="font-medium" style={{ color: 'var(--color-critical)' }}>{t('failedToLoadIdentity')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {error instanceof Error ? error.message : t('identityNotFound')}
          </p>
          <Link href="/dashboard/identities" className="text-[var(--color-info)] text-sm mt-2 inline-block hover:underline">
            {t('backToIdentities')}
          </Link>
        </div>
      ) : data ? (
        <>
          <IdentityDetailHeader data={data} />
          <IdentityTabs data={data} />
        </>
      ) : null}
    </div>
  )
}
