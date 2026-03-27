'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Shield, AlertTriangle, Clock, MapPin, Globe,
  Server, Brain, Loader2, ExternalLink,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/formatters'

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-warning)',
  medium: 'var(--color-info)',
  low: 'var(--color-success)',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-critical)',
  investigating: 'var(--color-warning)',
  contained: 'var(--color-info)',
  resolved: 'var(--color-success)',
  false_positive: 'var(--text-muted)',
}

export default function ThreatDetailPage() {
  const t = useTranslations('threats')
  const tSev = useTranslations('severity')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<any>(null)
  const [triage, setTriage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [triageLoading, setTriageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchThreat = useCallback(async () => {
    try {
      const res = await fetch(`/api/threats/${id}`)
      if (!res.ok) throw new Error('Not found')
      const d = await res.json()
      setData(d)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchThreat() }, [fetchThreat])

  const handleTriage = useCallback(async () => {
    setTriageLoading(true)
    try {
      const res = await fetch(`/api/threats/${id}/triage`, { method: 'POST' })
      if (!res.ok) throw new Error('Triage failed')
      const d = await res.json()
      setTriage(d)
    } catch {
      setTriage({ assessment: 'Triage failed. Please try again.', recommendations: [] })
    } finally {
      setTriageLoading(false)
    }
  }, [id])

  const handleStatusChange = useCallback(async (status: string) => {
    try {
      await fetch(`/api/threats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchThreat()
    } catch { /* ignore */ }
  }, [id, fetchThreat])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded animate-pulse" />
        <div className="h-64 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/threats" className="flex items-center gap-2 text-sm text-[var(--color-info)] hover:underline">
          <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t('backToThreats')}
        </Link>
        <div className="bg-[var(--color-critical-bg)] border border-[var(--color-critical)] rounded-xl p-6">
          <p className="font-medium" style={{ color: 'var(--color-critical)' }}>{t('threatNotFound')}</p>
        </div>
      </div>
    )
  }

  const { threat, identity, detectionRule } = data

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/dashboard/threats" className="flex items-center gap-2 text-sm text-[var(--color-info)] hover:underline">
        <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t('backToThreats')}
      </Link>

      {/* Header card */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle size={20} style={{ color: SEVERITY_COLORS[threat.severity] }} />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {t(`threatTypes.${threat.threatType}`)}
              </h2>
              <span
                className="text-xs font-bold uppercase px-2 py-1 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${SEVERITY_COLORS[threat.severity]} 15%, transparent)`,
                  color: SEVERITY_COLORS[threat.severity],
                }}
              >
                {tSev(threat.severity)}
              </span>
              <span
                className="text-xs font-medium px-2 py-1 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[threat.status] || 'gray'} 15%, transparent)`,
                  color: STATUS_COLORS[threat.status],
                }}
              >
                {t(`statuses.${threat.status}`)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
              {identity && (
                <Link href={`/dashboard/identities/${identity.id}`} className="hover:text-[var(--color-info)]">
                  {identity.displayName}
                </Link>
              )}
              {identity?.adTier && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">
                  {identity.adTier.replace('_', ' ').toUpperCase()}
                </span>
              )}
              {identity?.riskScore !== undefined && (
                <span className="text-xs">Risk: {identity.riskScore}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {threat.status === 'active' && (
              <button
                onClick={() => handleStatusChange('investigating')}
                className="text-xs px-3 py-2 rounded bg-[var(--color-warning)] text-white hover:opacity-90"
              >
                {t('investigate')}
              </button>
            )}
            {(threat.status === 'active' || threat.status === 'investigating') && (
              <button
                onClick={() => handleStatusChange('contained')}
                className="text-xs px-3 py-2 rounded bg-[var(--color-info)] text-white hover:opacity-90"
              >
                {t('contain')}
              </button>
            )}
            {threat.status !== 'resolved' && threat.status !== 'false_positive' && (
              <>
                <button
                  onClick={() => handleStatusChange('resolved')}
                  className="text-xs px-3 py-2 rounded bg-[var(--color-success)] text-white hover:opacity-90"
                >
                  {t('resolve')}
                </button>
                <button
                  onClick={() => handleStatusChange('false_positive')}
                  className="text-xs px-3 py-2 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {t('falsePositive')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">{t('killChainPhaseLabel')}</span>
            <p className="font-medium text-[var(--text-primary)]">{t(`killChainPhases.${threat.killChainPhase}`)}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t('confidenceLabel')}</span>
            <p className="font-medium text-[var(--text-primary)]">{threat.confidence}%</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t('firstSeen')}</span>
            <p className="font-medium text-[var(--text-primary)]">{formatRelativeTime(new Date(threat.firstSeenAt))}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">{t('lastSeen')}</span>
            <p className="font-medium text-[var(--text-primary)]">{formatRelativeTime(new Date(threat.lastSeenAt))}</p>
          </div>
          {threat.sourceIp && (
            <div>
              <span className="text-[var(--text-muted)]">{t('sourceIp')}</span>
              <p className="font-medium text-[var(--text-primary)]">{threat.sourceIp}</p>
            </div>
          )}
          {threat.sourceLocation && (
            <div>
              <span className="text-[var(--text-muted)]">{t('sourceLocation')}</span>
              <p className="font-medium text-[var(--text-primary)]">{threat.sourceLocation}</p>
            </div>
          )}
          {threat.targetResource && (
            <div>
              <span className="text-[var(--text-muted)]">{t('targetResourceLabel')}</span>
              <p className="font-medium text-[var(--text-primary)]">{threat.targetResource}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('evidence')}</h3>
          {threat.evidence ? (
            <div className="space-y-3">
              {(threat.evidence as any).summary && (
                <p className="text-sm text-[var(--text-primary)]">{(threat.evidence as any).summary}</p>
              )}
              {(threat.evidence as any).eventIds && (
                <div>
                  <span className="text-xs text-[var(--text-muted)]">{t('relatedEvents')}: {(threat.evidence as any).eventIds.length}</span>
                </div>
              )}
              <pre className="text-xs bg-[var(--bg-secondary)] rounded p-3 overflow-auto max-h-48 text-[var(--text-secondary)]">
                {JSON.stringify(threat.evidence, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{t('noEvidence')}</p>
          )}
        </div>

        {/* MITRE ATT&CK */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('mitreAttack')}</h3>
          {threat.mitreTechniqueIds && threat.mitreTechniqueIds.length > 0 ? (
            <div className="space-y-2">
              {threat.mitreTechniqueIds.map((techId: string) => (
                <a
                  key={techId}
                  href={`https://attack.mitre.org/techniques/${techId.replace('.', '/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--color-info)] hover:underline"
                >
                  <ExternalLink size={12} />
                  {techId}
                  {threat.mitreTechniqueName && ` - ${threat.mitreTechniqueName}`}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{tCommon('na')}</p>
          )}

          {detectionRule && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <h4 className="text-xs font-medium text-[var(--text-muted)] mb-1">{t('detectionRule')}</h4>
              <p className="text-sm text-[var(--text-primary)]">{detectionRule.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{detectionRule.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Triage */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <Brain size={16} /> {t('aiTriage')}
          </h3>
          {!triage && (
            <button
              onClick={handleTriage}
              disabled={triageLoading}
              className="text-xs px-3 py-1.5 rounded bg-[var(--color-info)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
            >
              {triageLoading && <Loader2 size={12} className="animate-spin" />}
              {triageLoading ? t('triaging') : t('runTriage')}
            </button>
          )}
        </div>

        {triage ? (
          <div className="space-y-4">
            {/* Assessment */}
            {(triage.assessment || triage.narrative) && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] mb-1">{t('assessment')}</h4>
                <p className="text-sm text-[var(--text-primary)]">{triage.assessment || triage.narrative}</p>
              </div>
            )}

            {/* Recommendations */}
            {triage.recommendations && triage.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">{t('recommendations')}</h4>
                <ul className="space-y-1">
                  {triage.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--color-info)] mt-1">-</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Containment */}
            {triage.containmentSteps && triage.containmentSteps.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">{t('containmentSteps')}</h4>
                <ul className="space-y-1">
                  {triage.containmentSteps.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="font-mono text-[var(--color-warning)]">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Investigation steps */}
            {triage.investigationSteps && triage.investigationSteps.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">{t('investigationSteps')}</h4>
                <ul className="space-y-1">
                  {triage.investigationSteps.map((step: string, i: number) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="font-mono text-[var(--color-info)]">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t('triageHint')}</p>
        )}
      </div>
    </div>
  )
}
