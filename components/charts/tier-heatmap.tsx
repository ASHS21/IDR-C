import { AD_TIER_CONFIG } from '@/lib/utils/constants'

interface TierHeatmapProps {
  heatmap: Record<string, Record<string, number>>
}

const TIERS = ['tier_0', 'tier_1', 'tier_2'] as const
const TIER_LABELS = { tier_0: 'T0', tier_1: 'T1', tier_2: 'T2' }

function getCellColor(identityTier: string, accessTier: string, count: number): string {
  if (count === 0) return '#f8fafc'

  const tierNum = (t: string) => t === 'tier_0' ? 0 : t === 'tier_1' ? 1 : 2
  const iTier = tierNum(identityTier)
  const aTier = tierNum(accessTier)

  if (iTier === aTier) return '#dcfce7' // Same tier = green (compliant)
  if (aTier < iTier) {
    // Accessing higher tier = violation (red intensity)
    if (count >= 10) return '#fca5a5'
    if (count >= 5) return '#fecaca'
    return '#fee2e2'
  }
  return '#dbeafe' // Accessing lower tier = blue (normal)
}

export function TierHeatmap({ heatmap }: TierHeatmapProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500 w-24" />
        {TIERS.map((col) => {
          const config = AD_TIER_CONFIG[col]
          return (
            <div key={col} className="flex-1 text-center">
              <span className="text-xs font-semibold" style={{ color: config.color }}>
                Accesses {TIER_LABELS[col]}
              </span>
            </div>
          )
        })}
      </div>

      {TIERS.map((row) => {
        const config = AD_TIER_CONFIG[row]
        return (
          <div key={row} className="flex items-center gap-2 mb-2">
            <div className="w-24 text-right pr-2">
              <span className="text-xs font-semibold" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            {TIERS.map((col) => {
              const count = heatmap[row]?.[col] || 0
              const bgColor = getCellColor(row, col, count)
              const tierNum = (t: string) => t === 'tier_0' ? 0 : t === 'tier_1' ? 1 : 2
              const isViolation = tierNum(col) < tierNum(row) && count > 0

              return (
                <div
                  key={col}
                  className="flex-1 h-16 rounded-lg flex items-center justify-center border border-slate-200"
                  style={{ backgroundColor: bgColor }}
                  title={`${AD_TIER_CONFIG[row].label} identities accessing ${AD_TIER_CONFIG[col].label} resources: ${count}`}
                >
                  <div className="text-center">
                    <span className={`text-lg font-bold ${isViolation ? 'text-red-700' : count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                      {count}
                    </span>
                    {isViolation && (
                      <p className="text-[10px] text-red-600 font-medium">VIOLATION</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 border border-slate-200" /> Compliant
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200 border border-slate-200" /> Tier Violation
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 border border-slate-200" /> Downward Access
        </div>
      </div>
    </div>
  )
}
