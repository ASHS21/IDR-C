'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  ListChecks, X, Clipboard, Check, ShieldAlert, Clock, AlertTriangle,
  RotateCcw, CheckCircle2, TrendingUp, Circle,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/formatters'

type Status = 'no_action' | 'in_progress' | 'done' | 'accepted_risk'
type Severity = 'critical' | 'high' | 'medium' | 'low'

interface Issue {
  fsid: string; type: string; name: string; category: string; severity: Severity; impact: string
  mitre: string[]; certainty: string; privilege: string; ease: string
  affectedCount: number; exposurePoints: number; status: Status
  firstDetectedAt: string | null; lastSeenAt: string | null
}
interface IssueDetail {
  def: { fsid: string; name: string; category: string; severity: Severity; description: string
    mitre: string[]; certainty: string; privilege: string; ease: string
    mitigation: { summary: string; steps: string[]; script?: { lang: string; code: string } } }
  affectedCount: number; exposurePoints: number; status: Status; notes: string | null
  firstDetectedAt: string | null; lastSeenAt: string | null
  affected: { name: string; ref?: string }[]
  events: { type: string; affectedCount: number; detail: string | null; at: string }[]
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'text-[var(--color-critical)] bg-[var(--color-critical)]/10',
  high: 'text-[var(--color-high)] bg-[var(--color-high)]/10',
  medium: 'text-[var(--color-medium)] bg-[var(--color-medium)]/10',
  low: 'text-[var(--color-low)] bg-[var(--color-low)]/10',
}
const STATUS_STYLES: Record<Status, string> = {
  no_action: 'text-[var(--text-tertiary)] bg-[var(--bg-tertiary)]',
  in_progress: 'text-amber-600 bg-amber-500/10',
  done: 'text-emerald-600 bg-emerald-500/10',
  accepted_risk: 'text-purple-600 bg-purple-500/10',
}
const EVENT_META: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  first_detected: { icon: Circle, label: 'First detected', color: 'var(--color-high)' },
  risk_increased: { icon: TrendingUp, label: 'Risk increased', color: 'var(--color-critical)' },
  reappeared: { icon: RotateCcw, label: 'Reappeared', color: 'var(--color-high)' },
  partially_remediated: { icon: AlertTriangle, label: 'Partially remediated', color: 'var(--color-medium)' },
  fully_remediated: { icon: CheckCircle2, label: 'Fully remediated', color: 'var(--color-low)' },
  status_changed: { icon: Clock, label: 'Status changed', color: 'var(--text-tertiary)' },
}
const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

