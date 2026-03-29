'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RiskGauge } from '@/components/ui/risk-gauge'
import { ActionDialog } from './action-dialog'
import { AD_TIER_CONFIG, IDENTITY_STATUS_CONFIG } from '@/lib/utils/constants'
import { formatDate } from '@/lib/utils/formatters'
import { useSession } from 'next-auth/react'
import { hasRole } from '@/lib/utils/rbac'
import type { AppRole } from '@/lib/utils/rbac'
import type { IdentityDetail } from '@/lib/hooks/use-identities'

interface Props {
  data: IdentityDetail
}

type DialogType = 'update-tier' | 'trigger-review' | 'certify' | 'disable' | null

export function IdentityDetailHeader({ data }: Props) {
  const { data: session } = useSession()
  const { identity, manager, owner } = data
  const tierConfig = AD_TIER_CONFIG[identity.adTier as keyof typeof AD_TIER_CONFIG]
  const statusConfig = IDENTITY_STATUS_CONFIG[identity.status as keyof typeof IDENTITY_STATUS_CONFIG]
  const userRole = (session?.user as any)?.appRole as AppRole | undefined

  const [openDialog, setOpenDialog] = useState<DialogType>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Form state for dialogs
  const [newTier, setNewTier] = useState(identity.adTier)
  const [rationale, setRationale] = useState('')
  const [disableReason, setDisableReason] = useState('')

  const closeDialog = () => {
    setOpenDialog(null)
    setDialogLoading(false)
    setDialogError(null)
    setRationale('')
    setDisableReason('')
  }

  const handleUpdateTier = async () => {
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch('/api/actions/update-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId: identity.id, newTier, rationale }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update tier')
      }
      closeDialog()
      window.location.reload()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to update tier')
      setDialogLoading(false)
    }
  }

  const handleTriggerReview = async (reviewType: string) => {
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch('/api/actions/trigger-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityIds: [identity.id], reviewType }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to trigger review')
      }
      closeDialog()
      window.location.reload()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to trigger review')
      setDialogLoading(false)
    }
  }

  const handleDisable = async () => {
    setDialogLoading(true)
    setDialogError(null)
    try {
      const res = await fetch('/api/actions/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: identity.id,
          reason: disableReason,
          action: 'disable',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to disable identity')
      }
      closeDialog()
      window.location.reload()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to disable identity')
      setDialogLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Identity info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{identity.type === 'human' ? '\u{1F464}' : '\u{1F916}'}</span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{identity.displayName}</h2>
                {identity.upn && (
                  <p className="text-sm text-slate-500">{identity.upn}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color: tierConfig?.color, backgroundColor: tierConfig?.bgColor }}
              >
                {tierConfig?.label}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color: statusConfig?.color, backgroundColor: `${statusConfig?.color}15` }}
              >
                {statusConfig?.label}
              </span>
              {identity.tierViolation && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
                  TIER VIOLATION
                </span>
              )}
              {(() => {
                const dq = (identity as any).dataQuality as { score?: number } | null
                if (!dq?.score) return null
                const score = dq.score
                const bg = score > 80 ? '#dcfce7' : score > 50 ? '#fef3c7' : '#fee2e2'
                const fg = score > 80 ? '#166534' : score > 50 ? '#92400e' : '#991b1b'
                return (
                  <>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: bg, color: fg }}>
                      Quality: {score}/100
                    </span>
                    {score < 60 && (
                      <Link href="/dashboard/data-quality" className="text-xs text-blue-600 hover:underline">
                        Improve Data
                      </Link>
                    )}
                  </>
                )
              })()}
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                {identity.subType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {identity.department && (
                <div>
                  <span className="text-slate-500">Department:</span>{' '}
                  <span className="text-slate-700">{identity.department}</span>
                </div>
              )}
              {identity.email && (
                <div>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="text-slate-700">{identity.email}</span>
                </div>
              )}
              {manager && (
                <div>
                  <span className="text-slate-500">Manager:</span>{' '}
                  <Link href={`/dashboard/identities/${manager.id}`} className="text-blue-600 hover:underline">
                    {manager.displayName}
                  </Link>
                </div>
              )}
              {owner && (
                <div>
                  <span className="text-slate-500">Owner:</span>{' '}
                  <Link href={`/dashboard/identities/${owner.id}`} className="text-blue-600 hover:underline">
                    {owner.displayName}
                  </Link>
                </div>
              )}
              {identity.lastLogonAt && (
                <div>
                  <span className="text-slate-500">Last Logon:</span>{' '}
                  <span className="text-slate-700">{formatDate(identity.lastLogonAt)}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Source:</span>{' '}
                <span className="text-slate-700">{identity.sourceSystem.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Risk gauge + actions */}
          <div className="flex flex-col items-center gap-4">
            <RiskGauge value={identity.riskScore} label="Risk Score" size={140} />

            {userRole && (
              <div className="flex flex-wrap gap-2">
                {hasRole(userRole, 'analyst') && (
                  <button
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    onClick={() => setOpenDialog('trigger-review')}
                  >
                    Trigger Review
                  </button>
                )}
                {hasRole(userRole, 'iam_admin') && (
                  <>
                    <button
                      className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                      onClick={() => {
                        setNewTier(identity.adTier)
                        setOpenDialog('update-tier')
                      }}
                    >
                      Update Tier
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      onClick={() => setOpenDialog('certify')}
                    >
                      Certify All
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                      onClick={() => setOpenDialog('disable')}
                    >
                      Disable
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Tier Dialog */}
      <ActionDialog
        isOpen={openDialog === 'update-tier'}
        onClose={closeDialog}
        title="Update AD Tier"
        onConfirm={handleUpdateTier}
        confirmLabel="Update Tier"
        loading={dialogLoading}
      >
        {dialogError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{dialogError}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Tier</label>
          <select
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="tier_0">Tier 0 - Identity Plane Control</option>
            <option value="tier_1">Tier 1 - Server &amp; Application Control</option>
            <option value="tier_2">Tier 2 - Workstation &amp; End-User</option>
            <option value="unclassified">Unclassified</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rationale</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder="Explain why this tier change is needed..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>
      </ActionDialog>

      {/* Trigger Review Dialog */}
      <ActionDialog
        isOpen={openDialog === 'trigger-review'}
        onClose={closeDialog}
        title="Trigger Access Review"
        onConfirm={() => handleTriggerReview('access')}
        confirmLabel="Trigger Review"
        loading={dialogLoading}
      >
        {dialogError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{dialogError}</p>
          </div>
        )}
        <p className="text-sm text-slate-600">
          This will initiate an access review for <span className="font-medium text-slate-900">{identity.displayName}</span>.
          The identity&#39;s manager will be notified and asked to review all entitlements.
        </p>
      </ActionDialog>

      {/* Certify All Dialog */}
      <ActionDialog
        isOpen={openDialog === 'certify'}
        onClose={closeDialog}
        title="Certify All Entitlements"
        onConfirm={() => handleTriggerReview('certification')}
        confirmLabel="Certify All"
        loading={dialogLoading}
      >
        {dialogError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{dialogError}</p>
          </div>
        )}
        <p className="text-sm text-slate-600">
          This will trigger a certification review for all entitlements belonging to{' '}
          <span className="font-medium text-slate-900">{identity.displayName}</span>.
        </p>
        <p className="text-xs text-slate-500">
          {data.entitlements.length} entitlement(s) will be included in this certification campaign.
        </p>
      </ActionDialog>

      {/* Disable Identity Dialog */}
      <ActionDialog
        isOpen={openDialog === 'disable'}
        onClose={closeDialog}
        title="Disable Identity"
        onConfirm={handleDisable}
        confirmLabel="Disable Identity"
        confirmVariant="destructive"
        loading={dialogLoading}
      >
        {dialogError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{dialogError}</p>
          </div>
        )}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800 font-medium">Warning</p>
          <p className="text-sm text-red-700 mt-1">
            Disabling this identity will revoke all active sessions and prevent future authentication.
            This action can be reversed by an IAM administrator.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason for disabling</label>
          <textarea
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            rows={3}
            placeholder="Provide a reason for disabling this identity..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
        </div>
      </ActionDialog>
    </>
  )
}
