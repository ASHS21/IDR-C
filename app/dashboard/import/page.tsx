'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, Download, Zap, Users, Shield, Key, FileText, Copy } from 'lucide-react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ColumnMapping {
  sourceColumn: string
  targetField: string
  confidence: number
  sampleValue: string
}

interface FileUpload {
  file: File | null
  content: string
  status: 'idle' | 'detecting' | 'mapped' | 'importing' | 'done' | 'error'
  mappings: ColumnMapping[]
  detectedFormat: string
  rowCount: number
  importedCount: number
  error: string
}

const TARGET_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'displayName', label: 'Display Name' },
  { value: 'samAccountName', label: 'sAMAccountName' },
  { value: 'upn', label: 'User Principal Name (UPN)' },
  { value: 'email', label: 'Email' },
  { value: 'department', label: 'Department' },
  { value: 'type', label: 'Type (human/non_human)' },
  { value: 'subType', label: 'Sub Type' },
  { value: 'status', label: 'Status' },
  { value: 'adTier', label: 'AD Tier' },
  { value: 'manager', label: 'Manager' },
  { value: 'memberOf', label: 'Group Memberships' },
  { value: 'lastLogon', label: 'Last Logon' },
  { value: 'passwordLastSet', label: 'Password Last Set' },
  { value: 'whenCreated', label: 'Created Date' },
  { value: 'userAccountControl', label: 'User Account Control' },
  { value: 'distinguishedName', label: 'Distinguished Name' },
  { value: 'description', label: 'Description' },
  { value: 'title', label: 'Job Title' },
  { value: 'sourceId', label: 'Source ID' },
  { value: 'name', label: 'Group Name' },
  { value: 'members', label: 'Group Members' },
  { value: 'groupScope', label: 'Group Scope' },
  { value: 'groupCategory', label: 'Group Category' },
  { value: 'permissionName', label: 'Permission / Role' },
  { value: 'resourceName', label: 'Resource Name' },
  { value: 'permissionScope', label: 'Permission Scope' },
]

/* ------------------------------------------------------------------ */
/*  PowerShell Commands                                                */
/* ------------------------------------------------------------------ */

