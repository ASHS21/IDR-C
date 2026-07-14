'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Network, Route, Loader2, ArrowRight, Target, Zap, ChevronRight } from 'lucide-react'
import { ForceGraph, type FgNode, type FgLink } from './force-graph'

interface QueryDef { id: string; label: string; category: 'paths' | 'privilege' | 'exposure' | 'recon'; description: string }
interface GraphResult { nodes: FgNode[]; links: FgLink[]; summary: string; found?: boolean; hops?: number }
interface SearchResult { id: string; label: string; type: string; tier?: string }

interface ChokeFix {
  rank: number; source: string; target: string; sourceName: string; targetName: string
  edgeType: string; technique: string; pathsBroken: number; cumulativeBroken: number
  cumulativePct: number; dangerous: boolean
}
interface ChokeResult { totalPaths: number; fixes: ChokeFix[]; nodes: FgNode[]; links: FgLink[]; summary: string }
interface SimResult {
  before: number; after: number; pathsBroken: number; pctReduction: number
  targetLabel: string; kind: 'node' | 'edge'; summary: string; capped: boolean
}

const NODE_COLORS: Record<string, string> = {
  identity: '#2563EB', group: '#CA8A04', resource: '#5F6B7A', computer: '#4F46E5',
  gpo: '#0891B2', domain: '#DC2626', ou: '#7C3AED', unknown: '#94a3b8',
}
const colorOf = (g: string) => NODE_COLORS[g] ?? NODE_COLORS.unknown

