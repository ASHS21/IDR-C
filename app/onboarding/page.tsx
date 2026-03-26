'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Building2, Plug, Users, ChevronRight, Check, Server, Cloud, ArrowRight } from 'lucide-react'

const STEPS = [
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'source', label: 'Connect Source', icon: Plug },
  { id: 'team', label: 'Invite Team', icon: Users },
]

const INDUSTRIES = ['Banking', 'Energy', 'Government', 'Healthcare', 'Technology', 'Telecom', 'Other']
const FRAMEWORKS = ['NCA_ECC', 'SAMA_CSF', 'PDPL', 'ISO_27001', 'NIST']
const SOURCES = [
  { type: 'active_directory', label: 'Active Directory', icon: Server, desc: 'On-premises AD via LDAP or agent' },
  { type: 'azure_ad', label: 'Azure AD / Entra ID', icon: Cloud, desc: 'Microsoft Graph API integration' },
  { type: 'okta', label: 'Okta', icon: Shield, desc: 'Okta API token integration' },
  { type: 'sailpoint', label: 'SailPoint', icon: Shield, desc: 'IdentityNow API integration' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Step 1: Org
  const [orgName, setOrgName] = useState('')
  const [domain, setDomain] = useState('')
  const [industry, setIndustry] = useState('')
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])

  // Step 2: Source
  const [selectedSource, setSelectedSource] = useState('')

  const handleOrgSubmit = async () => {
    setLoading(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'organization',
        data: { name: orgName, domain, industry, regulatoryFrameworks: selectedFrameworks },
      }),
    })
    setLoading(false)
    setCurrentStep(1)
  }

  const handleSourceSubmit = async () => {
    if (selectedSource) {
      setLoading(true)
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'integration',
          data: { type: selectedSource, name: SOURCES.find(s => s.type === selectedSource)?.label || selectedSource },
        }),
      })
      setLoading(false)
    }
    setCurrentStep(2)
  }

  const handleComplete = () => {
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[var(--bg-secondary)] flex">
      {/* Left sidebar - steps */}
      <div className="hidden md:flex w-72 bg-slate-900 flex-col p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-info)] flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-body font-semibold text-white">Identity Radar</h1>
            <p className="text-micro text-slate-400">Setup Wizard</p>
          </div>
        </div>

        <div className="space-y-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = i === currentStep
            const isDone = i < currentStep
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-[var(--color-low)]' : isActive ? 'bg-[var(--color-info)]' : 'bg-slate-700'
                }`}>
                  {isDone ? <Check size={14} className="text-white" /> : <Icon size={14} className="text-white" />}
                </div>
                <span className={`text-body ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step 1: Organization */}
          {currentStep === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">Set up your organization</h2>
              <p className="text-caption text-[var(--text-secondary)] mb-8">Tell us about your organization to customize Identity Radar.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">Organization Name</label>
                  <input
                    value={orgName} onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                    placeholder="Acme Financial Services"
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">Primary Domain</label>
                  <input
                    value={domain} onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                    placeholder="acmefs.sa"
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">Industry</label>
                  <select
                    value={industry} onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-medium text-[var(--text-primary)] mb-1.5">Regulatory Frameworks</label>
                  <div className="flex flex-wrap gap-2">
                    {FRAMEWORKS.map(fw => (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => setSelectedFrameworks(prev =>
                          prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]
                        )}
                        className={`px-3 py-1.5 rounded-[var(--radius-button)] text-micro font-medium border transition-colors ${
                          selectedFrameworks.includes(fw)
                            ? 'bg-[var(--color-info)] text-white border-[var(--color-info)]'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        {fw.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleOrgSubmit}
                  disabled={!orgName || !domain || loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Creating...' : 'Continue'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Connect Source */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-title text-[var(--text-primary)] mb-1">Connect your first source</h2>
              <p className="text-caption text-[var(--text-secondary)] mb-8">Choose an identity source to import data from.</p>

              <div className="space-y-3">
                {SOURCES.map(source => {
                  const Icon = source.icon
                  return (
                    <button
                      key={source.type}
                      onClick={() => setSelectedSource(source.type)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[var(--radius-card)] border transition-colors text-left ${
                        selectedSource === source.type
                          ? 'border-[var(--color-info)] bg-[var(--color-info-bg)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <p className="text-body font-medium text-[var(--text-primary)]">{source.label}</p>
                        <p className="text-caption text-[var(--text-tertiary)]">{source.desc}</p>
                      </div>
                      {selectedSource === source.type && (
                        <Check size={18} className="ml-auto text-[var(--color-info)]" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-2.5 border border-[var(--border-default)] rounded-[var(--radius-button)] text-body text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSourceSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Continue'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[var(--color-low-bg)] flex items-center justify-center mx-auto mb-4">
                  <Check size={32} style={{ color: 'var(--color-low)' }} />
                </div>
                <h2 className="text-title text-[var(--text-primary)] mb-1">You&apos;re all set!</h2>
                <p className="text-caption text-[var(--text-secondary)]">
                  Your organization is configured. You can invite team members from Settings later.
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90"
              >
                Go to Dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
