'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { IdentityGraph } from '@/components/dashboard/identity-graph'
import { GraphDetailPanel } from '@/components/dashboard/graph-detail-panel'
import { CardSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export default function GraphPage() {
  const [limit, setLimit] = useState(50)
  const [tier, setTier] = useState('')
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<string[]>([
    'entitlement', 'membership', 'manager', 'owner',
  ])
  const t = useTranslations('graph')
  const tTiers = useTranslations('tiers')
  const tCommon = useTranslations('common')

  const EDGE_TYPES = [
    { key: 'entitlement', label: t('entitlements'), color: '#94a3b8' },
    { key: 'membership', label: t('memberships'), color: '#cbd5e1' },
    { key: 'manager', label: t('manager'), color: '#3B82F6' },
    { key: 'owner', label: t('ownerEdge'), color: '#8B5CF6' },
  ] as const

  const { data, isLoading, error } = useQuery({
    queryKey: ['graph', limit, tier],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) })
      if (tier) params.set('tier', tier)
      const res = await fetch(`/api/graph?${params}`)
      if (!res.ok) throw new Error('Failed to load graph data')
      return res.json()
    },
  })

  // Filter nodes by search query
  const filteredData = useMemo(() => {
    if (!data?.nodes) return data
    if (!searchQuery.trim()) return data

    const q = searchQuery.toLowerCase()
    const matchedNodeIds = new Set<string>()
    const filteredNodes = data.nodes.filter((n: any) => {
      const matches = n.label.toLowerCase().includes(q)
      if (matches) matchedNodeIds.add(n.id)
      return matches
    })

    const connectedNodeIds = new Set<string>(matchedNodeIds)
    for (const link of data.links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      if (matchedNodeIds.has(sourceId)) connectedNodeIds.add(targetId)
      if (matchedNodeIds.has(targetId)) connectedNodeIds.add(sourceId)
    }

    const expandedNodes = data.nodes.filter((n: any) => connectedNodeIds.has(n.id))
    const expandedLinks = data.links.filter((l: any) => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id
      const targetId = typeof l.target === 'string' ? l.target : l.target.id
      return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId)
    })

    return { nodes: expandedNodes, links: expandedLinks }
  }, [data, searchQuery])

  function toggleEdgeType(edgeType: string) {
    setVisibleEdgeTypes(prev =>
      prev.includes(edgeType)
        ? prev.filter(t => t !== edgeType)
        : [...prev, edgeType]
    )
  }

  function handleNodeClick(node: any) {
    setSelectedNode(node)
  }

  function handleClosePanel() {
    setSelectedNode(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>
          <p className="text-caption text-[var(--text-secondary)]">
            {t('description')}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-caption bg-[var(--bg-primary)]"
          >
            <option value="">{tTiers('allTiers')}</option>
            <option value="tier_0">{tTiers('tier_0')}</option>
            <option value="tier_1">{tTiers('tier_1')}</option>
            <option value="tier_2">{tTiers('tier_2')}</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-caption bg-[var(--bg-primary)]"
          >
            <option value={25}>25 {tCommon('identities')}</option>
            <option value={50}>50 {tCommon('identities')}</option>
            <option value={100}>100 {tCommon('identities')}</option>
          </select>
        </div>
      </div>

      {/* Search and edge type filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchNodes')}
            className="w-full ps-9 pe-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-caption bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-tertiary)]">{t('edges')}:</span>
          {EDGE_TYPES.map(et => (
            <label key={et.key} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleEdgeTypes.includes(et.key)}
                onChange={() => toggleEdgeType(et.key)}
                className="rounded border-[var(--border-default)] text-[var(--color-info)] w-3.5 h-3.5"
              />
              <span className="text-xs text-[var(--text-secondary)]">{et.label}</span>
              <span className="w-4 h-0.5 rounded" style={{ background: et.color }} />
            </label>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : error ? (
        <EmptyState
          icon="default"
          title={t('failedToLoad')}
          description={t('failedDescription')}
        />
      ) : !filteredData?.nodes?.length ? (
        <EmptyState
          icon="identities"
          title={searchQuery ? t('noMatchingNodes') : t('noIdentitiesToVisualize')}
          description={searchQuery ? t('tryDifferentSearch') : t('importIdentities')}
          actionLabel={searchQuery ? undefined : t('goToIdentities')}
          actionHref={searchQuery ? undefined : '/dashboard/identities'}
        />
      ) : (
        <div className="relative">
          <p className="text-caption text-[var(--text-tertiary)] mb-2">
            {t('nodesCount', { nodes: filteredData.nodes.length })} &middot; {t('connectionsCount', { connections: filteredData.links.length })} &middot; {t('clickToView')} &middot; {t('dragToRearrange')} &middot; {t('scrollToZoom')}
          </p>
          <IdentityGraph
            nodes={filteredData.nodes}
            links={filteredData.links}
            width={typeof window !== 'undefined' ? Math.min(window.innerWidth - (selectedNode ? 640 : 320), 1200) : 900}
            height={600}
            onNodeClick={handleNodeClick}
            visibleEdgeTypes={visibleEdgeTypes}
          />
        </div>
      )}

      <GraphDetailPanel
        node={selectedNode}
        isOpen={!!selectedNode}
        onClose={handleClosePanel}
      />
    </div>
  )
}
