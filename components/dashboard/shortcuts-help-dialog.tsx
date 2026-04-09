'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  {
    group: 'Navigation',
    items: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'I'], description: 'Go to Identities' },
      { keys: ['G', 'V'], description: 'Go to Violations' },
      { keys: ['G', 'T'], description: 'Go to Threats' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
      { keys: ['G', 'C'], description: 'Go to Compliance' },
      { keys: ['G', 'R'], description: 'Go to Remediation' },
    ],
  },
  {
    group: 'Actions',
    items: [
      { keys: ['\u2318', 'K'], description: 'Open command palette' },
      { keys: ['Esc'], description: 'Close dialog / deselect' },
    ],
  },
  {
    group: 'Help',
    items: [
      { keys: ['?'], description: 'Show this dialog' },
    ],
  },
]

export function ShortcutsHelpDialog() {
  const [open, setOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in inputs
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      setOpen(prev => !prev)
    }
    if (e.key === 'Escape' && open) {
      setOpen(false)
    }
  }, [open])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map(section => (
            <div key={section.group}>
              <h3 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {section.group}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <span key={j}>
                          {j > 0 && <span className="text-[var(--text-tertiary)] text-xs mx-0.5">then</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-mono font-medium">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <p className="text-[11px] text-[var(--text-tertiary)] text-center">
            Press <kbd className="px-1 py-0.5 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[10px] font-mono">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  )
}
