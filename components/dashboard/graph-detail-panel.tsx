'use client'

import Link from 'next/link'

interface GraphDetailPanelProps {
  node: any | null
  onClose: () => void
  isOpen: boolean
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '-'
  try {
    return new Date(val).toLocaleString()
  } catch {
    return String(val)
  }
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-[var(--text-tertiary)]">-</span>
  const colors: Record<string, string> = {
    tier_0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    tier_1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    tier_2: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    unclassified: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[tier] || colors.unclassified}`}>
      {tier.replace('_', ' ').toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-[var(--text-tertiary)]">-</span>
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    disabled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    dormant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    orphaned: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    suspended: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.inactive}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type, subType }: { type?: string; subType?: string }) {
  const label = subType ? subType.replace(/_/g, ' ') : type || '-'
  const isHuman = type === 'human'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${isHuman ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
      {label}
    </span>
  )
}

function RiskScoreDisplay({ score }: { score?: number }) {
  if (score === undefined || score === null) return <span className="text-[var(--text-tertiary)]">-</span>
  let color = 'text-green-600'
  if (score >= 80) color = 'text-red-600'
  else if (score >= 60) color = 'text-orange-500'
  else if (score >= 40) color = 'text-yellow-600'
  return <span className={`text-lg font-bold ${color}`}>{score}</span>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-[var(--border-default)] last:border-0">
      <span className="text-xs text-[var(--text-tertiary)] shrink-0 w-28">{label}</span>
      <span className="text-xs text-[var(--text-primary)] text-right">{children}</span>
    </div>
  )
}

function IdentityDetails({ node }: { node: any }) {
  const props = node.properties || node
  return (
    <div className="space-y-3">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
          style={{ background: props.identityType === 'human' || props.type === 'human' ? '#2563EB' : '#7C3AED' }}>
          {(props.displayName || props.label || '?')[0].toUpperCase()}
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{props.displayName || props.label}</h3>
        <div className="flex gap-1.5 justify-center mt-1.5">
          <TypeBadge type={props.identityType || props.type} subType={props.subType} />
          <StatusBadge status={props.status} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Risk</h4>
        <div className="flex items-center gap-3 mb-1">
          <RiskScoreDisplay score={props.riskScore} />
          {props.tierViolation && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              TIER VIOLATION
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <TierBadge tier={props.adTier} />
          {props.effectiveTier && props.effectiveTier !== props.adTier && (
            <>
              <span className="text-xs text-[var(--text-tertiary)]">&rarr;</span>
              <TierBadge tier={props.effectiveTier} />
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Details</h4>
        <Row label="UPN">{props.upn || '-'}</Row>
        <Row label="Email">{props.email || '-'}</Row>
        <Row label="SAM Account">{props.samAccountName || '-'}</Row>
        <Row label="Department">{props.department || '-'}</Row>
        <Row label="Source">{props.sourceSystem ? props.sourceSystem.replace(/_/g, ' ') : '-'}</Row>
        <Row label="Last Logon">{formatDate(props.lastLogonAt)}</Row>
        <Row label="Created">{formatDate(props.createdAt)}</Row>
      </div>

      <Link
        href={`/dashboard/identities/${node.id}`}
        className="block w-full text-center py-2 mt-2 text-xs font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        View Detail &rarr;
      </Link>
    </div>
  )
}

function ResourceDetails({ node }: { node: any }) {
  const props = node.properties || node
  return (
    <div className="space-y-3">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className="w-12 h-12 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg bg-[#5F6B7A]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{props.name || props.label}</h3>
      </div>

      <div>
        <Row label="Type"><span className="capitalize">{(props.resourceType || props.subType || props.type || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Tier"><TierBadge tier={props.resourceTier || props.adTier || props.tier} /></Row>
        <Row label="Criticality">
          <span className="capitalize">{props.criticality || '-'}</span>
        </Row>
        <Row label="Environment">
          <span className="capitalize">{props.environment || '-'}</span>
        </Row>
        <Row label="Owner">{props.ownerName || '-'}</Row>
      </div>
    </div>
  )
}

function GroupDetails({ node }: { node: any }) {
  const props = node.properties || node
  return (
    <div className="space-y-3">
      <div className="text-center pb-3 border-b border-[var(--border-default)]">
        <div className={`w-12 h-12 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg ${props.isPrivileged ? 'bg-red-600' : 'bg-[#CA8A04]'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">{props.name || props.label}</h3>
        {props.isPrivileged && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            PRIVILEGED
          </span>
        )}
      </div>

      <div>
        <Row label="Type"><span className="capitalize">{(props.groupType || props.subType || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Scope"><span className="capitalize">{(props.scope || '-').replace(/_/g, ' ')}</span></Row>
        <Row label="Tier"><TierBadge tier={props.groupTier || props.adTier || props.tier} /></Row>
        <Row label="Members">{props.memberCount ?? '-'}</Row>
        <Row label="Nested Groups">{props.nestedGroupCount ?? '-'}</Row>
      </div>
    </div>
  )
}

export function GraphDetailPanel({ node, onClose, isOpen }: GraphDetailPanelProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-[var(--bg-primary)] border-l border-[var(--border-default)] shadow-xl z-40 transform transition-transform duration-200 ease-in-out overflow-y-auto ${
        isOpen && node ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {node && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
              {node.type} Details
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {node.type === 'identity' && <IdentityDetails node={node} />}
          {node.type === 'resource' && <ResourceDetails node={node} />}
          {node.type === 'group' && <GroupDetails node={node} />}
        </div>
      )}
    </div>
  )
}
