'use client'

import { useEffect, useState } from 'react'

interface RiskGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  animate?: boolean
}

const SIZES = { sm: 16, md: 120, lg: 180 }

function getColor(score: number): string {
  if (score >= 80) return 'var(--color-critical)'
  if (score >= 60) return 'var(--color-high)'
  if (score >= 30) return 'var(--color-medium)'
  return 'var(--color-low)'
}

function getLabel(score: number): string {
  if (score >= 80) return 'Critical Risk'
  if (score >= 60) return 'High Risk'
  if (score >= 30) return 'Medium Risk'
  return 'Low Risk'
}

export function RiskGauge({ score, size = 'md', label, animate = true }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(animate ? 0 : score)

  useEffect(() => {
    if (!animate) { setAnimatedScore(score); return }
    const duration = 700
    const start = performance.now()
    const run = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimatedScore(Math.round(eased * score))
      if (p < 1) requestAnimationFrame(run)
    }
    requestAnimationFrame(run)
  }, [score, animate])

  const color = getColor(score)

  // Compact variant for table cells
  if (size === 'sm') {
    return (
      <div
        className="inline-flex items-center justify-center rounded-full font-mono text-micro font-medium text-white"
        style={{ width: 28, height: 28, backgroundColor: color }}
        title={`Risk: ${score} — ${getLabel(score)}`}
      >
        {score}
      </div>
    )
  }

  const dim = SIZES[size]
  const strokeWidth = size === 'lg' ? 14 : 10
  const radius = (dim - strokeWidth) / 2
  const circumference = radius * Math.PI
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim / 2 + 24} viewBox={`0 0 ${dim} ${dim / 2 + 24}`}>
        {/* Track */}
        <path
          d={`M ${strokeWidth / 2} ${dim / 2} A ${radius} ${radius} 0 0 1 ${dim - strokeWidth / 2} ${dim / 2}`}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value */}
        <path
          d={`M ${strokeWidth / 2} ${dim / 2} A ${radius} ${radius} 0 0 1 ${dim - strokeWidth / 2} ${dim / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: animate ? 'stroke-dashoffset 0.7s ease-out' : 'none' }}
        />
        {/* Score text */}
        <text
          x={dim / 2}
          y={dim / 2 - 2}
          textAnchor="middle"
          className="font-mono"
          style={{ fontSize: size === 'lg' ? '2.25rem' : '1.75rem', fontWeight: 600, fill: 'var(--text-primary)' }}
        >
          {animatedScore}
        </text>
      </svg>
      <p className="text-caption text-[var(--text-secondary)]">{label || getLabel(score)}</p>
    </div>
  )
}
