'use client'

import { useState } from 'react'
import { AD_TIER_CONFIG, SEVERITY_CONFIG } from '@/lib/utils/constants'
import { formatDate, formatRelativeTime } from '@/lib/utils/formatters'
import type { IdentityDetail } from '@/lib/hooks/use-identities'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'entitlements', label: 'Entitlements' },
  { key: 'groups', label: 'Groups' },
  { key: 'violations', label: 'Violations' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'ai_insights', label: 'AI Insights' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface Props {
  data: IdentityDetail
}

export function IdentityTabs({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Tab bar */}
      <div className="border-b border-slate-200 px-6">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const count =
              tab.key === 'accounts' ? data.accounts.length :
              tab.key === 'entitlements' ? data.entitlements.length :
              tab.key === 'groups' ? data.groups.length :
              tab.key === 'violations' ? data.violations.length :
              tab.key === 'timeline' ? data.timeline.length :
              undefined

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'accounts' && <AccountsTab accounts={data.accounts} />}
        {activeTab === 'entitlements' && <EntitlementsTab entitlements={data.entitlements} />}
        {activeTab === 'groups' && <GroupsTab groups={data.groups} />}
        {activeTab === 'violations' && <ViolationsTab violations={data.violations} />}
        {activeTab === 'timeline' && <TimelineTab timeline={data.timeline} />}
        {activeTab === 'ai_insights' && <AIInsightsTab data={data} />}
      </div>
    </div>
  )
}

