interface TierBadgeProps {
  tier: string
  effectiveTier?: string | null
  size?: 'xs' | 'sm' | 'md'
  showViolation?: boolean
}

const TIER_CONFIG: Record<string, { label: string; short: string; bg: string; text: string }> = {
  tier_0: { label: 'Tier 0', short: 'T0', bg: 'var(--color-critical)', text: '#fff' },
  tier_1: { label: 'Tier 1', short: 'T1', bg: 'var(--color-high)', text: '#fff' },
  tier_2: { label: 'Tier 2', short: 'T2', bg: 'var(--color-tier2)', text: '#fff' },
  unclassified: { label: 'Unclassified', short: '?', bg: 'var(--color-unclassified)', text: '#fff' },
}

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-micro px-2 py-0.5',
  md: 'text-caption px-2.5 py-1',
}

export function TierBadge({ tier, effectiveTier, size = 'sm', showViolation = true }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.unclassified
  const effectiveConfig = effectiveTier ? TIER_CONFIG[effectiveTier] : null
  const hasViolation = showViolation && effectiveTier && effectiveTier !== tier

  if (hasViolation && effectiveConfig) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${SIZE_CLASSES[size]} rounded-[var(--radius-badge)] font-medium border-2`}
        style={{ borderColor: 'var(--color-critical)', color: 'var(--color-critical)', backgroundColor: 'var(--color-critical-bg)' }}
      >
        <span className="line-through opacity-60">{config.short}</span>
        <span>→</span>
        <span>{effectiveConfig.short}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center ${SIZE_CLASSES[size]} rounded-[var(--radius-badge)] font-medium`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {size === 'xs' ? config.short : config.label}
    </span>
  )
}
