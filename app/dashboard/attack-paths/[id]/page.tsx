'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Brain, Shield, Route, Zap, RefreshCw } from 'lucide-react'
import { AttackPathChain } from '@/components/dashboard/attack-path-chain'

interface AttackPathDetail {
  id: string
  sourceIdentityId: string
  targetIdentityId: string | null
  targetResourceId: string | null
  pathNodes: Array<{ id: string; type: string; name: string; tier?: string }>
  pathEdges: Array<{ source: string; target: string; type: string; label: string; technique: string }>
  pathLength: number
  riskScore: number
  attackTechnique: string
  mitreId: string | null
  aiNarrative: string | null
  status: string
  discoveredAt: string
  sourceIdentity?: { id: string; displayName: string; adTier: string; type: string } | null
  targetIdentity?: { id: string; displayName: string; adTier: string; type: string } | null
  targetResource?: { id: string; name: string; adTier: string; type: string } | null
}

function tierBadge(tier: string): string {
  switch (tier) {
    case 'tier_0': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'tier_1': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'tier_2': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
    default: return 'bg-slate-100 text-slate-500'
  }
}

export default function AttackPathDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('attackPaths')
  const tCommon = useTranslations('common')
  const [path, setPath] = useState<AttackPathDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [narrating, setNarrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPath() {
      try {
        const res = await fetch(`/api/attack-paths/${id}`)
        if (res.ok) {
          setPath(await res.json())
        } else {
          setError('Failed to load attack path')
        }
      } catch {
        setError('Failed to load attack path')
      } finally {
        setLoading(false)
      }
    }
    fetchPath()
  }, [id])

  const requestNarration = async () => {
    if (!path) return
    setNarrating(true)
    try {
      const res = await fetch(`/api/attack-paths/${id}/narrate`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPath(prev => prev ? { ...prev, aiNarrative: data.narrative || JSON.stringify(data) } : null)
      }
    } catch { /* ignore */ }
    finally { setNarrating(false) }
  }

  if (loading) {
    return <div className="flex justify-center py-16 text-[var(--text-tertiary)]">{tCommon('loading')}</div>
  }

  if (error || !path) {
    return (
      <div className="p-6 text-center text-red-500">
        {error || 'Attack path not found'}
        <Link href="/dashboard/attack-paths" className="block mt-3 text-[var(--color-info)]">{tCommon('back')}</Link>
      </div>
    )
  }

  const sourceNode = (path.pathNodes as any[])?.[0]
  const targetNode = (path.pathNodes as any[])?.[(path.pathNodes as any[]).length - 1]

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/dashboard/attack-paths" className="inline-flex items-center gap-2 text-body text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
        <ArrowLeft size={16} className="rtl:-scale-x-100" />
        {t('backToAttackPaths')}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h2 font-bold text-[var(--text-primary)]">
              {sourceNode?.name || 'Unknown'}
            </h1>
            <span className="text-[var(--text-tertiary)]">&rarr;</span>
            <h1 className="text-h2 font-bold text-[var(--text-primary)]">
              {targetNode?.name || 'Unknown'}
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {sourceNode?.tier && (
              <span className={`text-micro px-2 py-0.5 rounded-full font-semibold ${tierBadge(sourceNode.tier)}`}>
                {sourceNode.tier.replace('_', ' ').toUpperCase()}
              </span>
            )}
            <span className="text-[var(--text-tertiary)]">&rarr;</span>
            {targetNode?.tier && (
              <span className={`text-micro px-2 py-0.5 rounded-full font-semibold ${tierBadge(targetNode.tier)}`}>
                {targetNode.tier.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="text-center px-4">
            <p className="text-micro text-[var(--text-tertiary)] uppercase">{t('riskScore')}</p>
            <p className={`text-h2 font-bold ${path.riskScore >= 80 ? 'text-[var(--color-critical)]' : path.riskScore >= 60 ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'}`}>
              {path.riskScore}
            </p>
          </div>
          <div className="text-center px-4 border-s border-[var(--border-default)]">
            <p className="text-micro text-[var(--text-tertiary)] uppercase">{t('length')}</p>
            <p className="text-h2 font-bold text-[var(--text-primary)]">{path.pathLength}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 text-micro text-[var(--text-tertiary)]">
            <Zap size={14} />
            {t('technique')}
          </div>
          <p className="text-body font-semibold text-[var(--text-primary)] mt-1">{path.attackTechnique}</p>
        </div>
        <div className="p-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 text-micro text-[var(--text-tertiary)]">
            <Shield size={14} />
            MITRE ATT&CK
          </div>
          <p className="text-body font-mono font-semibold text-[var(--text-primary)] mt-1">{path.mitreId || 'N/A'}</p>
        </div>
        <div className="p-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 text-micro text-[var(--text-tertiary)]">
            <Route size={14} />
            {t('statusCol')}
          </div>
          <p className="text-body font-semibold capitalize text-[var(--text-primary)] mt-1">{path.status}</p>
        </div>
        <div className="p-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 text-micro text-[var(--text-tertiary)]">
            <Route size={14} />
            {t('discovered')}
          </div>
          <p className="text-body font-semibold text-[var(--text-primary)] mt-1">
            {new Date(path.discoveredAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Chain Visualization */}
      <div>
        <h2 className="text-h4 font-semibold text-[var(--text-primary)] mb-3">{t('pathVisualization')}</h2>
        <AttackPathChain
          pathNodes={path.pathNodes as any[]}
          pathEdges={path.pathEdges as any[]}
          width={Math.max(600, ((path.pathNodes as any[]).length) * 180)}
          height={220}
        />
      </div>

      {/* AI Narrative */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[var(--color-info)]" />
            <h2 className="text-body font-semibold text-[var(--text-primary)]">{t('aiNarrative')}</h2>
          </div>
          {!path.aiNarrative && (
            <button
              onClick={requestNarration}
              disabled={narrating}
              className="flex items-center gap-2 px-3 py-1.5 text-micro bg-[var(--color-info)] text-white rounded-[var(--radius-badge)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <RefreshCw size={12} className={narrating ? 'animate-spin' : ''} />
              {narrating ? t('generating') : t('generateNarrative')}
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {path.aiNarrative ? (
            <p className="text-body text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {path.aiNarrative}
            </p>
          ) : (
            <p className="text-body text-[var(--text-tertiary)] italic">{t('noNarrativeYet')}</p>
          )}
        </div>
      </div>

      {/* Path Steps */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="px-5 py-3 border-b border-[var(--border-default)]">
          <h2 className="text-body font-semibold text-[var(--text-primary)]">{t('pathSteps')}</h2>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {(path.pathEdges as any[]).map((edge: any, i: number) => {
            const from = (path.pathNodes as any[])[i]
            const to = (path.pathNodes as any[])[i + 1]
            return (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <span className="text-micro font-bold text-[var(--text-tertiary)] w-8">{t('hop')} {i + 1}</span>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-body font-medium text-[var(--text-primary)]">{from?.name}</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] rounded-full">
                    <span className="text-micro font-semibold text-[var(--color-warning)]">{edge.technique}</span>
                    <span className="text-micro text-[var(--text-tertiary)]">{edge.label}</span>
                  </div>
                  <span className="text-body font-medium text-[var(--text-primary)]">{to?.name}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
