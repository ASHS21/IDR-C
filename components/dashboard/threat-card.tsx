'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Shield, AlertTriangle, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/formatters'

interface ThreatCardProps {
  threat: {
    id: string
    threatType: string
    severity: string
    status: string
    identityName?: string | null
    identityTier?: string | null
    killChainPhase: string
    confidence: number
    sourceIp?: string | null
    sourceLocation?: string | null
    mitreTechniqueIds?: string[] | null
    lastSeenAt: string
  }
  onInvestigate?: (id: string) => void
  onDismiss?: (id: string) => void
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--color-critical)',
  high: 'var(--color-warning)',
  medium: 'var(--color-info)',
  low: 'var(--color-success)',
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-s-[var(--color-critical)]',
  high: 'border-s-orange-500',
  medium: 'border-s-blue-500',
  low: 'border-s-green-500',
}

export function ThreatCard({ threat, onInvestigate, onDismiss }: ThreatCardProps) {
  const t = useTranslations('threats')
  const tSev = useTranslations('severity')

  return (
    <div className={`bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] border-s-4 ${SEVERITY_BORDER[threat.severity] || ''} p-4 hover:border-[var(--border-hover)] transition-colors`} style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Threat type + severity */}
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: SEVERITY_COLORS[threat.severity] }} />
            <Link
              href={`/dashboard/threats/${threat.id}`}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--color-info)] truncate"
            >
              {t(`threatTypes.${threat.threatType}`)}
            </Link>
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `color-mix(in srgb, ${SEVERITY_COLORS[threat.severity]} 15%, transparent)`,
                color: SEVERITY_COLORS[threat.severity],
              }}
            >
              {tSev(threat.severity)}
            </span>
          </div>

          {/* Identity + tier */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {threat.identityName || 'Unknown Identity'}
            </span>
            {threat.identityTier && threat.identityTier !== 'unclassified' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                {threat.identityTier.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">
              {t(`killChainPhases.${threat.killChainPhase}`)}
            </span>
            {threat.mitreTechniqueIds && threat.mitreTechniqueIds.length > 0 && (
              <span>{threat.mitreTechniqueIds[0]}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatRelativeTime(new Date(threat.lastSeenAt))}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${threat.confidence}%`,
                  backgroundColor: threat.confidence > 80
                    ? 'var(--color-critical)'
                    : threat.confidence > 60
                      ? 'var(--color-warning)'
                      : 'var(--color-info)',
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{threat.confidence}%</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {onInvestigate && (
            <button
              onClick={() => onInvestigate(threat.id)}
              className="text-[10px] px-2 py-1 rounded bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity"
            >
              {t('investigate')}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(threat.id)}
              className="text-[10px] px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {t('dismiss')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
