'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface LegendNodeItem {
  shape: 'circle' | 'square' | 'diamond' | 'hexagon' | 'triangle'
  color: string
  label: string
  borderColor?: string
  dashed?: boolean
}

export interface LegendEdgeItem {
  color: string
  label: string
  style: 'solid' | 'dashed' | 'dotted'
  thickness?: number
}

export interface LegendTierItem {
  color: string
  label: string
}

interface GraphLegendProps {
  title?: string
  nodes?: LegendNodeItem[]
  edges?: LegendEdgeItem[]
  tiers?: LegendTierItem[]
  defaultCollapsed?: boolean
  className?: string
}

function NodeShape({ shape, color, borderColor, size = 12 }: { shape: LegendNodeItem['shape']; color: string; borderColor?: string; size?: number }) {
  const s = size
  const half = s / 2

  if (shape === 'circle') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
        <circle cx={half} cy={half} r={half - 1} fill={color} stroke={borderColor || 'none'} strokeWidth={borderColor ? 1.5 : 0} />
      </svg>
    )
  }
  if (shape === 'square') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
        <rect x={1} y={1} width={s - 2} height={s - 2} rx={2} fill={color} stroke={borderColor || 'none'} strokeWidth={borderColor ? 1.5 : 0} />
      </svg>
    )
  }
  if (shape === 'diamond') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
        <rect x={1} y={1} width={s - 2} height={s - 2} rx={1} fill={color} transform={`rotate(45 ${half} ${half})`} stroke={borderColor || 'none'} strokeWidth={borderColor ? 1.5 : 0} />
      </svg>
    )
  }
  if (shape === 'hexagon') {
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60 - 30) * Math.PI / 180
      return `${half + (half - 1) * Math.cos(angle)},${half + (half - 1) * Math.sin(angle)}`
    }).join(' ')
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
        <polygon points={points} fill={color} stroke={borderColor || 'none'} strokeWidth={borderColor ? 1.5 : 0} />
      </svg>
    )
  }
  if (shape === 'triangle') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="flex-shrink-0">
        <path d={`M${half},1 L${s - 1},${s - 1} L1,${s - 1} Z`} fill={color} stroke={borderColor || 'none'} strokeWidth={borderColor ? 1.5 : 0} />
      </svg>
    )
  }
  return null
}

function EdgeLine({ color, style, thickness = 2 }: { color: string; style: LegendEdgeItem['style']; thickness?: number }) {
  const dasharray = style === 'dashed' ? '4,3' : style === 'dotted' ? '2,2' : 'none'
  return (
    <svg width={20} height={8} viewBox="0 0 20 8" className="flex-shrink-0">
      <line x1={0} y1={4} x2={20} y2={4} stroke={color} strokeWidth={thickness} strokeDasharray={dasharray} />
      <polygon points="16,1 20,4 16,7" fill={color} />
    </svg>
  )
}

export function GraphLegend({
  title = 'Legend',
  nodes,
  edges,
  tiers,
  defaultCollapsed = false,
  className = '',
}: GraphLegendProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div
      className={`bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-badge)] select-none ${className}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide hover:bg-[var(--bg-secondary)] rounded-[var(--radius-badge)] transition-colors"
      >
        <span>{title}</span>
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-2 space-y-2">
          {/* Node types */}
          {nodes && nodes.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Nodes</p>
              <div className="space-y-1">
                {nodes.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <NodeShape shape={item.shape} color={item.color} borderColor={item.borderColor} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge types */}
          {edges && edges.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1 pt-1 border-t border-[var(--border-default)]">Edges</p>
              <div className="space-y-1">
                {edges.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <EdgeLine color={item.color} style={item.style} thickness={item.thickness} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tier color key */}
          {tiers && tiers.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1 pt-1 border-t border-[var(--border-default)]">Tiers</p>
              <div className="space-y-1">
                {tiers.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pre-configured legend items for Attack Path and Blast Radius graphs ──

export const ATTACK_PATH_LEGEND_NODES: LegendNodeItem[] = [
  { shape: 'circle', color: '#2563EB', label: 'Human Identity' },
  { shape: 'hexagon', color: '#7C3AED', label: 'Non-Human Identity' },
  { shape: 'diamond', color: '#CA8A04', label: 'Group' },
  { shape: 'square', color: '#5F6B7A', label: 'Resource' },
  { shape: 'circle', color: '#DC2626', label: 'Tier 0 Target', borderColor: '#DC2626' },
]

export const ATTACK_PATH_LEGEND_EDGES: LegendEdgeItem[] = [
  { color: '#DC2626', label: 'Direct Escalation', style: 'solid', thickness: 2.5 },
  { color: '#EA580C', label: 'Indirect Path', style: 'solid', thickness: 2 },
  { color: '#94a3b8', label: 'Benign / Member Of', style: 'solid', thickness: 1.5 },
  { color: '#94a3b8', label: 'Potential Path', style: 'dashed', thickness: 1.5 },
]

export const BLAST_RADIUS_LEGEND_NODES: LegendNodeItem[] = [
  { shape: 'circle', color: '#DC2626', label: 'Compromised Identity (Center)' },
  { shape: 'circle', color: '#2563EB', label: 'Human Identity' },
  { shape: 'circle', color: '#7C3AED', label: 'Non-Human Identity' },
  { shape: 'square', color: '#5F6B7A', label: 'Resource' },
  { shape: 'diamond', color: '#CA8A04', label: 'Group' },
  { shape: 'diamond', color: '#DC2626', label: 'Privileged Group' },
]

export const BLAST_RADIUS_LEGEND_EDGES: LegendEdgeItem[] = [
  { color: '#DC2626', label: 'T0 Access Path', style: 'solid', thickness: 2 },
  { color: '#EA580C', label: 'T1 Access Path', style: 'solid', thickness: 1.5 },
  { color: '#94a3b8', label: 'T2 / Standard Access', style: 'solid', thickness: 1 },
  { color: '#94a3b8', label: 'Indirect (Group/Delegation)', style: 'dashed', thickness: 1 },
  { color: '#94a3b8', label: 'Transitive Chain', style: 'dotted', thickness: 1 },
]

export const TIER_COLORS: LegendTierItem[] = [
  { color: '#DC2626', label: 'Tier 0 (Critical)' },
  { color: '#EA580C', label: 'Tier 1 (High)' },
  { color: '#5F6B7A', label: 'Tier 2 (Standard)' },
]
