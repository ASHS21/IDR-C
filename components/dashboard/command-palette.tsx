'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, Users, Shield, AlertTriangle, Brain, Settings, X } from 'lucide-react'

interface SearchResult {
  id: string
  label: string
  description?: string
  category: 'identity' | 'page' | 'action'
  href: string
  icon?: typeof Users
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const tNav = useTranslations('nav')
  const tSearch = useTranslations('search')

  const PAGES: SearchResult[] = [
    { id: 'dashboard', label: tNav('dashboard'), category: 'page', href: '/dashboard', icon: Shield },
    { id: 'identities', label: tNav('identities'), category: 'page', href: '/dashboard/identities', icon: Users },
    { id: 'tiering', label: tNav('tiering'), category: 'page', href: '/dashboard/tiering', icon: Shield },
    { id: 'violations', label: tNav('violations'), category: 'page', href: '/dashboard/violations', icon: AlertTriangle },
    { id: 'graph', label: tNav('graph'), category: 'page', href: '/dashboard/graph' },
    { id: 'ai', label: tNav('ai'), category: 'page', href: '/dashboard/ai', icon: Brain },
    { id: 'settings', label: tNav('settings'), category: 'page', href: '/dashboard/settings', icon: Settings },
  ]

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults(PAGES)
      setSelectedIndex(0)
    }
  }, [open])

  // Search identities
  const searchIdentities = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase())))
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/identities?search=${encodeURIComponent(q)}&pageSize=5`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const identityResults: SearchResult[] = data.data.map((i: any) => ({
        id: i.id,
        label: i.displayName,
        description: `${i.type === 'human' ? 'Human' : 'NHI'} · ${i.adTier?.replace('_', ' ')} · Risk: ${i.riskScore}`,
        category: 'identity' as const,
        href: `/dashboard/identities/${i.id}`,
        icon: Users,
      }))
      const pageResults = PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase()))
      setResults([...identityResults, ...pageResults])
    } catch {
      setResults(PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase())))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => searchIdentities(query), 200)
    return () => clearTimeout(timeout)
  }, [query, searchIdentities])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    router.push(result.href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    }
  }

  if (!open) return null

  const grouped = {
    identity: results.filter(r => r.category === 'identity'),
    page: results.filter(r => r.category === 'page'),
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative max-w-xl mx-auto mt-[15vh]">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[var(--border-default)]">
            <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder={tSearch('placeholder')}
              className="flex-1 py-3.5 bg-transparent text-body text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-micro text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded border border-[var(--border-default)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {loading && (
              <p className="px-4 py-2 text-caption text-[var(--text-tertiary)]">{tSearch('searching')}</p>
            )}

            {grouped.identity.length > 0 && (
              <div>
                <p className="px-4 py-1 text-micro text-[var(--text-tertiary)] font-semibold tracking-wider">{tSearch('identitiesCategory')}</p>
                {grouped.identity.map((result, i) => {
                  const globalIndex = i
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                        selectedIndex === globalIndex ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Users size={16} className="text-[var(--color-human)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-body font-medium text-[var(--text-primary)] truncate">{result.label}</p>
                        {result.description && (
                          <p className="text-caption text-[var(--text-tertiary)] truncate">{result.description}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {grouped.page.length > 0 && (
              <div>
                <p className="px-4 py-1 text-micro text-[var(--text-tertiary)] font-semibold tracking-wider mt-1">{tSearch('pagesCategory')}</p>
                {grouped.page.map((result, i) => {
                  const globalIndex = grouped.identity.length + i
                  const Icon = result.icon || Shield
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                        selectedIndex === globalIndex ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <Icon size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
                      <p className="text-body text-[var(--text-primary)]">{result.label}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {!loading && results.length === 0 && (
              <p className="px-4 py-8 text-center text-caption text-[var(--text-tertiary)]">
                {tSearch('noResults', { query })}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--border-default)] flex gap-4 text-micro text-[var(--text-tertiary)]">
            <span>↑↓ {tSearch('navigate')}</span>
            <span>↵ {tSearch('select')}</span>
            <span>esc {tSearch('close')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
