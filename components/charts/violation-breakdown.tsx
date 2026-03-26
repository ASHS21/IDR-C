'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ViolationBreakdownProps {
  byType: Record<string, number>
}

const TYPE_LABELS: Record<string, string> = {
  tier_breach: 'Tier Breach',
  sod_conflict: 'SoD Conflict',
  excessive_privilege: 'Excessive Privilege',
  dormant_access: 'Dormant Access',
  orphaned_identity: 'Orphaned Identity',
  missing_mfa: 'Missing MFA',
  expired_certification: 'Expired Cert',
  password_age: 'Password Age',
}

export function ViolationBreakdown({ byType }: ViolationBreakdownProps) {
  const data = Object.entries(byType)
    .map(([type, count]) => ({
      type: TYPE_LABELS[type] || type,
      count: Number(count),
    }))
    .sort((a, b) => b.count - a.count)

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No violation data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ fontSize: 12, fill: '#64748b' }}
          width={95}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        />
        <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Count" />
      </BarChart>
    </ResponsiveContainer>
  )
}