function OverviewTab({ data }: { data: IdentityDetail }) {
  const { identity } = data
  const fields = [
    { label: 'Display Name', value: identity.displayName },
    { label: 'UPN', value: identity.upn },
    { label: 'SAM Account Name', value: identity.samAccountName },
    { label: 'Email', value: identity.email },
    { label: 'Department', value: identity.department },
    { label: 'Source System', value: identity.sourceSystem?.replace(/_/g, ' ') },
    { label: 'Source ID', value: (identity as any).sourceId },
    { label: 'Last Logon', value: identity.lastLogonAt ? formatDate(identity.lastLogonAt) : null },
    { label: 'Password Last Set', value: identity.passwordLastSetAt ? formatDate(identity.passwordLastSetAt) : null },
    { label: 'Created in Source', value: identity.createdInSourceAt ? formatDate(identity.createdInSourceAt) : null },
    { label: 'Expiry', value: identity.expiryAt ? formatDate(identity.expiryAt) : null },
    { label: 'Created', value: identity.createdAt ? formatDate(identity.createdAt) : null },
  ].filter(f => f.value)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map((field) => (
        <div key={field.label}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{field.label}</p>
          <p className="text-sm text-slate-900 mt-0.5">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function AccountsTab({ accounts }: { accounts: IdentityDetail['accounts'] }) {
  if (accounts.length === 0) return <Empty label="No accounts linked" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Platform</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Account Name</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Enabled</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">MFA</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Last Auth</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {accounts.map((acc) => (
          <tr key={acc.id}>
            <td className="px-3 py-2 text-slate-700">{acc.platform.replace(/_/g, ' ').toUpperCase()}</td>
            <td className="px-3 py-2 font-medium text-slate-900">{acc.accountName}</td>
            <td className="px-3 py-2 text-slate-600 capitalize">{acc.accountType}</td>
            <td className="px-3 py-2">
              <span className={`text-xs font-medium ${acc.enabled ? 'text-green-600' : 'text-red-600'}`}>
                {acc.enabled ? 'Yes' : 'No'}
              </span>
            </td>
            <td className="px-3 py-2">
              <span className={`text-xs font-medium ${acc.mfaEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {acc.mfaEnabled ? acc.mfaMethods?.join(', ') || 'Enabled' : 'Disabled'}
              </span>
            </td>
            <td className="px-3 py-2 text-slate-500 text-xs">
              {acc.lastAuthenticatedAt ? formatRelativeTime(acc.lastAuthenticatedAt) : 'Never'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EntitlementsTab({ entitlements }: { entitlements: IdentityDetail['entitlements'] }) {
  if (entitlements.length === 0) return <Empty label="No entitlements assigned" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Permission</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Resource</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Tier</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Certification</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Last Used</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Risk Tags</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {entitlements.map((ent) => {
          const tierConfig = AD_TIER_CONFIG[ent.adTierOfPermission as keyof typeof AD_TIER_CONFIG]
          const certColors: Record<string, string> = {
            certified: 'text-green-600',
            pending: 'text-yellow-600',
            expired: 'text-red-600',
            revoked: 'text-slate-500',
          }
          return (
            <tr key={ent.id}>
              <td className="px-3 py-2">
                <p className="font-medium text-slate-900">{ent.permissionName}</p>
                <p className="text-xs text-slate-400 capitalize">{ent.permissionType.replace(/_/g, ' ')}</p>
              </td>
              <td className="px-3 py-2 text-slate-600 text-xs">{ent.resourceName}</td>
              <td className="px-3 py-2">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ color: tierConfig?.color, backgroundColor: tierConfig?.bgColor }}
                >
                  {tierConfig?.label}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs font-medium capitalize ${certColors[ent.certificationStatus] || ''}`}>
                  {ent.certificationStatus}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500 text-xs">
                {ent.lastUsedAt ? formatRelativeTime(ent.lastUsedAt) : 'Never'}
              </td>
              <td className="px-3 py-2">
                {ent.riskTags?.map((tag: string) => (
                  <span key={tag} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded mr-1">
                    {tag}
                  </span>
                ))}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function GroupsTab({ groups }: { groups: IdentityDetail['groups'] }) {
  if (groups.length === 0) return <Empty label="No group memberships" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Group</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Tier</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Membership</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Privileged</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {groups.map((g) => {
          const tierConfig = AD_TIER_CONFIG[g.groupAdTier as keyof typeof AD_TIER_CONFIG]
          return (
            <tr key={g.id}>
              <td className="px-3 py-2 font-medium text-slate-900">{g.groupName}</td>
              <td className="px-3 py-2 text-slate-600 capitalize text-xs">{g.groupType?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ color: tierConfig?.color, backgroundColor: tierConfig?.bgColor }}
                >
                  {tierConfig?.label}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-600 capitalize text-xs">{g.membershipType}</td>
              <td className="px-3 py-2">
                {g.isPrivileged && <span className="text-xs text-red-600 font-medium">Yes</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ViolationsTab({ violations }: { violations: IdentityDetail['violations'] }) {
  if (violations.length === 0) return <Empty label="No policy violations" />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Type</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Severity</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Policy</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Detected</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {violations.map((v) => {
          const sevConfig = SEVERITY_CONFIG[v.severity as keyof typeof SEVERITY_CONFIG]
          const statusColors: Record<string, string> = {
            open: 'bg-red-100 text-red-700',
            acknowledged: 'bg-yellow-100 text-yellow-700',
            remediated: 'bg-green-100 text-green-700',
            excepted: 'bg-blue-100 text-blue-700',
            false_positive: 'bg-slate-100 text-slate-600',
          }
          return (
            <tr key={v.id}>
              <td className="px-3 py-2 text-slate-700 capitalize text-xs">
                {v.violationType.replace(/_/g, ' ')}
              </td>
              <td className="px-3 py-2">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ color: sevConfig?.color, backgroundColor: sevConfig?.bgColor }}
                >
                  {sevConfig?.label}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${statusColors[v.status] || ''}`}>
                  {v.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-600 text-xs">{v.policyName}</td>
              <td className="px-3 py-2 text-slate-500 text-xs">{formatRelativeTime(v.detectedAt)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function TimelineTab({ timeline }: { timeline: IdentityDetail['timeline'] }) {
  if (timeline.length === 0) return <Empty label="No activity recorded" />
  return (
    <div className="space-y-4">
      {timeline.map((entry) => (
        <div key={entry.id} className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 capitalize">
                {entry.actionType.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400">
                {formatRelativeTime(entry.createdAt)}
              </span>
            </div>
            {entry.actorName && (
              <p className="text-xs text-slate-500">by {entry.actorName}</p>
            )}
            {entry.rationale && (
              <p className="text-sm text-slate-600 mt-0.5">{entry.rationale}</p>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
              entry.source === 'manual' ? 'bg-blue-50 text-blue-600' :
              entry.source === 'automated' ? 'bg-slate-100 text-slate-600' :
              'bg-purple-50 text-purple-600'
            }`}>
              {entry.source}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AIInsightsTab({ data }: { data: IdentityDetail }) {
  const { identity, violations, entitlements, groups } = data
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string
    recommendations: string[]
    riskNarrative: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const riskFactors: Array<{ factor: string; weight: string; description: string }> = (() => {
    if (identity.riskFactors && Array.isArray(identity.riskFactors)) {
      return identity.riskFactors
    }
    // Generate risk factor summary from identity data
    const factors: Array<{ factor: string; weight: string; description: string }> = []
    if (identity.tierViolation) {
      factors.push({
        factor: 'Tier Violation',
        weight: 'Critical',
        description: `Identity is classified as ${identity.adTier?.replace(/_/g, ' ')} but has access to ${identity.effectiveTier?.replace(/_/g, ' ')} resources`,
      })
    }
    const openViolations = violations.filter(v => v.status === 'open')
    if (openViolations.length > 0) {
      factors.push({
        factor: 'Open Violations',
        weight: openViolations.some(v => v.severity === 'critical') ? 'Critical' : 'High',
        description: `${openViolations.length} unresolved policy violation(s)`,
      })
    }
    const expiredCerts = entitlements.filter(e => e.certificationStatus === 'expired')
    if (expiredCerts.length > 0) {
      factors.push({
        factor: 'Expired Certifications',
        weight: 'Medium',
        description: `${expiredCerts.length} entitlement(s) with expired certification`,
      })
    }
    const unusedEntitlements = entitlements.filter(e => !e.lastUsedAt)
    if (unusedEntitlements.length > 0) {
      factors.push({
        factor: 'Unused Entitlements',
        weight: 'Medium',
        description: `${unusedEntitlements.length} entitlement(s) never used — candidates for revocation`,
      })
    }
    const privilegedGroups = groups.filter(g => g.isPrivileged)
    if (privilegedGroups.length > 0) {
      factors.push({
        factor: 'Privileged Group Membership',
        weight: 'High',
        description: `Member of ${privilegedGroups.length} privileged group(s)`,
      })
    }
    const toxicTags = entitlements.flatMap(e => e.riskTags || []).filter(t => t === 'toxic_combination' || t === 'sod_violation')
    if (toxicTags.length > 0) {
      factors.push({
        factor: 'Toxic Combinations',
        weight: 'Critical',
        description: `${toxicTags.length} entitlement(s) flagged for toxic combination or SoD violation`,
      })
    }
    if (identity.status === 'dormant') {
      factors.push({
        factor: 'Dormant Identity',
        weight: 'Medium',
        description: 'Identity has not logged on recently but remains active',
      })
    }
    if (identity.status === 'orphaned') {
      factors.push({
        factor: 'Orphaned Identity',
        weight: 'High',
        description: 'Non-human identity with no valid owner',
      })
    }
    return factors
  })()

  const riskLevel = identity.riskScore >= 80 ? 'Critical' : identity.riskScore >= 60 ? 'High' : identity.riskScore >= 30 ? 'Medium' : 'Low'

  const handleRequestAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: identity.id,
          scope: 'single_identity',
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Analysis request failed (${res.status})`)
      }
      const result = await res.json()
      setAnalysisResult({
        summary: result.executiveSummary || result.summary || 'Analysis complete.',
        recommendations: result.rankedActions?.map((a: any) => a.description || a.action || String(a)) || result.recommendations || [],
        riskNarrative: result.riskNarrative || result.narrative || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request AI analysis')
    } finally {
      setLoading(false)
    }
  }

  const weightColor: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Risk Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Risk Score</p>
            <p className={`text-lg font-bold ${
              identity.riskScore >= 80 ? 'text-red-600' :
              identity.riskScore >= 60 ? 'text-orange-600' :
              identity.riskScore >= 30 ? 'text-yellow-600' :
              'text-green-600'
            }`}>{identity.riskScore}/100</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Risk Level</p>
            <p className="text-sm font-medium text-slate-800">{riskLevel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tier Status</p>
            <p className="text-sm font-medium text-slate-800">
              {identity.adTier?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              {identity.tierViolation && (
                <span className="ml-1.5 text-xs text-red-600 font-medium">VIOLATION</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Open Violations</p>
            <p className="text-sm font-medium text-slate-800">
              {violations.filter(v => v.status === 'open').length}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Risk Factors</h3>
        {riskFactors.length === 0 ? (
          <p className="text-sm text-slate-400">No significant risk factors detected.</p>
        ) : (
          <div className="space-y-2">
            {riskFactors.map((rf, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${weightColor[rf.weight] || 'bg-slate-100 text-slate-600'}`}>
                  {rf.weight}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{rf.factor}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{rf.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
          <button
            onClick={handleRequestAnalysis}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Request AI Analysis'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {analysisResult ? (
          <div className="space-y-4">
            {analysisResult.riskNarrative && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-purple-800 uppercase tracking-wider mb-1">Risk Narrative</h4>
                <p className="text-sm text-purple-900">{analysisResult.riskNarrative}</p>
              </div>
            )}
            {analysisResult.summary && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Executive Summary</h4>
                <p className="text-sm text-slate-800">{analysisResult.summary}</p>
              </div>
            )}
            {analysisResult.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Recommendations</h4>
                <div className="space-y-2">
                  {analysisResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !loading ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500 mb-1">No AI analysis available yet.</p>
            <p className="text-xs text-slate-400">Click &quot;Request AI Analysis&quot; to generate insights for this identity.</p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mb-2" />
            <p className="text-sm text-slate-500">Analyzing identity risk profile...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-400 text-center py-8">{label}</p>
}
