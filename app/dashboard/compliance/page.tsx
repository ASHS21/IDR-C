'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, FileText, Download,
} from 'lucide-react'
import { useState } from 'react'

interface ControlResult {
  id: string
  name: string
  description: string
  category: string
  coveredBy: string[]
  relatedViolations: string[]
  assessmentMethod: string
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed'
  relatedViolationCounts: Record<string, number>
}

interface FrameworkResult {
  key: string
  name: string
  fullName: string
  version: string
  score: number
  summary: {
    compliant: number
    partial: number
    nonCompliant: number
    notAssessed: number
    total: number
  }
  controls: ControlResult[]
}

const STATUS_CONFIG = {
  compliant: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Compliant' },
  partial: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Partial' },
  non_compliant: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Non-Compliant' },
  not_assessed: { icon: MinusCircle, color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--bg-tertiary)]', label: 'Not Assessed' },
}

function ScoreGauge({ score, name }: { score: number; name: string }) {
  const color = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'
  const bgColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            className={bgColor.replace('bg-', 'stroke-')}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{score}%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-[var(--text-secondary)]">{name}</span>
    </div>
  )
}

export default function CompliancePage() {
  const t = useTranslations()
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      const res = await fetch('/api/compliance')
      if (!res.ok) throw new Error('Failed to fetch compliance data')
      return res.json()
    },
  })

  const handleDownloadReport = async (frameworkKey: string) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: `compliance_${frameworkKey.toLowerCase().replace('_', '')}` }),
      })
      if (!res.ok) throw new Error('Failed to generate report')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-${frameworkKey.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  const frameworks: FrameworkResult[] = data?.frameworks || []
  const activeFramework = selectedFramework
    ? frameworks.find(f => f.key === selectedFramework)
    : null

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-title text-[var(--text-primary)]">Compliance</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title text-[var(--text-primary)]">
            <Shield className="inline-block w-6 h-6 me-2 text-[var(--accent)]" />
            Saudi Regulatory Compliance
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            NCA ECC, SAMA CSF, and PDPL compliance posture based on real-time identity data
          </p>
        </div>
        {data?.assessedAt && (
          <span className="text-xs text-[var(--text-tertiary)]">
            Assessed: {new Date(data.assessedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Framework Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {frameworks.map(fw => (
          <button
            key={fw.key}
            onClick={() => setSelectedFramework(selectedFramework === fw.key ? null : fw.key)}
            className={`p-6 rounded-xl border text-start transition-all ${
              selectedFramework === fw.key
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent)]/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text-primary)]">{fw.name}</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{fw.fullName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Version: {fw.version}</p>
              </div>
              <ScoreGauge score={fw.score} name="" />
            </div>

            <div className="flex gap-3 mt-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" /> {fw.summary.compliant}
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3 h-3" /> {fw.summary.partial}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="w-3 h-3" /> {fw.summary.nonCompliant}
              </span>
              <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                <MinusCircle className="w-3 h-3" /> {fw.summary.notAssessed}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded Framework Detail */}
      {activeFramework && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {activeFramework.fullName} — Control Details
            </h3>
            <button
              onClick={() => handleDownloadReport(activeFramework.key)}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generating ? 'Generating...' : 'Download PDF Report'}
            </button>
          </div>

          {/* Group by category */}
          {Object.entries(
            activeFramework.controls.reduce<Record<string, ControlResult[]>>((acc, c) => {
              ;(acc[c.category] ||= []).push(c)
              return acc
            }, {})
          ).map(([category, controls]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                {category}
              </h4>
              <div className="space-y-2">
                {controls.map(control => {
                  const cfg = STATUS_CONFIG[control.status]
                  const Icon = cfg.icon
                  return (
                    <div
                      key={control.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]"
                    >
                      <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-tertiary)]">{control.id}</span>
                          <span className="font-medium text-sm text-[var(--text-primary)]">{control.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">{control.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {control.coveredBy.map(feature => (
                            <span
                              key={feature}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                        {Object.entries(control.relatedViolationCounts).some(([, v]) => v > 0) && (
                          <div className="flex gap-2 mt-2">
                            {Object.entries(control.relatedViolationCounts)
                              .filter(([, v]) => v > 0)
                              .map(([type, count]) => (
                                <span key={type} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                                  {type.replace(/_/g, ' ')}: {count}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Metrics Summary */}
      {data?.metrics && (
        <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">System Metrics (Compliance Inputs)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Total Identities', value: data.metrics.totalIdentities },
              { label: 'Tier Violations', value: data.metrics.tierViolations, warn: true },
              { label: 'Orphaned NHIs', value: data.metrics.orphanedNhis, warn: true },
              { label: 'Dormant Identities', value: data.metrics.dormantIdentities, warn: true },
              { label: 'MFA Coverage', value: data.metrics.mfaTotal > 0 ? `${Math.round((data.metrics.mfaEnabled / data.metrics.mfaTotal) * 100)}%` : 'N/A' },
              { label: 'Cert Overdue', value: data.metrics.certOverdue, warn: true },
              { label: 'Audit Entries', value: data.metrics.auditEntries.toLocaleString() },
              { label: 'Open Violations', value: Object.values(data.metrics.violations as Record<string, number>).reduce((a: number, b: number) => a + b, 0) },
            ].map(m => (
              <div key={m.label}>
                <div className={`text-xl font-bold ${m.warn && typeof m.value === 'number' && m.value > 0 ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>
                  {m.value}
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
