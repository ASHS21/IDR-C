'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="rounded-[var(--radius-card)] border p-8 max-w-md text-center" style={{ borderColor: 'var(--color-critical)', backgroundColor: 'var(--color-critical-bg)' }}>
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: 'var(--color-critical)' }} />
        <h2 className="text-heading font-semibold mb-2" style={{ color: 'var(--color-critical)' }}>
          Something went wrong
        </h2>
        <p className="text-caption mb-4" style={{ color: 'var(--text-secondary)' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] text-body font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-critical)' }}
        >
          <RotateCcw size={14} />
          Try Again
        </button>
      </div>
    </div>
  )
}
