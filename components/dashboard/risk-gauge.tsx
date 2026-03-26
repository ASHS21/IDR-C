'use client'

interface RiskGaugeProps {
  value: number // 0-100
  label: string
  size?: number
}

function getColor(value: number): string {
  if (value >= 75) return '#16a34a'
  if (value >= 50) return '#ca8a04'
  if (value >= 25) return '#ea580c'
  return '#dc2626'
}

export function RiskGauge({ value, label, size = 160 }: RiskGaugeProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * Math.PI // semi-circle
  const offset = circumference - (value / 100) * circumference
  const color = getColor(value)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          className="fill-slate-900 text-3xl font-bold"
          style={{ fontSize: '2rem' }}
        >
          {value}%
        </text>
      </svg>
      <p className="text-sm font-medium text-slate-600 -mt-1">{label}</p>
    </div>
  )
}
