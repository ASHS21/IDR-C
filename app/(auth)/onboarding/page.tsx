'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Building2, Plug, RefreshCw, Users,
  TreePine, Cloud, ShieldCheck, Compass, Upload,
  Check, ChevronRight, ChevronLeft, X, Plus, Loader2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrgData {
  name: string
  industry: string
  domain: string
  regulatoryFrameworks: string[]
  country: string
}

interface IntegrationConfig {
  type: string
  name: string
  config: Record<string, string>
}

interface TeamMember {
  email: string
  role: string
}

interface SyncProgress {
  stage: string
  count: number
  done: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Organization', icon: Building2 },
  { id: 2, label: 'Connect Source', icon: Plug },
  { id: 3, label: 'Initial Sync', icon: RefreshCw },
  { id: 4, label: 'Invite Team', icon: Users },
]

const INDUSTRIES = [
  'Banking', 'Energy', 'Government', 'Healthcare', 'Technology', 'Telecom', 'Other',
]

const FRAMEWORKS = [
  { value: 'NCA_ECC', label: 'NCA ECC' },
  { value: 'SAMA_CSF', label: 'SAMA CSF' },
  { value: 'PDPL', label: 'PDPL' },
  { value: 'ISO_27001', label: 'ISO 27001' },
  { value: 'NIST', label: 'NIST' },
]

const COUNTRIES = [
  'Saudi Arabia', 'UAE', 'Bahrain', 'Kuwait', 'Oman', 'Qatar', 'Egypt', 'Jordan', 'Other',
]

const INTEGRATION_TYPES = [
  { type: 'active_directory', name: 'Active Directory', icon: TreePine, desc: 'On-premise AD via LDAP' },
  { type: 'azure_ad', name: 'Azure AD / Entra ID', icon: Cloud, desc: 'Microsoft cloud identity' },
  { type: 'okta', name: 'Okta', icon: ShieldCheck, desc: 'Okta workforce identity' },
  { type: 'sailpoint', name: 'SailPoint IdentityIQ', icon: Compass, desc: 'IGA platform' },
  { type: 'csv_import', name: 'CSV Import', icon: Upload, desc: 'Upload identity data' },
]

