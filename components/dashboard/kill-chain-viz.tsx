'use client'

import { useTranslations } from 'next-intl'

const PHASES = [
  'reconnaissance',
  'initial_access',
  'credential_access',
  'privilege_escalation',
  'lateral_movement',
  'persistence',
  'exfiltration',
  'impact',
] as const

interface KillChainVizProps {
  /** Map of kill chain phase -> count of active threats */
  phaseCounts: Record<string, number>
  /** Called when a phase is clicked */
  onPhaseClick?: (phase: string) => void
  /** Currently selected phase */
  selectedPhase?: string | null
}

export function KillChainViz({ phaseCounts, onPhaseClick, selectedPhase }: KillChainVizProps) {
  const t = useTranslations('threats')

  const maxCount = Math.max(1, ...Object.values(phaseCounts))

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('killChain')}</h3>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {PHASES.map((phase, idx) => {
          const count = phaseCounts[phase] || 0
          const intensity = count / maxCount
          const isSelected = selectedPhase === phase
          const phaseLabel = t(`killChainPhases.${phase}`)

          return (
            <button
              key={phase}
              onClick={() => onPhaseClick?.(phase)}
              className={`
                flex-1 min-w-[90px] flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'border-[var(--color-info)] bg-[var(--color-info)]/10'
                  : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                }
              `}
              style={{
                backgroundColor: isSelected
                  ? undefined
                  : count > 0
                    ? `rgba(239, 68, 68, ${0.05 + intensity * 0.2})`
                    : undefined,
              }}
            >
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide text-center leading-tight">
                {phaseLabel}
              </span>
              <span className={`text-lg font-bold ${
                count > 0 ? 'text-[var(--color-critical)]' : 'text-[var(--text-muted)]'
              }`}>
                {count}
              </span>
              {idx < PHASES.length - 1 && (
                <span className="absolute -end-1 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hidden lg:block" aria-hidden>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
