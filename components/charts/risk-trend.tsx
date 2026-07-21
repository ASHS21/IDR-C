'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART, axisProps, gridProps, AreaGradient, ChartTooltip, ChartFrame } from '@/components/ui/chart-theme'

interface RiskTrendProps {
  data: Array<{ date: string; avgRiskScore: number }>
}

export function RiskTrendChart({ data }: RiskTrendProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
        No trend data available
      </div>
    )
  }

  return (
    <ChartFrame height={256}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
          <AreaGradient id="riskTrendFill" color={CHART.accent} />
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} minTickGap={28} tickFormatter={(d) => String(d).slice(5)} />
          <YAxis domain={[0, 100]} width={30} {...axisProps} />
          <Tooltip
            cursor={{ stroke: 'var(--border-hover)', strokeWidth: 1 }}
            content={<ChartTooltip format={(p: any) => ({ name: 'Avg risk', value: Math.round(p.value) })} />}
          />
          <Area
            type="monotone"
            dataKey="avgRiskScore"
            stroke={CHART.accent}
            strokeWidth={2}
            fill="url(#riskTrendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: CHART.accent }}
            name="Avg Risk Score"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
