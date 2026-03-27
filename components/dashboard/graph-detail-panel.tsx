'use client'

import { useMemo } from 'react'
import Link from 'next/link'

interface GraphDetailPanelProps {
  node: any | null
  links?: any[]
  allNodes?: any[]
  onClose: () => void
  isOpen: boolean
}

// ── Formatting helpers ──

function formatRelativeTime(val: string | null | undefined): string {
  if (!val) return '-'
  try {
    const date = new Date(val)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffDays > 365) return `${Math.floor(diffDays / 365)}y ago`
    if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHrs > 0) return `${diffHrs}h ago`
    if (diffMin > 0) return `${diffMin}m ago`
    return 'just now'
  } catch {
    return String(val)
  }
}

function formatAbsoluteDate(val: string | null | undefined): string {
  if (!val) return ''
  try {
    return new Date(val).toLocaleString()
  } catch {
    return String(val)
  }
}

function DateDisplay({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-[var(--text-tertiary)]">-</span>
  return (
    <span title={formatAbsoluteDate(value)} className="cursor-help underline decoration-dotted decoration-[var(--text-tertiary)]">
      {formatRelativeTime(value)}
    </span>
  )
}

function BoolBadge({ value, trueLabel, falseLabel }: { value?: boolean | null; trueLabel?: string; falseLabel?: string }) {
  if (value === undefined || value === null) return <span className="text-[var(--text-tertiary)]">-</span>
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
      value
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
      {value ? (trueLabel || 'Yes') : (falseLabel || 'No')}
    </span>
  )
}

function RiskScoreBar({ score }: { score?: number | null }) {
  if (score === undefined || score === null) return <span className="text-[var(--text-tertiary)]">-</span>
  let color = 'bg-green-500'
  let textColor = 'text-green-700 dark:text-green-400'
  if (score >= 80) { color = 'bg-red-500'; textColor = 'text-red-700 dark:text-red-400' }
  else if (score >= 60) { color = 'bg-orange-500'; textColor = 'text-orange-700 dark:text-orange-400' }
  else if (score >= 40) { color = 'bg-amber-500'; textColor = 'text-amber-700 dark:text-amber-400' }
  return (
    <div className="flex items-center gap-2 w-full">
      <span className={`text-sm font-bold ${textColor} min-w-[28px]`}>{score}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return <span className="text-[var(--text-tertiary)]">-</span>
  const colors: Record<string, string> = {
    tier_0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    tier_1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    tier_2: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    unclassified: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors[tier] || colors.unclassified}`}>
      {tier.replace('_', ' ').toUpperCase()}
    </span>
  )
}

function StatusDot({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[var(--text-tertiary)]">-</span>
  const dotColors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    disabled: 'bg-red-500',
    dormant: 'bg-yellow-500',
    orphaned: 'bg-purple-500',
    suspended: 'bg-orange-500',
    open: 'bg-red-500',
    acknowledged: 'bg-yellow-500',
    remediated: 'bg-green-500',
    excepted: 'bg-blue-500',
    false_positive: 'bg-gray-400',
    pending: 'bg-yellow-500',
    certified: 'bg-green-500',
    revoked: 'bg-red-500',
    expired: 'bg-orange-500',
    connected: 'bg-green-500',
    syncing: 'bg-blue-500',
    error: 'bg-red-500',
    disconnected: 'bg-gray-400',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dotColors[status] || 'bg-gray-400'}`} />
      <span className="text-xs capitalize">{status.replace(/_/g, ' ')}</span>
    </span>
  )
}

function PillBadges({ items }: { items?: (string | null | undefined)[] | null }) {
  if (!items || items.length === 0) return <span className="text-[var(--text-tertiary)]">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          {String(item).replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}

function SeverityBadge({ severity }: { severity?: string | null }) {
  if (!severity) return <span className="text-[var(--text-tertiary)]">-</span>
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  )
}

// ── Section and Row Components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <span className="flex-1 h-px bg-[var(--border-default)]" />
        {title}
        <span className="flex-1 h-px bg-[var(--border-default)]" />
      </h4>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-[var(--border-default)] last:border-0">
      <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 w-[120px]">{label}</span>
      <span className="text-[11px] text-[var(--text-primary)] text-end">{children}</span>
    </div>
  )
}

// ── Node Type Icons ──

function NodeTypeIcon({ type }: { type: string }) {
  const iconClass = 'w-5 h-5'
  switch (type) {
    case 'identity':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'resource':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
        </svg>
      )
    case 'group':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'violation':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    case 'account':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
  }
}

// ── Connected Edges ──

