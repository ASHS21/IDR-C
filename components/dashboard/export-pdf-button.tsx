'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface ExportPdfButtonProps {
  reportType: 'audit_trail' | 'compliance_nca' | 'compliance_sama' | 'compliance_pdpl' | 'risk_summary'
  label?: string
  dateRange?: { from: string; to: string }
  className?: string
  variant?: 'primary' | 'secondary'
}

export function ExportPdfButton({
  reportType,
  label = 'Export PDF',
  dateRange,
  className = '',
  variant = 'secondary',
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, dateRange }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate report')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `identity-radar-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-caption font-medium transition-colors disabled:opacity-50'
  const variantStyles = variant === 'primary'
    ? 'bg-[var(--color-info)] text-white hover:opacity-90'
    : 'border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {label}
    </button>
  )
}