const CATEGORY_LABEL: Record<QueryDef['category'], string> = {
  paths: 'Attack Paths', privilege: 'Privilege', exposure: 'Exposure', recon: 'Recon',
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

function NodePicker({ label, value, onChange }: { label: string; value: SearchResult | null; onChange: (v: SearchResult | null) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ['graph-search', q],
    queryFn: () => getJSON<{ results: SearchResult[] }>(`/api/graph/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  })
  return (
    <div className="relative flex-1 min-w-[160px]">
      <label className="text-xs text-[var(--text-tertiary)]">{label}</label>
      <input
        value={value ? value.label : q}
        onChange={(e) => { onChange(null); setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search entity…"
        className="w-full mt-0.5 px-2.5 py-1.5 text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-high)]"
      />
      {open && q.trim().length >= 2 && data && data.results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
          {data.results.map((r) => (
            <button key={r.id} onClick={() => { onChange(r); setOpen(false) }}
              className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-[var(--bg-secondary)] flex items-center justify-between gap-2">
              <span className="text-[var(--text-primary)] truncate">{r.label}</span>
              <span className="text-[10px] text-[var(--text-tertiary)] capitalize">{r.type}{r.tier && r.tier !== 'unclassified' ? ` · ${r.tier.replace('_', ' ')}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fix-First (choke-point) panel with inline what-if simulation ──
function ChokePanel({ data }: { data: ChokeResult }) {
  const [sims, setSims] = useState<Record<number, SimResult | 'loading'>>({})

  const runSim = async (f: ChokeFix) => {
    setSims((s) => ({ ...s, [f.rank]: 'loading' }))
    try {
      const res = await fetch('/api/graph/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeEdge: { source: f.source, target: f.target, label: f.technique } }),
      })
      const j: SimResult = await res.json()
      setSims((s) => ({ ...s, [f.rank]: j }))
    } catch {
      setSims((s) => { const c = { ...s }; delete c[f.rank]; return c })
    }
  }

  if (data.fixes.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)]">{data.summary}</p>
  }

  return (
    <div className="space-y-2">
      {/* Coverage headline */}
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2">
        <p className="text-sm text-[var(--text-primary)]">{data.summary}</p>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--color-critical)]"
            style={{ width: `${data.fixes[data.fixes.length - 1]?.cumulativePct ?? 0}%` }} />
        </div>
      </div>

      {/* Ranked fix list */}
      <div className="space-y-1.5">
        {data.fixes.map((f) => {
          const sim = sims[f.rank]
          return (
            <div key={f.rank} className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-critical)]/15 text-[var(--color-critical)] text-xs font-bold flex items-center justify-center">
                  {f.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] flex-wrap">
                    <span className="font-medium truncate max-w-[160px]">{f.sourceName}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                    <span className="font-medium truncate max-w-[160px]">{f.targetName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] capitalize">
                      {f.edgeType.replace(/_/g, ' ')}: {f.technique}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Removing this edge breaks <span className="text-[var(--color-critical)] font-semibold">{f.pathsBroken}</span> path(s)
                    {' '}· cumulative <span className="font-semibold text-[var(--text-secondary)]">{f.cumulativePct}%</span> of {data.totalPaths}
                  </p>
                </div>
                <button
                  onClick={() => runSim(f)}
                  disabled={sim === 'loading'}
                  className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50">
                  {sim === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Simulate
                </button>
              </div>

              {sim && sim !== 'loading' && (
                <div className="mt-2 ms-8 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] px-2.5 py-1.5">
                  <p className="text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--text-tertiary)]">Verified:</span>{' '}
                    <span className="font-semibold text-[var(--text-primary)]">{sim.before}</span> →{' '}
                    <span className="font-semibold text-[var(--color-low)]">{sim.after}</span> paths
                    {' '}· <span className="font-semibold text-[var(--color-critical)]">−{sim.pathsBroken}</span> ({sim.pctReduction}% reduction)
                    {sim.capped && <span className="text-[var(--text-tertiary)]"> · sampled</span>}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GraphExplorer() {
  const [mode, setMode] = useState<'query' | 'path' | 'chokepoints'>('query')
  const [activeQuery, setActiveQuery] = useState<string | null>('paths_to_tier0')
  const [source, setSource] = useState<SearchResult | null>(null)
  const [target, setTarget] = useState<SearchResult | null>(null)
  const [pathParams, setPathParams] = useState<{ s: string; t: string } | null>(null)

  const { data: catalog } = useQuery({ queryKey: ['graph-queries'], queryFn: () => getJSON<{ queries: QueryDef[] }>('/api/graph/queries') })
  const { data: queryResult, isFetching: queryLoading } = useQuery({
    queryKey: ['graph-query', activeQuery],
    queryFn: () => getJSON<GraphResult>(`/api/graph/query?id=${activeQuery}`),
    enabled: mode === 'query' && !!activeQuery,
  })
  const { data: pathResult, isFetching: pathLoading } = useQuery({
    queryKey: ['graph-path', pathParams],
    queryFn: () => getJSON<GraphResult>(`/api/graph/path?source=${pathParams!.s}&target=${pathParams!.t}`),
    enabled: mode === 'path' && !!pathParams,
  })
  const { data: chokeResult, isFetching: chokeLoading } = useQuery({
    queryKey: ['graph-choke'],
    queryFn: () => getJSON<ChokeResult>('/api/graph/choke-points'),
    enabled: mode === 'chokepoints',
  })

  const result: GraphResult | ChokeResult | undefined =
    mode === 'chokepoints' ? chokeResult : mode === 'path' ? pathResult : queryResult
  const loading = mode === 'chokepoints' ? chokeLoading : mode === 'path' ? pathLoading : queryLoading
  const grouped = (catalog?.queries ?? []).reduce<Record<string, QueryDef[]>>((acc, q) => {
    (acc[q.category] ||= []).push(q); return acc
  }, {})

  const tabCls = (active: boolean, border = false) =>
    `px-3 py-1.5 text-sm flex items-center gap-1.5 ${border ? 'border-l border-[var(--border-primary)]' : ''} ${
      active ? 'bg-[var(--color-high)]/10 text-[var(--color-high)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
    }`

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-[var(--border-primary)] overflow-hidden">
          <button onClick={() => setMode('query')} className={tabCls(mode === 'query')}>
            <Network className="w-4 h-4" /> Query Library
          </button>
          <button onClick={() => setMode('path')} className={tabCls(mode === 'path', true)}>
            <Route className="w-4 h-4" /> PathFinder
          </button>
          <button onClick={() => setMode('chokepoints')} className={tabCls(mode === 'chokepoints', true)}>
            <Target className="w-4 h-4" /> Fix-First
          </button>
        </div>
        {result && mode !== 'chokepoints' && (
          <span className="text-sm text-[var(--text-tertiary)]">{loading ? 'Running…' : result.summary}</span>
        )}
      </div>

      {mode === 'query' && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(grouped).map(([cat, qs]) => (
            <div key={cat} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] me-0.5">{CATEGORY_LABEL[cat as QueryDef['category']]}</span>
              {qs.map((q) => (
                <button key={q.id} onClick={() => setActiveQuery(q.id)} title={q.description}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${activeQuery === q.id ? 'border-[var(--color-high)] text-[var(--color-high)] bg-[var(--color-high)]/10' : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>
                  {q.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {mode === 'path' && (
        <div className="flex items-end gap-2 flex-wrap">
          <NodePicker label="From (source)" value={source} onChange={setSource} />
          <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] mb-2" />
          <NodePicker label="To (target)" value={target} onChange={setTarget} />
          <button
            disabled={!source || !target}
            onClick={() => source && target && setPathParams({ s: source.id, t: target.id })}
            className="mb-0.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--color-high)] text-white disabled:opacity-40 hover:opacity-90">
            Find path
          </button>
        </div>
      )}

      {mode === 'chokepoints' && (
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          The fewest changes that eliminate the most attack paths into Tier 0. Each fix is ranked by paths broken;
          hit <span className="text-[var(--text-secondary)]">Simulate</span> to verify the exact before/after impact before touching production.
        </p>
      )}

      {/* Choke-point fix list */}
      {mode === 'chokepoints' && !loading && chokeResult && <ChokePanel data={chokeResult} />}

      {/* Graph */}
      {loading ? (
        <div className="h-[560px] rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-tertiary)]">
          <Loader2 className="w-5 h-5 animate-spin me-2" /> Computing…
        </div>
      ) : result && result.nodes.length > 0 ? (
        <ForceGraph
          nodes={result.nodes}
          links={result.links}
          colorOf={colorOf}
          height={560}
          searchPlaceholder="Search nodes…"
          filterGroups={[
            { key: 'identity', label: 'Identity', color: NODE_COLORS.identity },
            { key: 'group', label: 'Group', color: NODE_COLORS.group },
            { key: 'computer', label: 'Computer', color: NODE_COLORS.computer },
            { key: 'resource', label: 'Resource', color: NODE_COLORS.resource },
            { key: 'gpo', label: 'GPO', color: NODE_COLORS.gpo },
          ]}
        />
      ) : (
        <div className="h-[560px] rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
          {mode === 'path' ? 'Pick a source and target, then Find path.'
            : mode === 'chokepoints' ? 'No attack paths into Tier 0 — nothing to fix.'
            : 'No results for this query.'}
        </div>
      )}
    </div>
  )
}