function ConnectedEdges({ nodeId, links, allNodes }: { nodeId: string; links: any[]; allNodes: any[] }) {
  const connected = useMemo(() => {
    if (!links || !allNodes) return []
    const nodeMap = new Map(allNodes.map(n => [n.id, n]))
    return links
      .filter(l => {
        const sid = typeof l.source === 'string' ? l.source : l.source?.id
        const tid = typeof l.target === 'string' ? l.target : l.target?.id
        return sid === nodeId || tid === nodeId
      })
      .map(l => {
        const sid = typeof l.source === 'string' ? l.source : l.source?.id
        const tid = typeof l.target === 'string' ? l.target : l.target?.id
        const otherId = sid === nodeId ? tid : sid
        const otherNode = nodeMap.get(otherId)
        const direction = sid === nodeId ? 'outgoing' : 'incoming'
        return { link: l, otherNode, direction }
      })
      .filter(c => c.otherNode)
  }, [nodeId, links, allNodes])

  if (connected.length === 0) return null

  return (
    <Section title="Connections">
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {connected.map((c, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
            <span className={`text-[var(--text-tertiary)] ${c.direction === 'outgoing' ? '' : 'rotate-180'}`}>
              &rarr;
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
              c.link.type === 'violation' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              c.link.type === 'entitlement' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
              c.link.type === 'membership' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              c.link.type === 'account' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {c.link.type}
            </span>
            <span className="text-[var(--text-primary)] truncate flex-1" title={c.otherNode.label}>
              {c.otherNode.label}
            </span>
            <span className="text-[var(--text-tertiary)] text-[9px] capitalize shrink-0">
              {c.otherNode.type}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Node Detail Sections ──

function IdentityDetails({ node, links, allNodes }: { node: any; links?: any[]; allNodes?: any[] }) {
  const p = node.properties || node
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl"
          style={{ background: p.type === 'human' || p.identityType === 'human' ? '#2563EB' : '#7C3AED' }}
        >
          {(p.displayName || p.label || '?')[0].toUpperCase()}
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{p.displayName || node.label}</h3>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.upn || ''}</p>
        <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
            p.type === 'human' || p.identityType === 'human'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          }`}>
            {(p.subType || p.type || '').replace(/_/g, ' ')}
          </span>
          <StatusDot status={p.status} />
        </div>
      </div>

      {/* Security */}
      <Section title="Security">
        <Row label="Risk Score"><RiskScoreBar score={p.riskScore} /></Row>
        <Row label="AD Tier"><TierBadge tier={p.adTier} /></Row>
        <Row label="Effective Tier"><TierBadge tier={p.effectiveTier} /></Row>
        <Row label="Tier Violation"><BoolBadge value={p.tierViolation} trueLabel="VIOLATION" falseLabel="Clean" /></Row>
        <Row label="Risk Factors"><PillBadges items={p.riskFactors} /></Row>
      </Section>

      {/* Identity Info */}
      <Section title="Identity Info">
        <Row label="Display Name">{p.displayName || '-'}</Row>
        <Row label="UPN">{p.upn || '-'}</Row>
        <Row label="Email">{p.email || '-'}</Row>
        <Row label="SAM Account">{p.samAccountName || '-'}</Row>
        <Row label="Department">{p.department || '-'}</Row>
        <Row label="Source System">{p.sourceSystem ? p.sourceSystem.replace(/_/g, ' ') : '-'}</Row>
      </Section>

      {/* Timeline */}
      <Section title="Timeline">
        <Row label="Last Logon"><DateDisplay value={p.lastLogonAt} /></Row>
        <Row label="Password Set"><DateDisplay value={p.passwordLastSetAt} /></Row>
        <Row label="Created in Src"><DateDisplay value={p.createdInSourceAt} /></Row>
        <Row label="Expiry"><DateDisplay value={p.expiryAt} /></Row>
        <Row label="Created"><DateDisplay value={p.createdAt} /></Row>
        <Row label="Updated"><DateDisplay value={p.updatedAt} /></Row>
      </Section>

      {/* Connected Edges */}
      {links && allNodes && (
        <ConnectedEdges nodeId={node.id} links={links} allNodes={allNodes} />
      )}

      <Link
        href={`/dashboard/identities/${node.id}`}
        className="block w-full text-center py-2.5 mt-4 text-xs font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        View Full Detail &rarr;
      </Link>
    </div>
  )
}

function ResourceDetails({ node, links, allNodes }: { node: any; links?: any[]; allNodes?: any[] }) {
  const p = node.properties || node
  return (
    <div className="space-y-0">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className="w-14 h-14 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg bg-[#5F6B7A]">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{p.name || node.label}</h3>
      </div>

      <Section title="Resource Info">
        <Row label="Name">{p.name || '-'}</Row>
        <Row label="Type"><span className="capitalize">{(p.resourceType || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="AD Tier"><TierBadge tier={p.adTier} /></Row>
        <Row label="Criticality"><SeverityBadge severity={p.criticality} /></Row>
        <Row label="Environment"><span className="capitalize">{(p.environment || '-').replace(/_/g, ' ')}</span></Row>
      </Section>

      {links && allNodes && (
        <ConnectedEdges nodeId={node.id} links={links} allNodes={allNodes} />
      )}
    </div>
  )
}

function GroupDetails({ node, links, allNodes }: { node: any; links?: any[]; allNodes?: any[] }) {
  const p = node.properties || node
  return (
    <div className="space-y-0">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className={`w-14 h-14 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg ${p.isPrivileged ? 'bg-red-600' : 'bg-[#CA8A04]'}`}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{p.name || node.label}</h3>
        {p.isPrivileged && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            PRIVILEGED
          </span>
        )}
      </div>

      <Section title="Group Info">
        <Row label="Name">{p.name || '-'}</Row>
        <Row label="Type"><span className="capitalize">{(p.groupType || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Scope"><span className="capitalize">{(p.scope || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="AD Tier"><TierBadge tier={p.groupTier || p.adTier} /></Row>
        <Row label="Privileged"><BoolBadge value={p.isPrivileged} /></Row>
        <Row label="Members">{p.memberCount ?? '-'}</Row>
        <Row label="Nested Groups">{p.nestedGroupCount ?? '-'}</Row>
      </Section>

      {links && allNodes && (
        <ConnectedEdges nodeId={node.id} links={links} allNodes={allNodes} />
      )}
    </div>
  )
}

function ViolationDetails({ node, links, allNodes }: { node: any; links?: any[]; allNodes?: any[] }) {
  const p = node.properties || node
  return (
    <div className="space-y-0">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className="w-14 h-14 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg bg-red-600">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)] capitalize">{(p.violationType || 'Violation').replace(/_/g, ' ')}</h3>
        <div className="flex gap-1.5 justify-center mt-2">
          <SeverityBadge severity={p.severity} />
          <StatusDot status={p.status} />
        </div>
      </div>

      <Section title="Violation Info">
        <Row label="Type"><span className="capitalize">{(p.violationType || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Severity"><SeverityBadge severity={p.severity} /></Row>
        <Row label="Status"><StatusDot status={p.status} /></Row>
        <Row label="Policy"><span className="text-[11px]">{p.policyName || '-'}</span></Row>
        <Row label="Policy Type"><span className="capitalize text-[11px]">{(p.policyType || '-').replace(/_/g, ' ')}</span></Row>
      </Section>

      <Section title="Timeline">
        <Row label="Detected"><DateDisplay value={p.detectedAt} /></Row>
        <Row label="Remediated"><DateDisplay value={p.remediatedAt} /></Row>
        {p.exceptionReason && (
          <Row label="Exception">{p.exceptionReason}</Row>
        )}
      </Section>

      {links && allNodes && (
        <ConnectedEdges nodeId={node.id} links={links} allNodes={allNodes} />
      )}
    </div>
  )
}

function AccountDetails({ node, links, allNodes }: { node: any; links?: any[]; allNodes?: any[] }) {
  const p = node.properties || node
  return (
    <div className="space-y-0">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className="w-14 h-14 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg bg-indigo-600">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{p.accountName || node.label}</h3>
        <div className="flex gap-1.5 justify-center mt-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            {(p.platform || '').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <Section title="Account Info">
        <Row label="Account Name">{p.accountName || '-'}</Row>
        <Row label="Platform"><span className="capitalize">{(p.platform || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Account Type"><span className="capitalize">{(p.accountType || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Enabled"><BoolBadge value={p.enabled} trueLabel="Enabled" falseLabel="Disabled" /></Row>
        <Row label="MFA Enabled"><BoolBadge value={p.mfaEnabled} trueLabel="MFA On" falseLabel="MFA Off" /></Row>
        <Row label="Privileged"><BoolBadge value={p.privileged} trueLabel="Privileged" falseLabel="Standard" /></Row>
      </Section>

      <Section title="Timeline">
        <Row label="Last Auth"><DateDisplay value={p.lastAuthenticatedAt} /></Row>
      </Section>

      {links && allNodes && (
        <ConnectedEdges nodeId={node.id} links={links} allNodes={allNodes} />
      )}
    </div>
  )
}

// ── Main Panel ──

export function GraphDetailPanel({ node, links, allNodes, onClose, isOpen }: GraphDetailPanelProps) {
  return (
    <div
      className={`fixed top-0 end-0 h-full w-[400px] bg-[var(--bg-primary)] border-s border-[var(--border-default)] shadow-xl z-40 transform transition-transform duration-200 ease-in-out overflow-y-auto ${
        isOpen && node ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {node && (
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
              <NodeTypeIcon type={node.type} />
              <span className="text-xs font-semibold uppercase tracking-wide capitalize">
                {node.type} Details
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {node.type === 'identity' && <IdentityDetails node={node} links={links} allNodes={allNodes} />}
          {node.type === 'resource' && <ResourceDetails node={node} links={links} allNodes={allNodes} />}
          {node.type === 'group' && <GroupDetails node={node} links={links} allNodes={allNodes} />}
          {node.type === 'violation' && <ViolationDetails node={node} links={links} allNodes={allNodes} />}
          {node.type === 'account' && <AccountDetails node={node} links={links} allNodes={allNodes} />}
        </div>
      )}
    </div>
  )
}
