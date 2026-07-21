'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowRight, Shield, ShieldAlert, Server, Clock, Loader2, Info } from 'lucide-react'
import { StatTile } from '@/components/ui/stat-tile'
import { StatTileSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

interface Session {
  id: string
  identityId: string
  identityName: string
  identityType: string
  identitySubType: string
  identityRisk: number | null
  hostName: string
  hostType: string
  logonType: string
  privileged: boolean
  sourceHost: string | null
  sourceIp: string | null
  startedAt: string
  lastSeenAt: string
  anomalous: boolean
  anomalyReason: string | null
}
interface Resp { sessions: Session[]; summary: { active: number; anomalous: number; privileged: number; hosts: number; identities: number } }

const LOGON_LABEL: Record<string, string> = {
  interactive: 'Console', remote_interactive: 'RDP', network: 'Network', service: 'Service', batch: 'Batch', unlock: 'Unlock',
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function initials(name: string) {
  return name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default function Tier0LivePage() {
  const tNav = useTranslations('nav')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<Resp>({
    queryKey: ['tier0-sessions'],
    queryFn: async () => {
      const res = await fetch('/api/tier0/sessions')
      if (!res.ok) throw new Error('Failed to load sessions')
      return res.json()
    },
    refetchInterval: 12_000,
  })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with live indicator */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-title text-[var(--text-primary)]">{tNav('tier0Live')}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-critical)]/30 bg-[var(--color-critical)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-critical)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-critical)] opacity-70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-critical)]" />
              </span>
              Live
            </span>
          </div>
          <p className="text-caption text-[var(--text-secondary)] mt-1">Active logon sessions on Tier 0 infrastructure — Domain Controllers, AD DS, PKI.</p>
        </div>
        <div className="flex items-center gap-1.5 text-micro text-[var(--text-tertiary)] tabular-nums">
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
          {dataUpdatedAt ? `Updated ${ago(new Date(dataUpdatedAt).toISOString(), now)} ago` : 'Updating…'}
        </div>
      </div>

      {/* Preview / collector notice */}
      <div className="flex items-start gap-2 rounded-lg border border-[var(--color-medium)]/40 bg-[var(--color-medium)]/10 px-3 py-2 text-sm text-[var(--text-secondary)]">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-medium)]" />
        <span><span className="font-medium text-[var(--text-primary)]">Preview — session collector not yet enabled.</span> A live feed requires logon telemetry (Windows Security 4624/4672) or an EDR session collector. Data shown here is sample only.</span>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <StatTileSkeleton key={i} />)}</div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Active on Tier 0" value={data.summary.active} severity={data.summary.active > 0 ? 'high' : 'low'} hint="live sessions" />
          <StatTile label="Anomalous" value={data.summary.anomalous} severity={data.summary.anomalous > 0 ? 'critical' : 'low'} hint="flagged sessions" />
          <StatTile label="Privileged logons" value={data.summary.privileged} severity={data.summary.privileged > 0 ? 'high' : 'low'} hint="admin (4672)" />
          <StatTile label="Hosts occupied" value={data.summary.hosts} severity="neutral" hint="Tier 0 assets in use" />
        </div>
      ) : null}

      {/* Session list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] animate-pulse" />)}</div>
      ) : error ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]"><ErrorState onRetry={() => refetch()} /></div>
      ) : data && data.sessions.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <EmptyState icon="default" title="No active Tier 0 sessions" description="No identity is currently logged on to Tier 0 infrastructure. This view refreshes automatically." />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.sessions.map((s) => {
            const isNhi = s.identityType === 'non_human'
            return (
              <div
                key={s.id}
                className="relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-card)] border bg-[var(--bg-primary)] p-3.5 pl-4"
                style={{ boxShadow: 'var(--shadow-card)', borderColor: s.anomalous ? 'var(--color-critical)' : 'var(--border-default)' }}
              >
                <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: s.anomalous ? 'var(--color-critical)' : s.privileged ? 'var(--color-high)' : 'var(--color-tier2)' }} />

                {/* who */}
                <div className="flex min-w-0 items-center gap-3" style={{ flexBasis: '30%' }}>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: isNhi ? 'var(--color-nhi)' : 'var(--color-human)' }}>
                    {initials(s.identityName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{s.identityName}</p>
                    <p className="truncate text-[11px] text-[var(--text-tertiary)] capitalize">{s.identitySubType?.replace(/_/g, ' ')}{s.identityRisk != null ? ` · risk ${s.identityRisk}` : ''}</p>
                  </div>
                </div>

                {/* → host */}
                <ArrowRight className="hidden h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)] sm:block rtl:rotate-180" />
                <div className="flex min-w-0 items-center gap-2" style={{ flexBasis: '22%' }}>
                  <Server className="h-4 w-4 flex-shrink-0 text-[var(--color-critical)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{s.hostName}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-critical)]">Tier 0</p>
                  </div>
                </div>

                {/* how */}
                <div className="hidden items-center gap-2 md:flex" style={{ flexBasis: '20%' }}>
                  <span className="rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">{LOGON_LABEL[s.logonType] ?? s.logonType}</span>
                  {s.privileged && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-high)]" title="Privileged / admin logon (event 4672)"><Shield className="h-3 w-3" /> admin</span>
                  )}
                </div>

                {/* from + when */}
                <div className="ms-auto flex flex-col items-end gap-0.5 text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-[var(--text-primary)]"><Clock className="h-3 w-3 text-[var(--text-tertiary)]" />{ago(s.startedAt, now)}</span>
                  {s.sourceHost && <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">from {s.sourceHost}{s.sourceIp ? ` · ${s.sourceIp}` : ''}</span>}
                </div>

                {s.anomalous && s.anomalyReason && (
                  <div className="absolute bottom-1.5 start-4 hidden items-center gap-1 text-[11px] font-medium text-[var(--color-critical)] lg:flex">
                    <ShieldAlert className="h-3 w-3" /> {s.anomalyReason}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
