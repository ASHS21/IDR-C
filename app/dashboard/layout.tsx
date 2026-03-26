import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { CommandPalette } from '@/components/dashboard/command-palette'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Sidebar />
      <CommandPalette />
      <div className="lg:ps-60 flex flex-col min-h-screen transition-all duration-200">
        <Header />
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  )
}
