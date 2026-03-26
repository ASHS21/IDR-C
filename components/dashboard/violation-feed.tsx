'use client'

import Link from 'next/link'
import { SEVERITY_CONFIG } from '@/lib/utils/constants'
import { formatRelativeTime } from '@/lib/utils/formatters'
import type { ViolationListItem } from '@/lib/hooks/use-violations'

interface ViolationFeedProps {
  violations: ViolationListItem[]
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  remediated: 'bg-green-100 text-green-700',
  excepted: 'bg-blue-100 text-blue-700',
  false_positive: 'bg-slate-100 text-slate-600',
}

export function ViolationFeed({ violations }: ViolationFeedProps) {
  if (violations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">No violations found</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Identity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Policy</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Detected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {violations.map((v) => {
            const sevConfig = SEVERITY_CONFIG[v.severity as keyof typeof SEVERITY_CONFIG]
            return (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-700 text-xs capitalize">
                  {v.violationType.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ color: sevConfig?.color, backgroundColor: sevConfig?.bgColor }}
                  >
                    {sevConfig?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[v.status] || ''}`}>
                    {v.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {v.identityId ? (
                    <Link
                      href={`/dashboard/identities/${v.identityId}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {v.identityName}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{v.policyName}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatRelativeTime(v.detectedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
