'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
const modKey = isMac ? '\u2318' : 'Ctrl'

const SHORTCUT_SECTIONS = [
  {
    labelKey: 'global' as const,
    shortcuts: [
      { keys: [`${modKey}+K`], labelKey: 'search' as const },
      { keys: [`${modKey}+B`], labelKey: 'toggleSidebar' as const },
      { keys: ['?'], labelKey: 'showHelp' as const },
    ],
  },
  {
    labelKey: 'navigation' as const,
    shortcuts: [
      { keys: ['g', 'd'], labelKey: 'goToDashboard' as const },
      { keys: ['g', 'i'], labelKey: 'goToIdentities' as const },
      { keys: ['g', 't'], labelKey: 'goToTiering' as const },
      { keys: ['g', 'v'], labelKey: 'goToViolations' as const },
      { keys: ['g', 'a'], labelKey: 'goToAi' as const },
      { keys: ['g', 'r'], labelKey: 'goToReports' as const },
      { keys: ['g', 'h'], labelKey: 'goToThreats' as const },
      { keys: ['g', 's'], labelKey: 'goToSettings' as const },
    ],
  },
  {
    labelKey: 'tables' as const,
    shortcuts: [
      { keys: ['j'], labelKey: 'moveDown' as const },
      { keys: ['k'], labelKey: 'moveUp' as const },
      { keys: ['Enter'], labelKey: 'openItem' as const },
      { keys: ['Space'], labelKey: 'selectItem' as const },
    ],
  },
  {
    labelKey: 'actions' as const,
    shortcuts: [
      { keys: ['a'], labelKey: 'acknowledge' as const },
      { keys: ['c'], labelKey: 'certify' as const },
      { keys: ['r'], labelKey: 'review' as const },
    ],
  },
]

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('shortcuts')

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg overflow-hidden"
        style={{ boxShadow: 'var(--shadow-dropdown)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <h3 className="text-heading font-semibold text-[var(--text-primary)]">{t('title')}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-5">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.labelKey}>
              <p className="text-micro font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t(section.labelKey)}
              </p>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.labelKey}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-caption text-[var(--text-secondary)]">
                      {t(shortcut.labelKey)}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="text-micro text-[var(--text-tertiary)] mx-0.5">then</span>
                          )}
                          <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-micro font-mono font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded">
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
      </div>
    </div>
  )
}
