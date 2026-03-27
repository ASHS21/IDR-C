'use client'

import { useState } from 'react'

interface IntegrationWizardProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

type IntegrationType = 'active_directory' | 'azure_ad' | 'okta' | 'csv' | 'sailpoint_iiq' | 'broadcom_sso' | 'broadcom_pam' | 'servicenow'

interface TypeOption {
  type: IntegrationType
  label: string
  description: string
  icon: React.ReactNode
}

const INTEGRATION_TYPES: TypeOption[] = [
  {
    type: 'active_directory',
    label: 'Active Directory',
    description: 'Connect via LDAP to import users, groups, and OUs',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    type: 'azure_ad',
    label: 'Azure AD / Entra ID',
    description: 'Connect via Microsoft Graph API for users, apps, and roles',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
  },
  {
    type: 'okta',
    label: 'Okta',
    description: 'Connect via Okta API for users, apps, and MFA factors',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    type: 'sailpoint_iiq',
    label: 'SailPoint IdentityIQ',
    description: 'Connect via REST/SCIM API for identities, roles, entitlements, and certifications',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    type: 'broadcom_sso',
    label: 'Broadcom SiteMinder SSO',
    description: 'Connect to SiteMinder for SSO policies, user directories, and auth events',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    type: 'broadcom_pam',
    label: 'Broadcom PAM',
    description: 'Connect to Privileged Access Manager for vaults, credentials, and session audit',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    type: 'servicenow',
    label: 'ServiceNow',
    description: 'Import users, groups, and roles from ServiceNow ITSM/ITOM',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
      </svg>
    ),
  },
  {
    type: 'csv',
    label: 'CSV Import',
    description: 'Paste or upload CSV data for bulk identity import',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

type Step = 'choose' | 'configure' | 'test' | 'confirm'

export function IntegrationWizard({ isOpen, onClose, onCreated }: IntegrationWizardProps) {
  const [step, setStep] = useState<Step>('choose')
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null)
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep('choose')
    setSelectedType(null)
    setName('')
    setCredentials({})
    setTestResult(null)
    setTesting(false)
    setSaving(false)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSelectType(type: IntegrationType) {
    setSelectedType(type)
    setName(INTEGRATION_TYPES.find(t => t.type === type)?.label || '')
    setCredentials({})
    setTestResult(null)
    setStep('configure')
  }

  function handleFieldChange(field: string, value: string) {
    setCredentials(prev => ({ ...prev, [field]: value }))
  }

  async function handleTestConnection() {
    if (!selectedType) return
    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, credentials }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.ok) {
        setStep('confirm')
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Connection test failed' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!selectedType) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: selectedType,
          config: credentials,
          syncFrequencyMinutes: 360,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to save' }))
        throw new Error(data.error || 'Failed to save integration')
      }

      onCreated()
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save integration')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Connect New Source</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              {step === 'choose' && 'Select an integration type'}
              {step === 'configure' && `Configure ${selectedType?.replace(/_/g, ' ')}`}
              {step === 'test' && 'Test connection'}
              {step === 'confirm' && 'Confirm and save'}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 px-4 pt-4">
          {(['choose', 'configure', 'test', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s
                  ? 'bg-[var(--color-accent)] text-white'
                  : (['choose', 'configure', 'test', 'confirm'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
              }`}>
                {(['choose', 'configure', 'test', 'confirm'].indexOf(step) > i) ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${(['choose', 'configure', 'test', 'confirm'].indexOf(step) > i) ? 'bg-green-500' : 'bg-[var(--bg-secondary)]'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Choose Type */}
          {step === 'choose' && (
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {INTEGRATION_TYPES.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectType(opt.type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[var(--border-default)] hover:border-[var(--color-accent)] hover:bg-[var(--bg-secondary)] transition-colors text-center"
                >
                  <span className="text-[var(--text-secondary)]">{opt.icon}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{opt.label}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedType && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Integration Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
              </div>

              {selectedType === 'active_directory' && (
                <>
                  <FormField label="LDAP Host" field="host" value={credentials.host} onChange={handleFieldChange} placeholder="ldap.example.com" />
                  <FormField label="Port" field="port" value={credentials.port} onChange={handleFieldChange} placeholder="389" />
                  <FormField label="Base DN" field="baseDN" value={credentials.baseDN} onChange={handleFieldChange} placeholder="DC=example,DC=com" />
                  <FormField label="Bind DN" field="bindDN" value={credentials.bindDN} onChange={handleFieldChange} placeholder="CN=admin,DC=example,DC=com" />
                  <FormField label="Bind Password" field="bindPassword" value={credentials.bindPassword} onChange={handleFieldChange} type="password" />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useTLS"
                      checked={credentials.useTLS === 'true'}
                      onChange={(e) => handleFieldChange('useTLS', String(e.target.checked))}
                      className="rounded border-[var(--border-default)] w-4 h-4"
                    />
                    <label htmlFor="useTLS" className="text-xs text-[var(--text-secondary)]">Use TLS (LDAPS)</label>
                  </div>
                </>
              )}

              {selectedType === 'azure_ad' && (
                <>
                  <FormField label="Tenant ID" field="tenantId" value={credentials.tenantId} onChange={handleFieldChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <FormField label="Client ID" field="clientId" value={credentials.clientId} onChange={handleFieldChange} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  <FormField label="Client Secret" field="clientSecret" value={credentials.clientSecret} onChange={handleFieldChange} type="password" />
                </>
              )}

              {selectedType === 'okta' && (
                <>
                  <FormField label="Okta Domain" field="domain" value={credentials.domain} onChange={handleFieldChange} placeholder="example.okta.com" />
                  <FormField label="API Token" field="apiToken" value={credentials.apiToken} onChange={handleFieldChange} type="password" />
                </>
              )}

              {selectedType === 'sailpoint_iiq' && (
                <>
                  <FormField label="IIQ Base URL" field="baseUrl" value={credentials.baseUrl} onChange={handleFieldChange} placeholder="https://sailpoint-iiq.example.com/identityiq" />
                  <FormField label="Admin Username" field="username" value={credentials.username} onChange={handleFieldChange} placeholder="spadmin" />
                  <FormField label="Admin Password" field="password" value={credentials.password} onChange={handleFieldChange} type="password" />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useSCIM"
                      checked={credentials.useSCIM === 'true'}
                      onChange={(e) => handleFieldChange('useSCIM', String(e.target.checked))}
                      className="rounded border-[var(--border-default)] w-4 h-4"
                    />
                    <label htmlFor="useSCIM" className="text-xs text-[var(--text-secondary)]">Use SCIM 2.0 endpoint (recommended for IIQ 8.x+)</label>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Required Graph permissions: SCIM 2.0 Users/Groups read, or Legacy REST API identities/roles/entitlements read.
                  </p>
                </>
              )}

              {selectedType === 'broadcom_sso' && (
                <>
                  <FormField label="SiteMinder Base URL" field="baseUrl" value={credentials.baseUrl} onChange={handleFieldChange} placeholder="https://siteminder.example.com:8443" />
                  <FormField label="Admin Username" field="adminUser" value={credentials.adminUser} onChange={handleFieldChange} placeholder="siteminder-admin" />
                  <FormField label="Admin Password" field="adminPassword" value={credentials.adminPassword} onChange={handleFieldChange} type="password" />
                  <FormField label="User Directory Name" field="userDirectory" value={credentials.userDirectory} onChange={handleFieldChange} placeholder="LDAPUserDirectory" />
                  <FormField label="Policy Domain (optional)" field="policyDomain" value={credentials.policyDomain} onChange={handleFieldChange} placeholder="Leave empty for all domains" />
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Requires SiteMinder Administrative API access. The admin account needs PolicyAdmin privileges.
                  </p>
                </>
              )}

              {selectedType === 'broadcom_pam' && (
                <>
                  <FormField label="PAM Base URL" field="baseUrl" value={credentials.baseUrl} onChange={handleFieldChange} placeholder="https://pam.example.com:18443" />
                  <FormField label="API Username" field="apiUser" value={credentials.apiUser} onChange={handleFieldChange} placeholder="pam-api-admin" />
                  <FormField label="API Password" field="apiPassword" value={credentials.apiPassword} onChange={handleFieldChange} type="password" />
                  <FormField label="API Key (optional)" field="apiKey" value={credentials.apiKey} onChange={handleFieldChange} placeholder="Optional API key" />
                  <FormField label="Vault Name (optional)" field="vaultName" value={credentials.vaultName} onChange={handleFieldChange} placeholder="Leave empty for all vaults" />
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Requires PAM API admin role. Pulls privileged credentials, vault memberships, and access policies.
                  </p>
                </>
              )}

              {selectedType === 'servicenow' && (
                <>
                  <FormField label="Instance URL" field="instanceUrl" value={credentials.instanceUrl} onChange={handleFieldChange} placeholder="https://your-company.service-now.com" />
                  <FormField label="Username" field="username" value={credentials.username} onChange={handleFieldChange} placeholder="integration_user" />
                  <FormField label="Password" field="password" value={credentials.password} onChange={handleFieldChange} type="password" />
                  <div className="border-t border-[var(--border-default)] pt-3 mt-3">
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">OAuth2 (Optional - overrides Basic Auth)</p>
                    <div className="space-y-3">
                      <FormField label="Client ID (optional)" field="clientId" value={credentials.clientId} onChange={handleFieldChange} placeholder="OAuth2 client ID" />
                      <FormField label="Client Secret (optional)" field="clientSecret" value={credentials.clientSecret} onChange={handleFieldChange} type="password" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    Required ServiceNow roles: itil, personalize_choices, rest_api_explorer. OAuth2 is recommended for production.
                  </p>
                </>
              )}

              {selectedType === 'csv' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    CSV Content
                  </label>
                  <textarea
                    value={credentials.csvContent || ''}
                    onChange={(e) => handleFieldChange('csvContent', e.target.value)}
                    rows={10}
                    placeholder={`displayName,type,subType,upn,email,department,adTier,status\nJohn Doe,human,employee,john@example.com,john@example.com,Engineering,tier_2,active`}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-xs font-mono bg-[var(--bg-primary)] text-[var(--text-primary)] resize-y"
                  />
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Paste CSV with headers: displayName, type, subType, upn, email, department, adTier, status
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('choose')}
                  className="flex-1 py-2 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('test')}
                  className="flex-1 py-2 text-xs font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Next: Test Connection
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test Connection */}
          {step === 'test' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Test the connection to verify your credentials are correct.
                </p>

                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-6 py-2.5 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Testing...
                    </span>
                  ) : (
                    'Test Connection'
                  )}
                </button>

                {testResult && (
                  <div className={`mt-4 p-3 rounded-lg text-xs text-left ${
                    testResult.ok
                      ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                      : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                  }`}>
                    <p className="font-medium">{testResult.ok ? 'Connection Successful' : 'Connection Failed'}</p>
                    <p className="mt-1">{testResult.message}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('configure'); setTestResult(null) }}
                  className="flex-1 py-2 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Back
                </button>
                {testResult?.ok && (
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 py-2 text-xs font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Next: Confirm
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && selectedType && (
            <div className="space-y-4">
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-tertiary)]">Name</span>
                  <span className="text-[var(--text-primary)] font-medium">{name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-tertiary)]">Type</span>
                  <span className="text-[var(--text-primary)] capitalize">{selectedType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-tertiary)]">Sync Frequency</span>
                  <span className="text-[var(--text-primary)]">Every 6 hours</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-tertiary)]">Connection Test</span>
                  <span className="text-green-600 font-medium">Passed</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-tertiary)]">
                Saving will store the connection and trigger an initial sync to import identities, groups, and entitlements.
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('test')}
                  className="flex-1 py-2 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save & Start First Sync'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  field,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  field: string
  value?: string
  onChange: (field: string, value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  )
}