const INTEGRATION_FIELDS: Record<string, { label: string; key: string; type: string; placeholder: string }[]> = {
  active_directory: [
    { label: 'LDAP Server URL', key: 'ldapUrl', type: 'text', placeholder: 'ldap://dc01.corp.local:389' },
    { label: 'Base DN', key: 'baseDn', type: 'text', placeholder: 'DC=corp,DC=local' },
    { label: 'Bind DN', key: 'bindDn', type: 'text', placeholder: 'CN=svc-radar,OU=Service Accounts,DC=corp,DC=local' },
    { label: 'Bind Password', key: 'bindPassword', type: 'password', placeholder: '••••••••' },
  ],
  azure_ad: [
    { label: 'Tenant ID', key: 'tenantId', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Client ID', key: 'clientId', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Client Secret', key: 'clientSecret', type: 'password', placeholder: '••••••••' },
  ],
  okta: [
    { label: 'Okta Domain', key: 'domain', type: 'text', placeholder: 'dev-123456.okta.com' },
    { label: 'API Token', key: 'apiToken', type: 'password', placeholder: '••••••••' },
  ],
  sailpoint: [
    { label: 'Tenant URL', key: 'tenantUrl', type: 'text', placeholder: 'https://tenant.api.identitynow.com' },
    { label: 'Client ID', key: 'clientId', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Client Secret', key: 'clientSecret', type: 'password', placeholder: '••••••••' },
  ],
  csv_import: [],
}

const ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'iam_admin', label: 'IAM Admin' },
  { value: 'ciso', label: 'CISO' },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Organization
  const [org, setOrg] = useState<OrgData>({
    name: '',
    industry: '',
    domain: '',
    regulatoryFrameworks: [],
    country: 'Saudi Arabia',
  })

  // Step 2: Integration
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<string | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, string>>({})
  const [integrationSaved, setIntegrationSaved] = useState(false)
  const [skippedIntegration, setSkippedIntegration] = useState(false)

  // Step 3: Sync
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([])
  const [syncComplete, setSyncComplete] = useState(false)
  const [syncResults, setSyncResults] = useState({ identities: 0, violations: 0, risks: 0 })

  // Step 4: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ email: '', role: 'viewer' }])

  // Redirect if already has org
  useEffect(() => {
    if (session?.user?.orgId) {
      router.push('/dashboard')
    }
  }, [session, router])

  // Auto-suggest domain from email
  useEffect(() => {
    if (session?.user?.email && !org.domain) {
      const emailDomain = session.user.email.split('@')[1]
      if (emailDomain) {
        setOrg(prev => ({ ...prev, domain: emailDomain }))
      }
    }
  }, [session?.user?.email, org.domain])

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-[var(--text-tertiary)] animate-pulse">Loading...</div>
      </main>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  // ─── Step Handlers ─────────────────────────────────────────────────────────

  const handleOrgSubmit = async () => {
    if (!org.name || !org.domain) {
      setError('Organization name and domain are required.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'organization', data: org }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create organization')
        setLoading(false)
        return
      }

      // Refresh session to pick up new orgId
      await updateSession()
      setStep(2)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleIntegrationSubmit = async () => {
    if (!selectedIntegrationType) return
    setError('')
    setLoading(true)

    try {
      const typeName = INTEGRATION_TYPES.find(t => t.type === selectedIntegrationType)?.name || selectedIntegrationType
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'integration',
          data: {
            type: selectedIntegrationType,
            name: typeName,
            config: integrationConfig,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save integration')
        setLoading(false)
        return
      }

      setIntegrationSaved(true)
      setStep(3)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const simulateSync = useCallback(() => {
    if (skippedIntegration) {
      setSyncComplete(true)
      return
    }

    const stages = [
      { stage: 'Importing identities...', count: 0, done: false },
      { stage: 'Classifying tiers...', count: 0, done: false },
      { stage: 'Detecting violations...', count: 0, done: false },
      { stage: 'Scoring risk...', count: 0, done: false },
    ]

    setSyncProgress([stages[0]])

    let currentStage = 0
    const targetCounts = [247, 247, 18, 247]

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        const updated = [...prev]
        const current = { ...updated[currentStage] }
        current.count = Math.min(current.count + Math.floor(Math.random() * 30) + 10, targetCounts[currentStage])

        if (current.count >= targetCounts[currentStage]) {
          current.done = true
          current.count = targetCounts[currentStage]
          updated[currentStage] = current

          currentStage++
          if (currentStage < stages.length) {
            updated.push({ ...stages[currentStage] })
          } else {
            clearInterval(interval)
            setSyncComplete(true)
            setSyncResults({ identities: 247, violations: 18, risks: 7 })
          }
        } else {
          updated[currentStage] = current
        }
        return updated
      })
    }, 400)

    return () => clearInterval(interval)
  }, [skippedIntegration])

  useEffect(() => {
    if (step === 3) {
      const cleanup = simulateSync()
      return cleanup
    }
  }, [step, simulateSync])

  const handleTeamInvite = async () => {
    const validMembers = teamMembers.filter(m => m.email.trim())
    if (validMembers.length === 0) {
      // Skip, no invites
      router.push('/dashboard')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'team', data: { members: validMembers } }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send invitations')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addTeamMember = () => {
    setTeamMembers(prev => [...prev, { email: '', role: 'viewer' }])
  }

  const removeTeamMember = (index: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index))
  }

  const updateTeamMember = (index: number, field: 'email' | 'role', value: string) => {
    setTeamMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const toggleFramework = (fw: string) => {
    setOrg(prev => ({
      ...prev,
      regulatoryFrameworks: prev.regulatoryFrameworks.includes(fw)
        ? prev.regulatoryFrameworks.filter(f => f !== fw)
        : [...prev.regulatoryFrameworks, fw],
    }))
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--bg-secondary)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-info)] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-body font-semibold text-[var(--text-primary)]">Identity Radar</span>
          </div>
          <span className="text-caption text-[var(--text-tertiary)]">Setup Wizard</span>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const StepIcon = s.icon
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium transition-colors ${
                      isDone ? 'bg-[var(--color-low)] text-white' :
                      isActive ? 'bg-[var(--color-info)] text-white' :
                      'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                    }`}>
                      {isDone ? <Check size={14} /> : <StepIcon size={14} />}
                    </div>
                    <span className={`text-caption font-medium hidden sm:block ${
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${
                      step > s.id ? 'bg-[var(--color-low)]' : 'bg-[var(--border-default)]'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-[var(--radius-card)] text-caption font-medium flex items-center justify-between" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
              {error}
              <button onClick={() => setError('')} className="ml-2"><X size={14} /></button>
            </div>
          )}

          {/* Step 1: Organization Setup */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">Set up your organization</h2>
              <p className="text-body text-[var(--text-secondary)] mb-8">
                Tell us about your organization so we can configure the right compliance frameworks.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                    Organization name <span className="text-[var(--color-critical)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={org.name}
                    onChange={(e) => setOrg({ ...org, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                    placeholder="ACME Financial Services"
                  />
                </div>

                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                    Industry
                  </label>
                  <select
                    value={org.industry}
                    onChange={(e) => setOrg({ ...org, industry: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                    Primary domain <span className="text-[var(--color-critical)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={org.domain}
                    onChange={(e) => setOrg({ ...org, domain: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                    placeholder="acmefs.sa"
                  />
                </div>

                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                    Regulatory frameworks
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FRAMEWORKS.map(fw => (
                      <button
                        key={fw.value}
                        type="button"
                        onClick={() => toggleFramework(fw.value)}
                        className={`px-3 py-1.5 rounded-[var(--radius-badge)] text-caption font-medium border transition-colors ${
                          org.regulatoryFrameworks.includes(fw.value)
                            ? 'bg-[var(--color-info)] text-white border-[var(--color-info)]'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {fw.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                    Country / Region
                  </label>
                  <select
                    value={org.country}
                    onChange={(e) => setOrg({ ...org, country: e.target.value })}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleOrgSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Continue
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Connect First Source */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">Connect your first source</h2>
              <p className="text-body text-[var(--text-secondary)] mb-8">
                Connect an identity source to import users, groups, and entitlements. You can add more sources later.
              </p>

              {!selectedIntegrationType ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {INTEGRATION_TYPES.map(int => {
                    const IntIcon = int.icon
                    return (
                      <button
                        key={int.type}
                        onClick={() => {
                          setSelectedIntegrationType(int.type)
                          setIntegrationConfig({})
                        }}
                        className="p-5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-left hover:border-[var(--color-info)] hover:shadow-md transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] flex items-center justify-center mb-3 group-hover:bg-[var(--color-info)]/20 transition-colors">
                          <IntIcon size={20} className="text-[var(--color-info)]" />
                        </div>
                        <h3 className="text-body font-semibold text-[var(--text-primary)]">{int.name}</h3>
                        <p className="text-caption text-[var(--text-secondary)] mt-1">{int.desc}</p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IntType = INTEGRATION_TYPES.find(t => t.type === selectedIntegrationType)
                        const IntIcon = IntType?.icon || Plug
                        return (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-info-bg)] flex items-center justify-center">
                              <IntIcon size={16} className="text-[var(--color-info)]" />
                            </div>
                            <h3 className="text-body font-semibold text-[var(--text-primary)]">{IntType?.name}</h3>
                          </>
                        )
                      })()}
                    </div>
                    <button
                      onClick={() => { setSelectedIntegrationType(null); setIntegrationConfig({}) }}
                      className="text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Change
                    </button>
                  </div>

                  {selectedIntegrationType === 'csv_import' ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-card)]">
                      <Upload size={32} className="mx-auto text-[var(--text-tertiary)] mb-3" />
                      <p className="text-body text-[var(--text-secondary)]">CSV import will be available after setup</p>
                      <p className="text-caption text-[var(--text-tertiary)] mt-1">You can import identities from Settings later</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(INTEGRATION_FIELDS[selectedIntegrationType] || []).map(field => (
                        <div key={field.key}>
                          <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            value={integrationConfig[field.key] || ''}
                            onChange={(e) => setIntegrationConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)] font-[var(--font-mono)]"
                            placeholder={field.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedIntegrationType !== 'csv_import' && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleIntegrationSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Save & Continue
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={() => {
                    setSkippedIntegration(true)
                    setStep(3)
                  }}
                  className="text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Initial Sync */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">
                {skippedIntegration ? 'No source connected' : 'Initial sync'}
              </h2>
              <p className="text-body text-[var(--text-secondary)] mb-8">
                {skippedIntegration
                  ? 'You can connect identity sources later from Settings > Integrations.'
                  : 'We are importing and analyzing your identity data.'
                }
              </p>

              {skippedIntegration ? (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-info-bg)] flex items-center justify-center mx-auto mb-4">
                    <Plug size={24} className="text-[var(--color-info)]" />
                  </div>
                  <p className="text-body text-[var(--text-primary)] font-medium">No worries!</p>
                  <p className="text-caption text-[var(--text-secondary)] mt-2">
                    You can connect sources later in Settings. We will generate sample data so you can explore the platform.
                  </p>
                </div>
              ) : (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 space-y-4">
                  {syncProgress.map((sp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {sp.done ? (
                        <div className="w-6 h-6 rounded-full bg-[var(--color-low)] flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                      ) : (
                        <Loader2 size={20} className="text-[var(--color-info)] animate-spin flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="text-body text-[var(--text-primary)]">{sp.stage}</span>
                        {sp.count > 0 && (
                          <span className="ml-2 text-caption text-[var(--text-tertiary)]">{sp.count}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {syncComplete && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-[var(--color-low)] flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                        <span className="text-body font-medium text-[var(--color-low)]">Sync complete!</span>
                      </div>
                      <p className="text-body text-[var(--text-secondary)]">
                        We found <strong className="text-[var(--text-primary)]">{syncResults.identities} identities</strong>,{' '}
                        <strong className="text-[var(--color-high)]">{syncResults.violations} tier violations</strong>, and{' '}
                        <strong className="text-[var(--color-critical)]">{syncResults.risks} critical risks</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!syncComplete && !skippedIntegration}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Invite Team */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">Invite your team</h2>
              <p className="text-body text-[var(--text-secondary)] mb-8">
                Add team members who will help manage your identity posture. You can always invite more later.
              </p>

              <div className="space-y-3">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateTeamMember(idx, 'email', e.target.value)}
                        className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent placeholder:text-[var(--text-tertiary)]"
                        placeholder="colleague@company.sa"
                      />
                    </div>
                    <select
                      value={member.role}
                      onChange={(e) => updateTeamMember(idx, 'role', e.target.value)}
                      className="px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:border-transparent"
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {teamMembers.length > 1 && (
                      <button
                        onClick={() => removeTeamMember(idx)}
                        className="p-2.5 text-[var(--text-tertiary)] hover:text-[var(--color-critical)] transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addTeamMember}
                className="mt-3 inline-flex items-center gap-1.5 text-caption font-medium text-[var(--color-info)] hover:opacity-80 transition-opacity"
              >
                <Plus size={14} /> Add another member
              </button>

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleTeamInvite}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Complete Setup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
