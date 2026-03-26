interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  trend?: { value: number; direction: 'up' | 'down' | 'stable' }
  color?: 'default' | 'red' | 'orange' | 'green' | 'blue'
}

const COLOR_MAP = {
  default: 'bg-white',
  red: 'bg-white border-l-4 border-l-red-500',
  orange: 'bg-white border-l-4 border-l-orange-500',
  green: 'bg-white border-l-4 border-l-green-500',
  blue: 'bg-white border-l-4 border-l-blue-500',
}

export function MetricCard({ label, value, subtitle, trend, color = 'default' }: MetricCardProps) {
  return (
    <div className={`${COLOR_MAP[color]} rounded-xl border border-slate-200 p-6 shadow-sm`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.direction === 'down' ? 'text-green-600' :
              trend.direction === 'up' ? 'text-red-600' :
              'text-slate-500'
            }`}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            {' '}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  )
}
