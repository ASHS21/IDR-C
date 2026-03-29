'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, Zap } from 'lucide-react'
import Link from 'next/link'

interface ColumnMapping {
  sourceColumn: string
  targetField: string
  confidence: number
  sampleValue: string
}

interface DetectionResult {
  format: string
  mappings: ColumnMapping[]
  totalRows: number
  warnings: string[]
}

interface ImportResult {
  success: boolean
  identitiesImported: number
  groupsImported: number
  errors: string[]
}

type Step = 'upload' | 'mapping' | 'importing' | 'done'

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
]

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')

    const text = await f.text()
    setFileContent(text)

    // Parse headers and sample rows
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      setError('CSV must have a header row and at least one data row.')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const sampleRows = lines.slice(1, Math.min(6, lines.length)).map(line =>
      line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
    )

    // Call AI column detection
    setDetecting(true)
    try {
      const res = await fetch('/api/import/csv-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, sampleRows }),
      })

      if (!res.ok) throw new Error('Detection failed')
      const data = await res.json()

      const detected: ColumnMapping[] = headers.map((h, i) => ({
        sourceColumn: h,
        targetField: data.mappings?.[h] || '',
        confidence: data.confidence?.[h] || 0,
        sampleValue: sampleRows[0]?.[i] || '',
      }))

      setDetection({
        format: data.format || 'Unknown CSV',
        mappings: detected,
        totalRows: lines.length - 1,
        warnings: data.warnings || [],
      })
      setMappings(detected)
      setStep('mapping')
    } catch (err: any) {
      setError(err.message || 'Failed to detect CSV format')
    } finally {
      setDetecting(false)
    }
  }

  function handleMappingChange(index: number, targetField: string) {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, targetField } : m))
  }

  async function handleImport() {
    setImporting(true)
    setStep('importing')
    setError('')

    try {
      const mappingObj: Record<string, string> = {}
      for (const m of mappings) {
        if (m.targetField) {
          mappingObj[m.sourceColumn] = m.targetField
        }
      }

      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent, mapping: mappingObj }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Import failed' }))
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setImportResult({
        success: true,
        identitiesImported: data.identities || data.recordCount || 0,
        groupsImported: data.groups || 0,
        errors: data.errors || [],
      })
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Import failed')
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setFileContent('')
    setDetection(null)
    setMappings([])
    setImportResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-title text-[var(--text-primary)]">Import AD Snapshot</h2>
        <p className="text-caption text-[var(--text-secondary)] mt-1">
          Upload a CSV export from Active Directory, Azure AD, or any identity source.
          Identity Radar uses AI to auto-detect your column format and map it to the ontology.
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {(['upload', 'mapping', 'importing', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === s ? 'bg-[var(--color-info)] text-white' :
              (['upload', 'mapping', 'importing', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
              'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
            }`}>
              {(['upload', 'mapping', 'importing', 'done'].indexOf(step) > i) ? (
                <CheckCircle className="w-4 h-4" />
              ) : i + 1}
            </div>
            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
              {s === 'upload' && 'Upload'}
              {s === 'mapping' && 'Map Columns'}
              {s === 'importing' && 'Importing'}
              {s === 'done' && 'Complete'}
            </span>
            {i < 3 && <div className={`w-8 h-0.5 ${(['upload', 'mapping', 'importing', 'done'].indexOf(step) > i) ? 'bg-green-500' : 'bg-[var(--bg-tertiary)]'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* PowerShell export instructions */}
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              How to export from Active Directory
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Run this PowerShell command on a Domain Controller (as Domain Admin):
            </p>
            <pre className="text-xs font-mono p-3 rounded-md overflow-x-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
{`Get-ADUser -Filter * -Properties DisplayName,SamAccountName,
UserPrincipalName,EmailAddress,Department,Manager,MemberOf,
Enabled,LastLogonDate,PasswordLastSet,WhenCreated,
UserAccountControl,DistinguishedName |
Select-Object DisplayName,SamAccountName,UserPrincipalName,
EmailAddress,Department,
@{N='Manager';E={($_.Manager -split ',')[0] -replace 'CN=',''}},
@{N='MemberOf';E={($_.MemberOf | ForEach-Object {
  ($_ -split ',')[0] -replace 'CN=','' }) -join ';'}},
Enabled,
@{N='LastLogon';E={$_.LastLogonDate.ToString('yyyy-MM-dd')}},
@{N='PasswordLastSet';E={$_.PasswordLastSet.ToString('yyyy-MM-dd')}},
@{N='WhenCreated';E={$_.WhenCreated.ToString('yyyy-MM-dd')}},
UserAccountControl,DistinguishedName |
Export-Csv -Path C:\\ad-export.csv -NoTypeInformation -Encoding UTF8`}
            </pre>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Then upload the <code className="font-mono">ad-export.csv</code> file below.
            </p>
          </div>

          {/* Drop zone */}
          <div
            className="relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-[var(--color-info)]"
            style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-info)' }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'var(--border-default)'
              const f = e.dataTransfer.files[0]
              if (f && fileRef.current) {
                const dt = new DataTransfer()
                dt.items.add(f)
                fileRef.current.files = dt.files
                fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
              }
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            {detecting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-[var(--color-info)] animate-spin" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Analyzing CSV format with AI...</p>
                <p className="text-xs text-[var(--text-tertiary)]">Detecting columns, date formats, and identity types</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-[var(--text-tertiary)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Drop your CSV file here or click to browse</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Supports: AD PowerShell export, Azure AD export, SailPoint report, Okta export, or any CSV with identity data
                </p>
              </div>
            )}
          </div>

          {/* Or load demo data */}
          <div className="text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">No AD data available?</p>
            <button
              onClick={async () => {
                setDetecting(true)
                try {
                  const res = await fetch('/api/import/demo', { method: 'POST' })
                  if (!res.ok) throw new Error('Failed to load demo data')
                  const data = await res.json()
                  setImportResult({
                    success: true,
                    identitiesImported: data.identities || 50,
                    groupsImported: data.groups || 20,
                    errors: [],
                  })
                  setStep('done')
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setDetecting(false)
                }
              }}
              className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              <Zap className="w-3.5 h-3.5 inline-block mr-1.5" />
              Load Demo Data (50 sample identities)
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && detection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Column Mapping</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Detected format: <strong>{detection.format}</strong> — {detection.totalRows} rows found
              </p>
            </div>
            <button onClick={handleReset} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Start over
            </button>
          </div>

          {detection.warnings.length > 0 && (
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' }}>
              {detection.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="px-3 py-2 text-start font-semibold text-[var(--text-secondary)]">CSV Column</th>
                  <th className="px-3 py-2 text-start font-semibold text-[var(--text-secondary)]">Sample Value</th>
                  <th className="px-3 py-2 text-start font-semibold text-[var(--text-secondary)]">Maps To</th>
                  <th className="px-3 py-2 text-center font-semibold text-[var(--text-secondary)]">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{m.sourceColumn}</td>
                    <td className="px-3 py-2 text-[var(--text-tertiary)] max-w-[200px] truncate">{m.sampleValue}</td>
                    <td className="px-3 py-2">
                      <select
                        value={m.targetField}
                        onChange={(e) => handleMappingChange(i, e.target.value)}
                        className="w-full px-2 py-1 rounded text-xs border"
                        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      >
                        {TARGET_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {m.confidence > 0 && (
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          m.confidence >= 80 ? 'bg-green-500' :
                          m.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`} title={`${m.confidence}% confidence`} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 py-2.5 text-sm font-medium rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!mappings.some(m => m.targetField)}
              className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-info)' }}
            >
              Import {detection.totalRows} Identities
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-12 h-12 text-[var(--color-info)] animate-spin" />
          <p className="text-sm font-medium text-[var(--text-primary)]">Importing identities...</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Classifying types, computing tier assignments, and calculating risk scores
          </p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && importResult && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-semibold text-[var(--text-primary)]">Import Complete!</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
              <p className="text-2xl font-bold text-[var(--color-info)]">{importResult.identitiesImported}</p>
              <p className="text-xs text-[var(--text-secondary)]">Identities Imported</p>
            </div>
            <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-primary)' }}>
              <p className="text-2xl font-bold text-[var(--color-info)]">{importResult.groupsImported}</p>
              <p className="text-xs text-[var(--text-secondary)]">Groups Imported</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-medium-bg)', color: 'var(--color-medium)' }}>
              <p className="font-semibold mb-1">{importResult.errors.length} rows had issues:</p>
              {importResult.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
              {importResult.errors.length > 5 && <p>...and {importResult.errors.length - 5} more</p>}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 py-2.5 text-sm font-medium rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Import More Data
            </button>
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg text-center"
              style={{ backgroundColor: 'var(--color-info)' }}
            >
              View Dashboard →
            </Link>
          </div>

          <p className="text-xs text-[var(--text-tertiary)] text-center">
            Identity Radar will now auto-classify identity types, compute AD tier assignments,
            detect tier violations, and calculate risk scores. Check the dashboard in a few moments.
          </p>
        </div>
      )}
    </div>
  )
}
