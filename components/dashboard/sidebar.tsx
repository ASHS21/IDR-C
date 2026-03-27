'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Bot, UsersRound, Shield, Key, ClipboardCheck,
  AlertTriangle, Brain, TrendingUp, Plug, ScrollText, Settings,
  ChevronLeft, ChevronRight, Menu, X, Network,
  Route, Crosshair, UserX, MessageSquare, Link2, Radar, TableProperties, ShieldCheck,
  Sparkles,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    labelKey: 'posture' as const,
    items: [
      { href: '/dashboard', labelKey: 'dashboard' as const, icon: LayoutDashboard },
      { href: '/dashboard/identities', labelKey: 'identities' as const, icon: Users },
      { href: '/dashboard/tiering', labelKey: 'tiering' as const, icon: Shield },
      { href: '/dashboard/entitlements', labelKey: 'entitlements' as const, icon: Key },
      { href: '/dashboard/shadow-admins', labelKey: 'shadowAdmins' as const, icon: UserX },
      { href: '/dashboard/attack-paths', labelKey: 'attackPaths' as const, icon: Route },
      { href: '/dashboard/blast-radius', labelKey: 'blastRadius' as const, icon: Radar },
      { href: '/dashboard/peer-analysis', labelKey: 'peerAnomalies' as const, icon: TrendingUp },
      { href: '/dashboard/gpo', labelKey: 'gpoTracking' as const, icon: ShieldCheck },
    ],
  },
  {
    labelKey: 'threats' as const,
    items: [
      { href: '/dashboard/threats', labelKey: 'liveThreats' as const, icon: Crosshair },
      { href: '/dashboard/canaries', labelKey: 'canaryIdentities' as const, icon: AlertTriangle },
      { href: '/dashboard/violations', labelKey: 'violations' as const, icon: AlertTriangle },
    ],
  },
  {
    labelKey: 'governance' as const,
    items: [
      { href: '/dashboard/certifications', labelKey: 'certifications' as const, icon: ClipboardCheck },
      { href: '/dashboard/nhi', labelKey: 'nhi' as const, icon: Bot },
      { href: '/dashboard/supply-chain', labelKey: 'supplyChain' as const, icon: Link2 },
    ],
  },
  {
    labelKey: 'intelligence' as const,
    items: [
      { href: '/dashboard/results', labelKey: 'resultsHub' as const, icon: TableProperties },
      { href: '/dashboard/ai', labelKey: 'ai' as const, icon: Brain },
      { href: '/dashboard/ai-chat', labelKey: 'aiChat' as const, icon: MessageSquare },
      { href: '/dashboard/graph', labelKey: 'graph' as const, icon: Network },
    ],
  },
  {
    labelKey: 'operations' as const,
    items: [
      { href: '/dashboard/data-quality', labelKey: 'dataQuality' as const, icon: Sparkles },
      { href: '/dashboard/integrations', labelKey: 'integrations' as const, icon: Plug },
      { href: '/dashboard/audit', labelKey: 'audit' as const, icon: ScrollText },
      { href: '/dashboard/settings', labelKey: 'settings' as const, icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useTranslations('nav')
  const tSections = useTranslations('navSections')
  const tCommon = useTranslations('common')

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-60'

  const navContent = (showLabels: boolean) => (
    <>
      <div className={`flex items-center ${showLabels ? 'px-5 py-5' : 'px-2 py-5 justify-center'}`}>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-info)] flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {showLabels && (
          <div className="ms-3">
            <h1 className="text-body font-semibold text-white leading-tight">Identity Radar</h1>
            <p className="text-micro text-slate-400">IAM Posture</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey}>
            {showLabels && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 tracking-widest">
                {tSections(section.labelKey)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={!showLabels ? t(item.labelKey) : undefined}
                    className={`
                      flex items-center gap-3 rounded-md transition-colors relative
                      ${showLabels ? 'px-3 py-2' : 'px-0 py-2 justify-center'}
                      ${active
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-info)] rounded-e" />
                    )}
                    <Icon size={18} className="flex-shrink-0" />
                    {showLabels && (
                      <span className="text-body font-medium truncate">{t(item.labelKey)}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button (desktop only) */}
      {showLabels !== undefined && (
        <div className="hidden lg:block px-2 py-3 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} className="rtl:-scale-x-100" /> : <ChevronLeft size={18} className="rtl:-scale-x-100" />}
            {showLabels && <span className="text-caption">{tCommon('collapse')}</span>}
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 start-4 z-50 p-2 rounded-md bg-slate-900 text-white"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 start-0 z-40 w-60 bg-slate-900 flex flex-col transform transition-transform ${mobileOpen ? 'translate-x-0 rtl:-translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}>
        {navContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex ${sidebarWidth} flex-col fixed inset-y-0 start-0 bg-slate-900 transition-all duration-200`}>
        {navContent(!collapsed)}
      </aside>
    </>
  )
}
