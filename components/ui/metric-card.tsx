'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number | string
  previousValue?: number
  trend?: 'up' | 'down' | 'flat'
  trendIsPositive?: boolean // true = up is good (compliance), false = up is bad (violations)
  severity?: 'critical' | 'high' | 'medium' | 'low'
  href?: string
  loading?: boolean
}

const SEVERITY_STYLES = {
  critical: 'border-l-[var(--color-critical)]',
  high: 'border-l-[var(--color-high)]',
  medium: 'border-l-[var(--color-medium)]',
  low: 'border-l-[var(--color-low)]',
}

export function MetricCard({
  label, value, previousValue, trend, trendIsPositive = false,
  severity, href, loading,
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof value !== 'number') return
    const duration = 300
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 animate-pulse" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] mb-3" />
        <div className="h-8 w-16 rounded bg-[var(--bg-tertiary)]" />
      </div>
    )
  }

  const trendDelta = previousValue && typeof value === 'number'
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : null

  const Wrapper = href ? 'a' : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`
        block rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5
        ${severity ? `border-l-[3px] ${SEVERITY_STYLES[severity]}` : ''}
        ${href ? 'cursor-pointer hover:border-[var(--border-hover)] transition-colors' : ''}
      `}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-caption text-[var(--text-secondary)] font-medium uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-hero text-[var(--text-primary)] animate-count-up">
          {typeof value === 'number' ? displayValue : value}
        </p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-micro font-medium ${
            (trend === 'up' && trendIsPositive) || (trend === 'down' && !trendIsPositive)
              ? 'text-[var(--color-low)]'
              : (trend === 'up' && !trendIsPositive) || (trend === 'down' && trendIsPositive)
                ? 'text-[var(--color-critical)]'
                : 'text-[var(--text-tertiary)]'
          }`}>
            {trend === 'up' && <TrendingUp size={14} />}
            {trend === 'down' && <TrendingDown size={14} />}
            {trend === 'flat' && <Minus size={14} />}
            {trendDelta !== null && `${Math.abs(trendDelta)}%`}
          </span>
        )}
      </div>
    </Wrapper>
  )
}
