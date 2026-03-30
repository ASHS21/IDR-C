import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { QuickStartChecklist } from '@/components/onboarding/quick-start-checklist'
import { KeyboardShortcutsProvider } from '@/components/dashboard/keyboard-shortcuts-provider'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <KeyboardShortcutsProvider>
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <CommandPalette />
      <div className="lg:ps-60 flex flex-col min-h-screen transition-all duration-200">
        <Header />
        {isDemoMode && (
          <div className="px-4 lg:px-6 pt-3">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-[var(--radius-card)] text-caption font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              <span>DEMO MODE &mdash; Using synthetic data. Connect your environment for real insights.</span>
              <Link
                href="/dashboard/integrations"
                className="whitespace-nowrap underline font-semibold hover:opacity-80 transition-opacity"
              >
                Connect Now
              </Link>
            </div>
          </div>
        )}
        <QuickStartChecklist />
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
    </KeyboardShortcutsProvider>
  )
}
