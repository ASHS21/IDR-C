'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ROLE_LABELS } from '@/lib/utils/rbac'
import { hasRole } from '@/lib/utils/rbac'
import { setLocale } from '@/lib/locale'
import { Building2, Users, Plug, FileText, Bell, Key, Shield, Palette, Plus, Copy, Trash2 } from 'lucide-react'
import type { AppRole } from '@/lib/utils/rbac'
import type { Locale } from '@/lib/locale'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('org')
  const userRole = (session?.user as any)?.appRole as AppRole | undefined
  const t = useTranslations('settings')

  const TABS = [
    { key: 'org', label: t('organization'), icon: Building2 },
    { key: 'team', label: t('team'), icon: Users },
    { key: 'integrations', label: t('integrations'), icon: Plug },
    { key: 'policies', label: t('policies'), icon: FileText },
    { key: 'notifications', label: t('notifications'), icon: Bell },
    { key: 'apikeys', label: t('apiKeys'), icon: Key },
    { key: 'audit', label: t('auditCompliance'), icon: Shield },
    { key: 'appearance', label: t('appearance'), icon: Palette },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-title text-[var(--text-primary)]">{t('title')}</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-52 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-caption font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex-1 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          {activeTab === 'org' && <OrgTab />}
          {activeTab === 'team' && <TeamTab userRole={userRole} />}
          {activeTab === 'policies' && <PoliciesTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'apikeys' && <ApiKeysTab userRole={userRole} />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'integrations' && <p className="text-caption text-[var(--text-tertiary)]">{t('integrationsNote')}</p>}
          {activeTab === 'audit' && <AuditComplianceTab />}
        </div>
      </div>
    </div>
  )
}

