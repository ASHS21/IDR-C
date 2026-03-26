import { AD_TIER_CONFIG } from '@/lib/utils/constants'

interface TierPyramidProps {
  tierCounts: Record<string, number>
  total: number
}

export function TierPyramid({ tierCounts, total }: TierPyramidProps) {
  const tiers = [
    { key: 'tier_0', count: tierCounts.tier_0 || 0 },
    { key: 'tier_1', count: tierCounts.tier_1 || 0 },
    { key: 'tier_2', count: tierCounts.tier_2 || 0 },
  ]

  const maxCount = Math.max(...tiers.map(t => t.count), 1)

  return (
    <div className="space-y-3">
      {tiers.map((tier, idx) => {
        const config = AD_TIER_CONFIG[tier.key as keyof typeof AD_TIER_CONFIG]
        const widthPercent = Math.max(20, (tier.count / maxCount) * 100)
        const pct = total > 0 ? ((tier.count / total) * 100).toFixed(1) : '0'

        return (
          <div key={tier.key} className="flex items-center gap-4">
            <div className="w-20 text-right">
              <span className="text-xs font-semibold" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            <div className="flex-1">
              <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center px-3"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: config.bgColor,
                    borderLeft: `4px solid ${config.color}`,
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: config.color }}>
                    {tier.count}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-14 text-right">
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>
          </div>
        )
      })}

      {(tierCounts.unclassified || 0) > 0 && (
        <div className="flex items-center gap-4">
          <div className="w-20 text-right">
            <span className="text-xs font-semibold text-slate-400">Unclassified</span>
          </div>
          <div className="flex-1">
            <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg bg-slate-200 border-l-4 border-slate-400 flex items-center px-3"
                style={{ width: `${Math.max(20, ((tierCounts.unclassified || 0) / maxCount) * 100)}%` }}
              >
                <span className="text-sm font-bold text-slate-500">{tierCounts.unclassified}</span>
              </div>
            </div>
          </div>
          <div className="w-14 text-right">
            <span className="text-xs text-slate-500">
              {total > 0 ? (((tierCounts.unclassified || 0) / total) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
