'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Search, Moon, Sun, ChevronDown, LogOut, Brain } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/utils/rbac'
import { setLocale } from '@/lib/locale'
import type { AppRole } from '@/lib/utils/rbac'
import type { Locale } from '@/lib/locale'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { AiChatPanel } from '@/components/dashboard/ai-chat-panel'

export function Header() {
  const { data: session } = useSession()
  const [darkMode, setDarkMode] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const locale = useLocale() as Locale
  const t = useTranslations('common')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored === 'dark' || document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleDarkMode = useCallback(() => {
    const isDark = document.documentElement.classList.toggle('dark')
    setDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [])

  const switchLanguage = useCallback(() => {
    const nextLocale: Locale = locale === 'en' ? 'ar' : 'en'
    setLocale(nextLocale)
  }, [locale])

  const openSearch = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }, [])

  const userRole = (session?.user as any)?.appRole as AppRole | undefined

  return (
    <>
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-4 lg:px-6 h-14 flex items-center justify-between">
      <div className="lg:hidden w-10" />

      {/* Search trigger */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:border-[var(--border-hover)] transition-colors max-w-xs"
      >
        <Search size={14} />
        <span className="text-caption hidden sm:inline">{t('search')}</span>
        <kbd className="hidden sm:inline text-micro bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border-default)] ms-4">
          ⌘K
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <button
          onClick={switchLanguage}
          className="px-2 py-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors text-caption font-medium"
          title={locale === 'en' ? 'العربية' : 'English'}
        >
          {locale === 'en' ? 'AR' : 'EN'}
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Toggle dark mode"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-2 rounded-md transition-colors ${chatOpen ? 'bg-[var(--color-info)] text-white' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]'}`}
          title="AI Assistant"
        >
          <Brain size={16} />
        </button>
        <NotificationPanel />

        {/* User menu */}
        {session?.user && (
          <div className="relative ms-2">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--color-info)] flex items-center justify-center text-micro font-medium text-white">
                {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-start">
                <p className="text-caption font-medium text-[var(--text-primary)] leading-tight">
                  {session.user.name || session.user.email?.split('@')[0]}
                </p>
                <p className="text-micro text-[var(--text-tertiary)]">
                  {ROLE_LABELS[userRole || 'viewer']}
                </p>
              </div>
              <ChevronDown size={14} className="text-[var(--text-tertiary)] hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div
                  className="absolute end-0 top-full mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg py-1 z-50"
                  style={{ boxShadow: 'var(--shadow-dropdown)' }}
                >
                  <div className="px-3 py-2 border-b border-[var(--border-default)]">
                    <p className="text-caption font-medium text-[var(--text-primary)]">{session.user.email}</p>
                    <p className="text-micro text-[var(--text-tertiary)]">{ROLE_LABELS[userRole || 'viewer']}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-caption text-[var(--color-critical)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <LogOut size={14} />
                    {t('signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
    <AiChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}
