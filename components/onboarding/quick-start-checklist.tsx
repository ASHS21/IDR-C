'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react'

interface OnboardingStatus {
  hasOrganization: boolean
  hasIntegration: boolean
  hasIdentities: boolean
  hasTierViolations: boolean
  hasAIPlan: boolean
  hasTeamMembers: boolean
}

const DISMISS_KEY = 'idr-quickstart-dismissed'

const STEPS = [
  {
    key: 'account' as const,
    label: 'Create your account',
    alwaysComplete: true,
    href: null,
    cta: null,
  },
  {
    key: 'hasOrganization' as const,
    label: 'Set organization name',
    alwaysComplete: false,
    href: '/dashboard/settings',
    cta: 'Configure',
  },
  {
    key: 'hasIntegration' as const,
    label: 'Connect a data source',
    alwaysComplete: false,
    href: '/dashboard/integrations',
    cta: 'Connect',
  },
  {
    key: 'hasTierViolations' as const,
    label: 'Review tier violations',
    alwaysComplete: false,
    href: '/dashboard/tiering',
    cta: 'Review',
  },
  {
    key: 'hasAIPlan' as const,
    label: 'Run AI analysis',
    alwaysComplete: false,
    href: '/dashboard/ai',
    cta: 'Analyze',
  },
  {
    key: 'hasTeamMembers' as const,
    label: 'Invite a team member',
    alwaysComplete: false,
    href: '/dashboard/settings',
    cta: 'Invite',
  },
] as const

export function QuickStartChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [dismissed, setDismissed] = useState(true) // default hidden until loaded
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    setDismissed(wasDismissed)
    if (wasDismissed) {
      setLoading(false)
      return
    }

    fetch('/api/onboarding/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStatus(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (dismissed || loading) return null
  if (!status) return null

  const isComplete = (step: (typeof STEPS)[number]): boolean => {
    if (step.alwaysComplete) return true
    return !!status[step.key as keyof OnboardingStatus]
  }

  const completedCount = STEPS.filter(isComplete).length
  const allDone = completedCount === STEPS.length

  if (allDone) return null

  const progress = Math.round((completedCount / STEPS.length) * 100)

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="px-4 lg:px-6 pt-3">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-body font-semibold text-[var(--text-primary)]">
              Quick Start
            </h3>
            <p className="text-caption text-[var(--text-tertiary)]">
              {completedCount}/{STEPS.length} steps complete
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Dismiss quick start"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] mb-4">
          <div
            className="h-full rounded-full bg-[var(--color-info)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-1.5">
          {STEPS.map((step) => {
            const done = isComplete(step)
            return (
              <div
                key={step.key}
                className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${
                  done
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
                    : 'bg-[var(--bg-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {done ? (
                    <CheckCircle2
                      size={18}
                      className="text-[var(--color-low)] flex-shrink-0"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="text-[var(--text-tertiary)] flex-shrink-0"
                    />
                  )}
                  <span
                    className={`text-body ${
                      done
                        ? 'line-through text-[var(--text-tertiary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {!done && step.href && (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 text-caption font-medium text-[var(--color-info)] hover:underline"
                  >
                    {step.cta}
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