function OrgTab() {
  const { data: session } = useSession()
  const t = useTranslations('settings')
  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('organization')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: t('orgName'), value: 'Acme Financial Services' },
          { label: t('orgDomain'), value: 'acmefs.sa' },
          { label: t('orgFrameworks'), value: 'NCA ECC, SAMA CSF, PDPL' },
          { label: t('orgAdForest'), value: 'acmefs.local' },
          { label: t('orgYourRole'), value: ROLE_LABELS[((session?.user as any)?.appRole || 'viewer') as AppRole] },
          { label: t('orgEmail'), value: session?.user?.email || '' },
        ].map(f => (
          <div key={f.label} className="p-3 rounded-md bg-[var(--bg-secondary)]">
            <p className="text-micro text-[var(--text-tertiary)] uppercase tracking-wider">{f.label}</p>
            <p className="text-body text-[var(--text-primary)] mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamTab({ userRole }: { userRole?: AppRole }) {
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const t = useTranslations('settings')

  const { data } = useQuery({
    queryKey: ['settings', 'team'],
    queryFn: async () => { const r = await fetch('/api/settings/team'); return r.json() },
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      return r.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }); setInviteEmail('') },
  })

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const r = await fetch('/api/settings/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      return r.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'team'] }),
  })

  const isAdmin = userRole && hasRole(userRole, 'admin')

  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('teamMembers')}</h3>
      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com"
            className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)]" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)]">
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}
            className="px-4 py-2 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
            <Plus size={14} /> {t('invite')}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data?.members?.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
            <div>
              <p className="text-body font-medium text-[var(--text-primary)]">{m.name || m.email}</p>
              <p className="text-caption text-[var(--text-tertiary)]">{m.email}</p>
            </div>
            {isAdmin ? (
              <select value={m.appRole} onChange={(e) => roleMutation.mutate({ userId: m.id, role: e.target.value })}
                className="px-2 py-1 border border-[var(--border-default)] rounded-[var(--radius-input)] text-caption bg-[var(--bg-primary)]">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : (
              <span className="text-caption text-[var(--text-secondary)]">{ROLE_LABELS[m.appRole as AppRole] || m.appRole}</span>
            )}
          </div>
        ))}
      </div>
      {data?.invitations?.length > 0 && (
        <div className="mt-6">
          <h4 className="text-caption font-semibold text-[var(--text-secondary)] mb-2">{t('pendingInvitations')}</h4>
          {data.invitations.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between p-2 text-caption">
              <span className="text-[var(--text-primary)]">{inv.email}</span>
              <span className="text-[var(--text-tertiary)]">{ROLE_LABELS[inv.role as AppRole] || inv.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PoliciesTab() {
  const t = useTranslations('settings')
  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('policyThresholds')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: t('dormancyThreshold'), value: t('days90') },
          { label: t('certificationPeriod'), value: t('days90') },
          { label: t('passwordMaxAge'), value: t('days90') },
          { label: t('mfaRequired'), value: t('allUsers') },
          { label: t('overPrivilegeMultiplier'), value: t('orgMedian2x') },
          { label: t('nhiOwnership'), value: t('required') },
        ].map(p => (
          <div key={p.label} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
            <span className="text-body text-[var(--text-secondary)]">{p.label}</span>
            <span className="text-body font-medium text-[var(--text-primary)]">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsTab() {
  const t = useTranslations('settings')
  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('notificationPreferences')}</h3>
      <div className="space-y-3">
        {[
          { label: t('criticalViolations'), enabled: true },
          { label: t('certificationsDue'), enabled: true },
          { label: t('aiAnalysisCompleted'), enabled: false },
          { label: t('integrationSyncFailed'), enabled: true },
          { label: t('exceptionsExpiring'), enabled: true },
        ].map(n => (
          <div key={n.label} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
            <span className="text-body text-[var(--text-primary)]">{n.label}</span>
            <div className={`w-10 h-6 rounded-full p-0.5 cursor-pointer transition-colors ${n.enabled ? 'bg-[var(--color-info)]' : 'bg-[var(--border-default)]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${n.enabled ? 'ltr:translate-x-4 rtl:-translate-x-4' : ''}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApiKeysTab({ userRole }: { userRole?: AppRole }) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const t = useTranslations('settings')

  const { data } = useQuery({
    queryKey: ['settings', 'api-keys'],
    queryFn: async () => { const r = await fetch('/api/settings/api-keys'); return r.json() },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/settings/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })
      return r.json()
    },
    onSuccess: (data) => { if (data.key) setNewKey(data.key); setLabel(''); queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }) },
  })

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const r = await fetch('/api/settings/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId }) })
      return r.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] }),
  })

  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('apiKeysTitle')}</h3>
      {newKey && (
        <div className="mb-4 p-3 rounded-md bg-[var(--color-low-bg)] border" style={{ borderColor: 'var(--color-low)' }}>
          <p className="text-caption font-medium" style={{ color: 'var(--color-low)' }}>{t('keyCreated')}</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-micro font-mono bg-[var(--bg-primary)] p-2 rounded">{newKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey('') }} className="p-2 hover:bg-[var(--bg-secondary)] rounded"><Copy size={14} /></button>
          </div>
        </div>
      )}
      {userRole && hasRole(userRole, 'admin') && (
        <div className="flex gap-2 mb-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('keyLabelPlaceholder')}
            className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-input)] text-body bg-[var(--bg-primary)]" />
          <button onClick={() => createMutation.mutate()} disabled={!label || createMutation.isPending}
            className="px-4 py-2 bg-[var(--color-info)] text-white rounded-[var(--radius-button)] text-body font-medium hover:opacity-90 disabled:opacity-50">
            {t('generateKey')}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data?.keys?.map((k: any) => (
          <div key={k.id} className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-secondary)]">
            <div>
              <p className="text-body font-medium text-[var(--text-primary)]">{k.label}</p>
              <p className="text-micro font-mono text-[var(--text-tertiary)]">{k.keyPrefix}...</p>
            </div>
            <button onClick={() => revokeMutation.mutate(k.id)} className="p-1.5 text-[var(--color-critical)] hover:bg-[var(--color-critical-bg)] rounded"><Trash2 size={14} /></button>
          </div>
        ))}
        {!data?.keys?.length && <p className="text-caption text-[var(--text-tertiary)] py-4 text-center">{t('noApiKeys')}</p>}
      </div>
    </div>
  )
}

function AuditComplianceTab() {
  const t = useTranslations('settings')
  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('auditCompliance')}</h3>
      <div className="space-y-3">
        <div className="p-3 rounded-md bg-[var(--bg-secondary)]">
          <p className="text-body text-[var(--text-primary)]">{t('dataRetention')}</p>
          <p className="text-caption text-[var(--text-tertiary)]">{t('dataRetentionDesc')}</p>
        </div>
        <div className="p-3 rounded-md bg-[var(--bg-secondary)]">
          <p className="text-body text-[var(--text-primary)]">{t('complianceReports')}</p>
          <p className="text-caption text-[var(--text-tertiary)]">{t('complianceReportsDesc')}</p>
        </div>
        <div className="p-3 rounded-md bg-[var(--bg-secondary)]">
          <p className="text-body text-[var(--text-primary)]">{t('dataExport')}</p>
          <p className="text-caption text-[var(--text-tertiary)]">{t('dataExportDesc')}</p>
        </div>
      </div>
    </div>
  )
}

function AppearanceTab() {
  const t = useTranslations('settings')
  return (
    <div>
      <h3 className="text-heading text-[var(--text-primary)] mb-4">{t('appearance')}</h3>
      <div className="space-y-4">
        <div>
          <p className="text-caption font-medium text-[var(--text-primary)] mb-2">{t('theme')}</p>
          <div className="flex gap-2">
            {[
              { label: t('light'), value: 'light' },
              { label: t('dark'), value: 'dark' },
              { label: t('system'), value: 'system' },
            ].map(opt => (
              <button key={opt.value} className="px-4 py-2 rounded-[var(--radius-button)] text-caption border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-primary)]"
                onClick={() => {
                  if (opt.value === 'dark') document.documentElement.classList.add('dark')
                  else if (opt.value === 'light') document.documentElement.classList.remove('dark')
                  localStorage.setItem('theme', opt.value)
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-caption font-medium text-[var(--text-primary)] mb-2">{t('language')}</p>
          <div className="flex gap-2">
            {[
              { label: 'English', locale: 'en' as Locale },
              { label: 'العربية', locale: 'ar' as Locale },
            ].map(l => (
              <button key={l.locale} className="px-4 py-2 rounded-[var(--radius-button)] text-caption border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-primary)]"
                onClick={() => setLocale(l.locale)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
