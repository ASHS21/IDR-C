'use client'

import { useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { usePreferences, useUpdatePreferences } from '@/lib/hooks/use-preferences'

const WIDGETS = [
  { id: 'totalIdentities', label: 'Total Identities' },
  { id: 'activeViolations', label: 'Active Violations' },
  { id: 'tierCompliance', label: 'Tier Compliance' },
  { id: 'riskDistribution', label: 'Risk Distribution' },
  { id: 'topRisky', label: 'Top Risky Identities' },
  { id: 'integrationHealth', label: 'Integration Health' },
  { id: 'briefing', label: 'Daily Briefing' },
  { id: 'dataQuality', label: 'Data Quality' },
  { id: 'activeThreats', label: 'Active Threats' },
  { id: 'attackPaths', label: 'Attack Paths' },
  { id: 'shadowAdmins', label: 'Shadow Admins' },
]

export function WidgetSettings() {
  const [open, setOpen] = useState(false)
  const { data: prefs } = usePreferences()
  const { mutate: updatePrefs } = useUpdatePreferences()

  const hiddenWidgets = (prefs?.dashboard?.hiddenWidgets || []) as string[]

  const toggleWidget = (widgetId: string) => {
    const current = new Set(hiddenWidgets)
    if (current.has(widgetId)) {
      current.delete(widgetId)
    } else {
      current.add(widgetId)
    }
    updatePrefs({ dashboard: { hiddenWidgets: Array.from(current) } })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        title="Customize widgets"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 z-50 w-64 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Dashboard Widgets</span>
              <button onClick={() => setOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {WIDGETS.map(widget => {
                const isVisible = !hiddenWidgets.includes(widget.id)
                return (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidget(widget.id)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <span className={isVisible ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}>
                      {widget.label}
                    </span>
                    <div className={`w-8 h-5 rounded-full transition-colors relative ${isVisible ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isVisible ? 'start-3.5' : 'start-0.5'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