async function getJSON<T>(u: string): Promise<T> { const r = await fetch(u); if (!r.ok) throw new Error('failed'); return r.json() }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-xs flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function DetailPanel({ fsid, onClose }: { fsid: string; onClose: () => void }) {
  const qc = useQueryClient()
  const t = useTranslations('issues')
  const { data, isLoading } = useQuery({ queryKey: ['issue', fsid], queryFn: () => getJSON<IssueDetail>(`/api/issues/${fsid}`) })

  async function setStatus(status: Status) {
    await fetch(`/api/issues/${fsid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    qc.invalidateQueries({ queryKey: ['issue', fsid] })
    qc.invalidateQueries({ queryKey: ['issues'] })
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-xl h-full overflow-y-auto bg-[var(--bg-primary)] border-s border-[var(--border-primary)] shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        {isLoading || !data ? (
          <div className="h-40 animate-pulse" />
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">{data.def.fsid}</p>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{data.def.name}</h3>
              </div>
              <button onClick={onClose} className="text-[var(--text-tertiary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[data.def.severity]}`}>{data.def.severity}</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{humanize(data.def.category)}</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{data.affectedCount} {t('affected')}</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{data.exposurePoints} {t('exposurePts')}</span>
            </div>

            {/* status control */}
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{t('status')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(['no_action', 'in_progress', 'done', 'accepted_risk'] as Status[]).map((s) => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${data.status === s ? `${STATUS_STYLES[s]} border-current` : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                    {t(`status_${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-[var(--border-primary)] p-2"><p className="text-[var(--text-tertiary)]">{t('certainty')}</p><p className="text-[var(--text-primary)] capitalize">{data.def.certainty}</p></div>
              <div className="rounded-lg border border-[var(--border-primary)] p-2"><p className="text-[var(--text-tertiary)]">{t('privilege')}</p><p className="text-[var(--text-primary)] capitalize">{data.def.privilege}</p></div>
              <div className="rounded-lg border border-[var(--border-primary)] p-2"><p className="text-[var(--text-tertiary)]">{t('ease')}</p><p className="text-[var(--text-primary)] capitalize">{data.def.ease}</p></div>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">{data.def.description}</p>
            {data.def.mitre.length > 0 && (
              <div className="flex flex-wrap gap-1">{data.def.mitre.map((m) => <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">{m}</span>)}</div>
            )}

            {/* mitigation */}
            <div className="rounded-xl border border-[var(--border-primary)] p-3 space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t('mitigation')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{data.def.mitigation.summary}</p>
              {data.def.mitigation.steps.length > 0 && (
                <ol className="list-decimal ms-4 space-y-1 text-sm text-[var(--text-secondary)]">
                  {data.def.mitigation.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              )}
              {data.def.mitigation.script && (
                <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border-primary)]">
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{data.def.mitigation.script.lang}</span>
                    <CopyButton text={data.def.mitigation.script.code} />
                  </div>
                  <pre className="p-2.5 text-xs overflow-x-auto text-[var(--text-secondary)] whitespace-pre-wrap">{data.def.mitigation.script.code}</pre>
                </div>
              )}
            </div>

            {/* timeline */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t('timeline')}</p>
              {data.events.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">{t('noEvents')}</p> : (
                <ul className="space-y-2">
                  {data.events.map((e, i) => {
                    const m = EVENT_META[e.type] ?? EVENT_META.status_changed
                    const Icon = m.icon
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Icon className="w-4 h-4 mt-0.5" style={{ color: m.color }} />
                        <div>
                          <span className="text-[var(--text-primary)]">{m.label}</span>
                          {e.type !== 'fully_remediated' && <span className="text-[var(--text-tertiary)]"> · {e.affectedCount} affected</span>}
                          {e.detail && <span className="text-[var(--text-tertiary)]"> · {humanize(e.detail)}</span>}
                          <span className="block text-xs text-[var(--text-tertiary)]">{formatRelativeTime(new Date(e.at))}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* affected objects */}
            {data.affected.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t('affectedObjects')} ({data.affectedCount})</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-primary)] divide-y divide-[var(--border-primary)]">
                  {data.affected.map((a, i) => (
                    <div key={i} className="px-2.5 py-1.5 text-sm text-[var(--text-secondary)]">
                      {a.ref ? <a href={`/dashboard/identities/${a.ref}`} className="hover:underline">{a.name}</a> : a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function IssuesPage() {
  const t = useTranslations('issues')
  const { data, isLoading, error } = useQuery({ queryKey: ['issues'], queryFn: () => getJSON<{ issues: Issue[] }>('/api/issues') })
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')
  const [sevFilter, setSevFilter] = useState<'all' | Severity>('all')
  const [open, setOpen] = useState<string | null>(null)

  const issues = (data?.issues ?? []).filter((i) =>
    (statusFilter === 'all' || i.status === statusFilter) && (sevFilter === 'all' || i.severity === sevFilter))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-[var(--color-high)]" />{t('title')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'no_action', 'in_progress', 'done', 'accepted_risk'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-md border ${statusFilter === s ? 'border-[var(--color-high)] text-[var(--color-high)] bg-[var(--color-high)]/10' : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
            {s === 'all' ? t('all') : t(`status_${s}`)}
          </button>
        ))}
        <span className="w-px bg-[var(--border-primary)] mx-1" />
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
          <button key={s} onClick={() => setSevFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-md border capitalize ${sevFilter === s ? 'border-[var(--color-high)] text-[var(--color-high)] bg-[var(--color-high)]/10' : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
            {s === 'all' ? t('all') : s}
          </button>
        ))}
      </div>

      {isLoading && <div className="h-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] animate-pulse" />}
      {error && <div className="rounded-xl border border-[var(--color-critical)] bg-[var(--color-critical)]/10 p-6"><p className="text-[var(--color-critical)] font-medium">{t('failedToLoad')}</p></div>}

      {data && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)] border-b border-[var(--border-primary)]">
                <th className="px-4 py-2 font-medium">{t('colStatus')}</th>
                <th className="px-4 py-2 font-medium">{t('colIssue')}</th>
                <th className="px-4 py-2 font-medium">{t('colSeverity')}</th>
                <th className="px-4 py-2 font-medium">{t('colExposure')}</th>
                <th className="px-4 py-2 font-medium">{t('colCertainty')}</th>
                <th className="px-4 py-2 font-medium">{t('colEase')}</th>
                <th className="px-4 py-2 font-medium">{t('colAffected')}</th>
                <th className="px-4 py-2 font-medium">{t('colFirstSeen')}</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.fsid} onClick={() => setOpen(i.fsid)} className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[i.status]}`}>{t(`status_${i.status}`)}</span></td>
                  <td className="px-4 py-2.5"><div className="text-[var(--text-primary)]">{i.name}</div><div className="text-[10px] font-mono text-[var(--text-tertiary)]">{i.fsid}</div></td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLES[i.severity]}`}>{i.severity}</span></td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">{i.exposurePoints}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize">{i.certainty}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize">{i.ease}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{i.affectedCount}</td>
                  <td className="px-4 py-2.5 text-[var(--text-tertiary)]">{i.firstDetectedAt ? formatRelativeTime(new Date(i.firstDetectedAt)) : '—'}</td>
                </tr>
              ))}
              {issues.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--text-tertiary)]">{t('noIssues')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {open && <DetailPanel fsid={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
