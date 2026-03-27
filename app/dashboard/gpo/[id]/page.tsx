'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Shield, Link2, Lock, AlertTriangle, Route, Loader2, ExternalLink } from 'lucide-react'

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

interface GpoDetail {
  gpo: any
  owner: any
  links: any[]
  permissions: any[]
  risks: Array<{ type: string; description: string; severity: string }>
  relatedPaths: any[]
}

export default function GpoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('gpo')
  const tCommon = useTranslations('common')

  const [data, setData] = useState<GpoDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/gpo/${params.id}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--color-info)]" />
      </div>
    )
  }

  if (!data?.gpo) {
    return (
      <div className="text-center py-20 text-[var(--text-tertiary)]">
        <p className="text-body">{tCommon('noData')}</p>
        <button
          onClick={() => router.push('/dashboard/gpo')}
          className="mt-4 text-[var(--color-info)] hover:underline text-caption"
        >
          {tCommon('back')}
        </button>
      </div>
    )
  }

  const { gpo, owner, links, permissions, risks, relatedPaths } = data

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/gpo')}
        className="flex items-center gap-2 text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft size={16} className="rtl:-scale-x-100" />
        {tCommon('back')}
      </button>

      {/* Header Card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-h2 font-bold text-[var(--text-primary)]">{gpo.name}</h1>
              <span className={`text-micro px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE[gpo.adTier] || TIER_BADGE.unclassified}`}>
                {gpo.adTier.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`text-micro px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[gpo.status] || ''}`}>
                {gpo.status.toUpperCase()}
              </span>
            </div>
            {gpo.gpoGuid && (
              <p className="text-micro text-[var(--text-tertiary)] font-mono">{gpo.gpoGuid}</p>
            )}
            {gpo.description && (
              <p className="text-caption text-[var(--text-secondary)]">{gpo.description}</p>
            )}
          </div>
          <div className="text-end space-y-1">
            <p className="text-caption text-[var(--text-tertiary)]">{t('fields.version')}: <span className="text-[var(--text-primary)] font-medium">{gpo.version}</span></p>
            {owner && (
              <p className="text-caption text-[var(--text-tertiary)]">{t('fields.owner')}: <span className="text-[var(--text-primary)]">{owner.displayName}</span></p>
            )}
            {!owner && (
              <p className="text-caption text-amber-500">{t('risks.noOwner')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Risks */}
      {risks.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-red-500/30 bg-red-500/5 p-4 space-y-3">
          <h2 className="text-body font-semibold text-[var(--color-critical)] flex items-center gap-2">
            <AlertTriangle size={18} />
            Risks ({risks.length})
          </h2>
          <div className="space-y-2">
            {risks.map((risk, i) => (
              <div key={i} className="flex items-center gap-3 text-caption">
                <span className={`text-micro px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[risk.severity] || ''}`}>
                  {risk.severity.toUpperCase()}
                </span>
                <span className="text-[var(--text-secondary)]">{risk.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links Section */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
          <Link2 size={16} className="text-[var(--text-tertiary)]" />
          <h2 className="text-body font-semibold text-[var(--text-primary)]">GPO Links ({links.length})</h2>
        </div>
        {links.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.linkedOu')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.tier')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.linkOrder')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.enforced')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {links.map((link: any) => (
                  <tr key={link.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-micro text-[var(--text-primary)]">{link.linkedOu}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-micro px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE[link.adTierOfOu] || TIER_BADGE.unclassified}`}>
                        {link.adTierOfOu.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{link.linkOrder}</td>
                    <td className="px-4 py-2.5">
                      {link.enforced ? (
                        <span className="text-micro px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">Yes</span>
                      ) : (
                        <span className="text-micro text-[var(--text-tertiary)]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {link.linkEnabled ? (
                        <span className="text-micro px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">Yes</span>
                      ) : (
                        <span className="text-micro px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 font-medium">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-caption text-[var(--text-tertiary)]">{t('risks.unlinked')}</p>
        )}
      </div>

      {/* Permissions Section */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
          <Lock size={16} className="text-[var(--text-tertiary)]" />
          <h2 className="text-body font-semibold text-[var(--text-primary)]">{t('permissions')} ({permissions.length})</h2>
        </div>
        {permissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">Trustee</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.permission')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">{t('fields.dangerous')}</th>
                  <th className="text-start px-4 py-2.5 font-medium text-[var(--text-tertiary)]">Trustee Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {permissions.map((perm: any) => {
                  const trusteeTier = perm.identityTier || perm.groupTier || 'unknown'
                  return (
                    <tr key={perm.id} className={`hover:bg-[var(--bg-secondary)] transition-colors ${perm.dangerous ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text-primary)]">{perm.trusteeName}</p>
                        <p className="text-micro text-[var(--text-tertiary)]">
                          {perm.identityName || perm.groupName || ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{perm.permissionType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5">
                        {perm.dangerous ? (
                          <span className="text-micro px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">YES</span>
                        ) : (
                          <span className="text-micro text-[var(--text-tertiary)]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-micro px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE[trusteeTier] || TIER_BADGE.unclassified}`}>
                          {trusteeTier.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-caption text-[var(--text-tertiary)]">{tCommon('noData')}</p>
        )}
      </div>

      {/* Related Attack Paths */}
      {relatedPaths.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
            <Route size={16} className="text-[var(--text-tertiary)]" />
            <h2 className="text-body font-semibold text-[var(--text-primary)]">Related Attack Paths ({relatedPaths.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {relatedPaths.map((path: any) => (
              <div
                key={path.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/attack-paths/${path.id}`)}
              >
                <div>
                  <p className="text-caption font-medium text-[var(--text-primary)]">{path.attackTechnique}</p>
                  <p className="text-micro text-[var(--text-tertiary)]">Risk: {path.riskScore} | {path.pathLength} hops</p>
                </div>
                <ExternalLink size={14} className="text-[var(--text-tertiary)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline placeholder */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 text-center text-[var(--text-tertiary)]">
        <p className="text-caption">Modification history will be available when integrated with AD sync.</p>
        {gpo.modifiedInSourceAt && (
          <p className="text-micro mt-2">Last modified in source: {new Date(gpo.modifiedInSourceAt).toLocaleString()}</p>
        )}
        {gpo.createdInSourceAt && (
          <p className="text-micro">Created in source: {new Date(gpo.createdInSourceAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}
