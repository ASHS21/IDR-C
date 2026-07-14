'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, ShieldAlert, CheckCircle2, XCircle, Clock, Play,
  ChevronDown, ChevronRight, AlertTriangle, Loader2, Zap,
} from 'lucide-react'

interface RemediationAction {
  priority: number
  actionType: string
  targetIdentityId: string
  targetIdentityName: string
  targetEntitlementId?: string
  description: string
  justification: string
  currentTier: string
  effectiveTier: string
  riskScore: number
  effort: string
  impact: string
}

interface Plan {
  id: string
  status: string
  executiveSummary: string
  rankedActions: RemediationAction[]
  quickWins: RemediationAction[]
  projectedRiskReduction: number
  generatedAt: string
  approvedBy?: string
  approvedAt?: string
  inputParams?: any
}

const STATUS_STYLES: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  draft: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending Approval' },
  approved: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Approved' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Rejected' },
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  revoke_entitlement: 'Revoke Access',
  reclassify_tier: 'Reclassify Tier',
  disable_identity: 'Disable Identity',
  flag_for_review: 'Flag for Review',
}

export default function RemediationPage() {
  const queryClient = useQueryClient()
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['remediation-plans'],
    queryFn: async () => {
      const res = await fetch('/api/remediation')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tier_violations' }),
      })
      if (!res.ok) throw new Error('Failed to generate')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remediation-plans'] }),
  })

  const approveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/remediation/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remediation-plans'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ planId, reason }: { planId: string; reason: string }) => {
      const res = await fetch(`/api/remediation/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediation-plans'] })
      setShowRejectDialog(null)
      setRejectReason('')
    },
  })

  const plans: Plan[] = data?.plans || []
  const pendingCount = plans.filter(p => p.status === 'draft').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title text-[var(--text-primary)]">
            <ShieldAlert className="inline-block w-6 h-6 me-2 text-[var(--accent)]" />
            Remediation Queue
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Review and approve tier violation remediation proposals
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium">
              {pendingCount} pending approval
            </span>
          )}
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Scan & Generate Proposals
          </button>
        </div>
      </div>

      {/* Results of generation */}
      {generateMutation.isSuccess && (
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-600">
            Scan complete: {generateMutation.data.totalViolations} violations found,{' '}
            {generateMutation.data.proposedActions} actions proposed.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No remediation plans yet</p>
          <p className="text-sm mt-1">Click "Scan & Generate" to detect tier violations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const style = STATUS_STYLES[plan.status] || STATUS_STYLES.draft
            const Icon = style.icon
            const isExpanded = expandedPlan === plan.id
            const actions = (plan.rankedActions || []) as RemediationAction[]

            return (
              <div
                key={plan.id}
                className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden"
              >
                {/* Plan Header */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full flex items-center justify-between p-4 text-start hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${style.bg}`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.color} font-medium`}>
                          {style.label}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(plan.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mt-1 truncate">
                        {plan.executiveSummary}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                      <span>{actions.length} actions</span>
                      <span className="text-emerald-500">-{plan.projectedRiskReduction}% risk</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />}
                </button>

                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="border-t border-[var(--border-primary)] p-4 space-y-3">
                    {/* Quick Wins */}
                    {(plan.quickWins || []).length > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-600 mb-1">
                          Quick Wins (low effort, high impact)
                        </p>
                        {(plan.quickWins as RemediationAction[]).map((qw, i) => (
                          <p key={i} className="text-xs text-emerald-700">{qw.description}</p>
                        ))}
                      </div>
                    )}

                    {/* Action List */}
                    <div className="space-y-2">
                      {actions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center text-xs font-bold">
                            {action.priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                                {ACTION_TYPE_LABELS[action.actionType] || action.actionType}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {action.currentTier} → {action.effectiveTier}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                Risk: {action.riskScore}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                              {action.description}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                              {action.justification}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Approval Buttons */}
                    {plan.status === 'draft' && (
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-primary)]">
                        <button
                          onClick={() => setShowRejectDialog(plan.id)}
                          className="px-4 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/5"
                        >
                          <XCircle className="w-4 h-4 inline-block me-1" />
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Approve and execute ${actions.length} remediation actions? This cannot be undone.`)) {
                              approveMutation.mutate(plan.id)
                            }
                          }}
                          disabled={approveMutation.isPending}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 inline-block me-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 inline-block me-1" />
                          )}
                          Approve & Execute
                        </button>
                      </div>
                    )}

                    {/* Reject Dialog */}
                    {showRejectDialog === plan.id && (
                      <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 space-y-3">
                        <p className="text-sm font-medium text-red-600">Reject this remediation plan</p>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection (optional)..."
                          className="w-full p-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setShowRejectDialog(null); setRejectReason('') }}
                            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate({ planId: plan.id, reason: rejectReason })}
                            disabled={rejectMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
