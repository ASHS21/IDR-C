'use client'

import Link from 'next/link'
import { AD_TIER_CONFIG, IDENTITY_STATUS_CONFIG, getRiskLevel } from '@/lib/utils/constants'
import { formatRelativeTime } from '@/lib/utils/formatters'
import type { IdentityListItem } from '@/lib/hooks/use-identities'

interface IdentityTableProps {
  data: IdentityListItem[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (column: string) => void
}

const COLUMNS = [
  { key: 'displayName', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'subType', label: 'Sub-type', sortable: true },
  { key: 'adTier', label: 'AD Tier', sortable: true },
  { key: 'riskScore', label: 'Risk', sortable: true },
  { key: 'velocity', label: 'Velocity', sortable: true },
  { key: 'quality', label: 'Quality', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'sourceSystem', label: 'Source', sortable: true },
  { key: 'lastLogonAt', label: 'Last Logon', sortable: true },
]

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: string }) {
  if (column !== sortBy) return <span className="text-slate-300 ml-1">↕</span>
  return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

function formatSource(source: string): string {
  return source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatSubType(subType: string): string {
  return subType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function IdentityTable({ data, sortBy, sortOrder, onSort }: IdentityTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        No identities found matching your filters
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                }`}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.label}
                {col.sortable && <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((identity) => {
            const tierConfig = AD_TIER_CONFIG[identity.adTier as keyof typeof AD_TIER_CONFIG]
            const statusConfig = IDENTITY_STATUS_CONFIG[identity.status as keyof typeof IDENTITY_STATUS_CONFIG]
            const risk = getRiskLevel(identity.riskScore)

            return (
              <tr key={identity.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/identities/${identity.id}`}
                    className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {identity.displayName}
                  </Link>
                  {identity.email && (
                    <p className="text-xs text-slate-400 mt-0.5">{identity.email}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-base mr-1">{identity.type === 'human' ? '👤' : '🤖'}</span>
                  <span className="text-slate-600">{identity.type === 'human' ? 'Human' : 'NHI'}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatSubType(identity.subType)}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ color: tierConfig?.color, backgroundColor: tierConfig?.bgColor }}
                  >
                    {tierConfig?.label}
                  </span>
                  {identity.tierViolation && (
                    <span className="ml-1 text-xs text-red-600 font-bold" title="Tier Violation">!</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold" style={{ color: risk.color }}>
                    {identity.riskScore}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const rf = (identity as any).riskFactors as { riskVelocity?: number } | null
                    const velocity = rf?.riskVelocity ?? 0
                    if (velocity > 0.5) {
                      return (
                        <span className="text-xs font-medium text-red-600 flex items-center gap-0.5" title={`+${velocity}/day`}>
                          <span>↑</span> {velocity.toFixed(2)}
                        </span>
                      )
                    }
                    if (velocity < -0.5) {
                      return (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-0.5" title={`${velocity}/day`}>
                          <span>↓</span> {velocity.toFixed(2)}
                        </span>
                      )
                    }
                    return (
                      <span className="text-xs text-slate-400" title="Stable">—</span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const dq = (identity as any).dataQuality as { score?: number } | null
                    const score = dq?.score
                    if (score == null) return <span className="inline-block w-full h-1.5 rounded-full bg-slate-200" title="Unscored" />
                    const color = score > 80 ? '#22c55e' : score > 50 ? '#f59e0b' : '#ef4444'
                    return (
                      <div className="flex items-center gap-1.5" title={`Quality: ${score}/100`}>
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-xs text-slate-500">{score}</span>
                      </div>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ color: statusConfig?.color, backgroundColor: `${statusConfig?.color}15` }}
                  >
                    {statusConfig?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{formatSource(identity.sourceSystem)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {identity.lastLogonAt ? formatRelativeTime(identity.lastLogonAt) : 'Never'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
