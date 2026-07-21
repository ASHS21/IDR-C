'use client'

// Canonical error state: says what went wrong and offers a way forward — no
// apologies, no raw stack traces. Pair with EmptyState (nothing here yet) and the
// Skeleton family (still loading) for the three-state contract every data view uses.

import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Couldn’t load this data',
  description = 'The request failed. Check your connection to the server and try again.',
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--color-critical-bg)' }}>
        <AlertTriangle size={26} style={{ color: 'var(--color-critical)' }} />
      </div>
      <h3 className="text-heading text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-caption text-[var(--text-secondary)] max-w-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2 text-micro font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)]"
        >
          <RotateCw size={14} /> {retryLabel}
        </button>
      )}
    </div>
  )
}