const PS_COMMANDS = {
  users: `Get-ADUser -Filter * -Properties DisplayName,SamAccountName,
UserPrincipalName,EmailAddress,Department,Manager,MemberOf,
Enabled,LastLogonDate,PasswordLastSet,WhenCreated,
UserAccountControl,DistinguishedName,Description,Title |
Select-Object DisplayName,SamAccountName,UserPrincipalName,
EmailAddress,Department,
@{N='Manager';E={($_.Manager -split ',')[0] -replace 'CN=',''}},
@{N='MemberOf';E={($_.MemberOf | ForEach-Object {
  ($_ -split ',')[0] -replace 'CN=','' }) -join ';'}},
Enabled,
@{N='LastLogon';E={if($_.LastLogonDate){$_.LastLogonDate.ToString('yyyy-MM-dd')}}},
@{N='PasswordLastSet';E={if($_.PasswordLastSet){$_.PasswordLastSet.ToString('yyyy-MM-dd')}}},
@{N='WhenCreated';E={$_.WhenCreated.ToString('yyyy-MM-dd')}},
UserAccountControl,DistinguishedName,Description,Title |
Export-Csv -Path C:\\ir-users.csv -NoTypeInformation -Encoding UTF8`,

  groups: `Get-ADGroup -Filter * -Properties Members,Description,
GroupScope,GroupCategory,ManagedBy,DistinguishedName |
Select-Object Name,
@{N='Members';E={($_.Members | ForEach-Object {
  ($_ -split ',')[0] -replace 'CN=','' }) -join ';'}},
Description,GroupScope,GroupCategory,
@{N='ManagedBy';E={($_.ManagedBy -split ',')[0] -replace 'CN=',''}},
DistinguishedName |
Export-Csv -Path C:\\ir-groups.csv -NoTypeInformation -Encoding UTF8`,

  permissions: `# Export GPO permissions + delegations
Get-GPO -All | ForEach-Object {
  $gpo = $_
  Get-GPPermissions -Guid $_.Id -All | ForEach-Object {
    [PSCustomObject]@{
      GPOName = $gpo.DisplayName
      Trustee = $_.Trustee.Name
      Permission = $_.Permission
      TrusteeType = $_.Trustee.SidType
    }
  }
} | Export-Csv -Path C:\\ir-permissions.csv -NoTypeInformation -Encoding UTF8`,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DATA_TYPES = [
  {
    key: 'users' as const,
    label: 'Users & Service Accounts',
    icon: Users,
    description: 'All AD user objects including service accounts, admin accounts, and standard users',
    fileName: 'ir-users.csv',
    required: true,
    unlocks: ['Identity inventory', 'Human vs NHI classification', 'Dormancy detection', 'Department mapping', 'Manager hierarchy'],
  },
  {
    key: 'groups' as const,
    label: 'Groups & Memberships',
    icon: Shield,
    description: 'All security and distribution groups with their member lists',
    fileName: 'ir-groups.csv',
    required: true,
    unlocks: ['AD Tiering (Tier 0/1/2)', 'Tier violation detection', 'Privileged group analysis', 'Nested group resolution', 'Attack path discovery'],
  },
  {
    key: 'permissions' as const,
    label: 'GPO Permissions & Delegations',
    icon: Key,
    description: 'Group Policy permissions and delegated access rights',
    fileName: 'ir-permissions.csv',
    required: false,
    unlocks: ['GPO risk detection', 'Shadow admin detection', 'Delegation analysis', 'Attack path enrichment'],
  },
]

export default function ImportPage() {
  const [uploads, setUploads] = useState<Record<string, FileUpload>>({
    users: { file: null, content: '', status: 'idle', mappings: [], detectedFormat: '', rowCount: 0, importedCount: 0, error: '' },
    groups: { file: null, content: '', status: 'idle', mappings: [], detectedFormat: '', rowCount: 0, importedCount: 0, error: '' },
    permissions: { file: null, content: '', status: 'idle', mappings: [], detectedFormat: '', rowCount: 0, importedCount: 0, error: '' },
  })
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'review'>('export')
  const [copied, setCopied] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const allDone = uploads.users.status === 'done' && uploads.groups.status === 'done'
  const anyImporting = Object.values(uploads).some(u => u.status === 'importing' || u.status === 'detecting')

  function copyCommand(key: string) {
    navigator.clipboard.writeText(PS_COMMANDS[key as keyof typeof PS_COMMANDS])
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  async function handleFileSelect(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    const text = await f.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      setUploads(prev => ({ ...prev, [key]: { ...prev[key], file: f, error: 'CSV must have a header row and at least one data row.', status: 'error' } }))
      return
    }

    setUploads(prev => ({ ...prev, [key]: { ...prev[key], file: f, content: text, status: 'detecting', error: '' } }))

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const sampleRows = lines.slice(1, 6).map(line => line.split(',').map(v => v.trim().replace(/^["']|["']$/g, '')))

    try {
      const res = await fetch('/api/import/csv-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, sampleRows }),
      })

      if (!res.ok) throw new Error('Detection failed')
      const data = await res.json()

      const mappings: ColumnMapping[] = headers.map((h, i) => ({
        sourceColumn: h,
        targetField: data.mappings?.[h] || '',
        confidence: data.confidence?.[h] || 0,
        sampleValue: sampleRows[0]?.[i] || '',
      }))

      setUploads(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: 'mapped',
          mappings,
          detectedFormat: data.format || 'CSV',
          rowCount: lines.length - 1,
        },
      }))
    } catch {
      // Fallback: manual mapping
      const mappings: ColumnMapping[] = headers.map((h, i) => ({
        sourceColumn: h,
        targetField: '',
        confidence: 0,
        sampleValue: sampleRows[0]?.[i] || '',
      }))
      setUploads(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'mapped', mappings, detectedFormat: 'Unknown', rowCount: lines.length - 1 },
      }))
    }
  }

  function handleMappingChange(key: string, index: number, targetField: string) {
    setUploads(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        mappings: prev[key].mappings.map((m, i) => i === index ? { ...m, targetField } : m),
      },
    }))
  }

  async function handleImport(key: string) {
    const upload = uploads[key]
    if (!upload.content) return

    setUploads(prev => ({ ...prev, [key]: { ...prev[key], status: 'importing', error: '' } }))

    try {
      const mappingObj: Record<string, string> = {}
      for (const m of upload.mappings) {
        if (m.targetField) mappingObj[m.sourceColumn] = m.targetField
      }

      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: upload.content, mapping: mappingObj }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Import failed' }))
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setUploads(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'done', importedCount: data.identities || data.recordCount || upload.rowCount, error: '' },
      }))
    } catch (err: any) {
      setUploads(prev => ({ ...prev, [key]: { ...prev[key], status: 'mapped', error: err.message } }))
    }
  }

  async function handleLoadDemo() {
    setUploads(prev => ({ ...prev, users: { ...prev.users, status: 'importing' }, groups: { ...prev.groups, status: 'importing' } }))
    try {
      const res = await fetch('/api/import/demo', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setUploads(prev => ({
        ...prev,
        users: { ...prev.users, status: 'done', importedCount: data.identities || 50 },
        groups: { ...prev.groups, status: 'done', importedCount: data.groups || 20 },
      }))
      setActiveTab('review')
    } catch (err: any) {
      setUploads(prev => ({
        ...prev,
        users: { ...prev.users, status: 'error', error: err.message },
        groups: { ...prev.groups, status: 'idle' },
      }))
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-title text-[var(--text-primary)]">Import AD Snapshot</h2>
        <p className="text-caption text-[var(--text-secondary)] mt-1">
          Export data from Active Directory using 3 PowerShell commands, then upload the CSV files.
          Identity Radar uses AI to auto-detect columns and build the full identity model.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {[
          { id: 'export' as const, label: 'Step 1: Export from AD', icon: Download },
          { id: 'import' as const, label: 'Step 2: Upload Files', icon: Upload },
          { id: 'review' as const, label: 'Step 3: Review & Analyze', icon: CheckCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--color-info)] text-[var(--color-info)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Export Instructions */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-info-bg)', borderLeft: '3px solid var(--color-info)' }}>
            <p className="text-xs text-[var(--text-secondary)]">
              Run these commands on a <strong>Domain Controller</strong> as a <strong>Domain Admin</strong>.
              Each command creates a CSV file that you'll upload in Step 2.
            </p>
          </div>

          {DATA_TYPES.map((dt, i) => (
            <div key={dt.key} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <dt.icon className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      Command {i + 1}: {dt.label}
                      {dt.required ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>Required</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>Optional</span>
                      )}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">{dt.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyCommand(dt.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: copied === dt.key ? 'var(--color-success)' : 'var(--text-secondary)' }}
                >
                  {copied === dt.key ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === dt.key ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <pre className="text-[11px] font-mono p-3 rounded-md overflow-x-auto leading-relaxed" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {PS_COMMANDS[dt.key as keyof typeof PS_COMMANDS]}
              </pre>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Unlocks:</span>
                {dt.unlocks.map(u => (
                  <span key={u} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {u}
                  </span>
                ))}
              </div>

              <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                Output file: <code className="font-mono">C:\{dt.fileName}</code>
              </p>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleLoadDemo}
              disabled={anyImporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Skip — Load Demo Data Instead
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: 'var(--color-info)' }}
            >
              I have the CSV files →
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Upload Files */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          {DATA_TYPES.map(dt => {
            const upload = uploads[dt.key]
            return (
              <div key={dt.key} className="rounded-lg border p-4" style={{ borderColor: upload.status === 'done' ? 'var(--color-success)' : upload.status === 'error' ? 'var(--color-critical)' : 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <dt.icon className="w-5 h-5 text-[var(--text-secondary)]" />
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{dt.label}</h3>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{dt.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {upload.status === 'done' && <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-success)' }}><CheckCircle className="w-4 h-4" /> {upload.importedCount} imported</span>}
                    {upload.status === 'detecting' && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-info)' }}><Loader2 className="w-4 h-4 animate-spin" /> Detecting...</span>}
                    {upload.status === 'importing' && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-info)' }}><Loader2 className="w-4 h-4 animate-spin" /> Importing...</span>}
                    {!dt.required && upload.status === 'idle' && <span className="text-[10px] text-[var(--text-tertiary)]">Optional</span>}
                  </div>
                </div>

                {upload.error && (
                  <div className="flex items-start gap-2 p-2 rounded mb-3 text-xs" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {upload.error}
                  </div>
                )}

                {upload.status === 'idle' || upload.status === 'error' ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-[var(--color-info)]"
                    style={{ borderColor: 'var(--border-default)' }}
                    onClick={() => fileRefs.current[dt.key]?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-info)' }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
                    onDrop={e => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                      const f = e.dataTransfer.files[0]
                      if (f && fileRefs.current[dt.key]) {
                        const dtr = new DataTransfer()
                        dtr.items.add(f)
                        fileRefs.current[dt.key]!.files = dtr.files
                        fileRefs.current[dt.key]!.dispatchEvent(new Event('change', { bubbles: true }))
                      }
                    }}
                  >
                    <input
                      ref={el => { fileRefs.current[dt.key] = el }}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={e => handleFileSelect(dt.key, e)}
                    />
                    <Upload className="w-6 h-6 mx-auto mb-2 text-[var(--text-tertiary)]" />
                    <p className="text-xs text-[var(--text-secondary)]">Drop <code className="font-mono">{dt.fileName}</code> here or click to browse</p>
                  </div>
                ) : upload.status === 'mapped' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Detected: <strong>{upload.detectedFormat}</strong> — {upload.rowCount} rows</span>
                      <button onClick={() => setUploads(prev => ({ ...prev, [dt.key]: { ...prev[dt.key], status: 'idle', file: null, content: '', mappings: [] } }))} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                        Remove
                      </button>
                    </div>
                    <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <th className="px-2 py-1.5 text-start font-semibold text-[var(--text-tertiary)]">Column</th>
                            <th className="px-2 py-1.5 text-start font-semibold text-[var(--text-tertiary)]">Sample</th>
                            <th className="px-2 py-1.5 text-start font-semibold text-[var(--text-tertiary)]">Maps To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upload.mappings.map((m, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                              <td className="px-2 py-1 font-mono text-[var(--text-primary)]">{m.sourceColumn}</td>
                              <td className="px-2 py-1 text-[var(--text-tertiary)] max-w-[150px] truncate">{m.sampleValue}</td>
                              <td className="px-2 py-1">
                                <select
                                  value={m.targetField}
                                  onChange={e => handleMappingChange(dt.key, i, e.target.value)}
                                  className="w-full px-1 py-0.5 rounded text-[11px] border"
                                  style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                >
                                  {TARGET_FIELDS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={() => handleImport(dt.key)}
                      disabled={!upload.mappings.some(m => m.targetField)}
                      className="w-full py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-info)' }}
                    >
                      Import {upload.rowCount} Records
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setActiveTab('export')} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              ← Back to export instructions
            </button>
            {(uploads.users.status === 'done' || uploads.groups.status === 'done') && (
              <button
                onClick={() => setActiveTab('review')}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: 'var(--color-info)' }}
              >
                Review Results →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Review */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {DATA_TYPES.map(dt => {
              const upload = uploads[dt.key]
              return (
                <div key={dt.key} className="rounded-lg border p-4 text-center" style={{ borderColor: upload.status === 'done' ? 'var(--color-success)' : 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
                  {upload.status === 'done' ? (
                    <>
                      <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{upload.importedCount}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{dt.label}</p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                      <p className="text-sm font-medium text-[var(--text-tertiary)]">Not imported</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{dt.label}</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {allDone && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-success-bg)', borderLeft: '3px solid var(--color-success)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>Import Complete!</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Identity Radar is now computing AD tier classifications, detecting tier violations,
                calculating risk scores, and identifying policy violations. Check the dashboard.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">What happens next</h3>
            <ul className="space-y-1.5">
              {[
                { done: uploads.users.status === 'done', text: 'Identity inventory populated — human and NHI identities classified' },
                { done: uploads.groups.status === 'done', text: 'AD Tiering computed — Tier 0, 1, 2 assigned based on group memberships' },
                { done: uploads.groups.status === 'done', text: 'Tier violations detected — identities accessing higher tiers than assigned' },
                { done: uploads.users.status === 'done', text: 'Risk scores calculated — 0-100 score per identity based on 7 factors' },
                { done: uploads.users.status === 'done', text: 'Dormant accounts flagged — no logon in 90+ days' },
                { done: uploads.permissions.status === 'done', text: 'GPO risks analyzed — dangerous permissions on sensitive OUs' },
                { done: uploads.permissions.status === 'done', text: 'Shadow admins detected — admin-equivalent access outside admin groups' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {item.done ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
                  ) : (
                    <div className="w-4 h-4 shrink-0 mt-0.5 rounded-full border" style={{ borderColor: 'var(--border-default)' }} />
                  )}
                  <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setActiveTab('import')} className="flex-1 py-2.5 text-sm font-medium rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Import More Data
            </button>
            <Link href="/dashboard" className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg text-center" style={{ backgroundColor: 'var(--color-info)' }}>
              View Dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
