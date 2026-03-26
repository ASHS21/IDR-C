'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { MetricCard } from '@/components/dashboard/metric-card'
import { RiskGauge } from '@/components/dashboard/risk-gauge'
import { useSession } from 'next-auth/react'
import { hasRole } from '@/lib/utils/rbac'
import { formatDateTime } from '@/lib/utils/formatters'
import type { AppRole } from '@/lib/utils/rbac'

export default function AIPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [riskAppetite, setRiskAppetite] = useState('moderate')
  const [timeline, setTimeline] = useState('30')
  const t = useTranslations('ai')

  const { data: plansData } = useQuery({
    queryKey: ['ai', 'plans'],
    queryFn: async () => {
      const res = await fetch('/api/ai/plans')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timelineDays: Number(timeline),
          riskAppetite,
        }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'plans'] }),
  })

  const approveMutation = useMutation({
    mutationFn: async ({ planId, action }: { planId: string; action: string }) => {
      const res = await fetch('/api/ai/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, action }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'plans'] }),
  })

  const userRole = (session?.user as any)?.appRole as AppRole | undefined
  const plans = plansData?.plans || []
  const latestPlan = plans[0]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>

      {/* Analysis trigger */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('generateNew')}</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('timelineDays')}</label>
            <input
              type="number"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm w-24 bg-[var(--bg-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">{t('riskAppetite')}</label>
            <select
              value={riskAppetite}
              onChange={(e) => setRiskAppetite(e.target.value)}
              className="px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)]"
            >
              <option value="conservative">{t('conservative')}</option>
              <option value="moderate">{t('moderate')}</option>
              <option value="aggressive">{t('aggressive')}</option>
            </select>
          </div>
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="px-4 py-2 bg-[var(--color-info)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {analyzeMutation.isPending ? t('analyzing') : t('generateAnalysis')}
          </button>
        </div>
        {analyzeMutation.isError && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-critical)' }}>{t('analysisFailed')}</p>
        )}
      </div>

      {/* Latest plan */}
      {latestPlan && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label={t('projectedReduction')}
              value={`${latestPlan.projectedRiskReduction || 0}%`}
              color="green"
            />
            <MetricCard
              label={t('recommendedActions')}
              value={(latestPlan.rankedActions as any[])?.length || 0}
              color="blue"
            />
            <MetricCard
              label={t('quickWins')}
              value={(latestPlan.quickWins as any[])?.length || 0}
              color="green"
            />
          </div>

          <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                {t('latestAnalysis')} — {latestPlan.status.toUpperCase()}
              </h3>
              {latestPlan.status === 'draft' && userRole && hasRole(userRole, 'ciso') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate({ planId: latestPlan.id, action: 'approved' })}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-low)' }}
                  >
                    {t('approvePlan')}
                  </button>
                  <button
                    onClick={() => approveMutation.mutate({ planId: latestPlan.id, action: 'rejected' })}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-critical-bg)]"
                    style={{ color: 'var(--color-critical)' }}
                  >
                    {t('reject')}
                  </button>
                </div>
              )}
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-6">{latestPlan.executiveSummary}</p>

            {/* Ranked actions */}
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('recommendedActions')}</h4>
            <div className="space-y-3 mb-6">
              {(latestPlan.rankedActions as any[] || []).map((action: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-info-bg)] text-xs font-bold flex items-center justify-center" style={{ color: 'var(--color-info)' }}>
                    {action.priority || i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{action.description}</p>
                    {action.justification && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{action.justification}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {action.effort && (
                        <span className="text-xs text-[var(--text-tertiary)]">{t('effort')}: {action.effort}</span>
                      )}
                      {action.impact && (
                        <span className="text-xs text-[var(--text-tertiary)]">{t('impact')}: {action.impact}</span>
                      )}
                      {action.estimatedRiskReduction && (
                        <span className="text-xs" style={{ color: 'var(--color-low)' }}>{t('riskReduction', { value: action.estimatedRiskReduction })}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick wins */}
            {(latestPlan.quickWins as any[] || []).length > 0 && (
              <>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">{t('quickWins')}</h4>
                <div className="space-y-2">
                  {(latestPlan.quickWins as any[]).map((win: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[var(--color-low-bg)] rounded-lg">
                      <span style={{ color: 'var(--color-low)' }}>&#10003;</span>
                      <p className="text-sm text-[var(--text-secondary)]">{win.description || win.action}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Historical plans */}
      {plans.length > 1 && (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t('historicalPlans')}</h3>
          <div className="space-y-2">
            {plans.slice(1).map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between p-3 border border-[var(--border-default)] rounded-lg">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">{formatDateTime(plan.generatedAt)}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{plan.executiveSummary}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                  plan.status === 'approved' ? 'bg-[var(--color-low-bg)]' :
                  plan.status === 'rejected' ? 'bg-[var(--color-critical-bg)]' :
                  'bg-[var(--bg-tertiary)]'
                }`} style={{
                  color: plan.status === 'approved' ? 'var(--color-low)' :
                         plan.status === 'rejected' ? 'var(--color-critical)' :
                         'var(--text-secondary)'
                }}>
                  {t(plan.status as 'approved' | 'rejected' | 'draft')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
