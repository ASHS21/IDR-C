'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import {
  GraphLegend,
  ATTACK_PATH_LEGEND_NODES,
  ATTACK_PATH_LEGEND_EDGES,
  TIER_COLORS,
} from './graph-legend'

// ── Types ──

export interface AttackPathNode {
  id: string
  name: string
  type: string // 'identity', 'group', 'resource', 'computer', 'domain', 'ou'
  tier?: string
  riskScore?: number
  subType?: string // 'human', 'non_human', etc.
}

export interface AttackPathEdge {
  source: string
  target: string
  technique: string
  label?: string
  mitreId?: string
  type?: string
  exploitability?: 'trivial' | 'moderate' | 'advanced'
  confirmed?: boolean // false = potential/dashed
}

export interface AttackPathData {
  id: string
  pathNodes: AttackPathNode[]
  pathEdges: AttackPathEdge[]
  riskScore: number
}

export interface AttackPathGraphProps {
  paths: AttackPathData[]
  width?: number
  height?: number
  onNodeClick?: (node: AttackPathNode) => void
  onEdgeClick?: (edge: AttackPathEdge) => void
  highlightPathId?: string
  className?: string
}

// ── Constants ──

const NODE_COLORS: Record<string, string> = {
  identity: '#2563EB',
  identity_human: '#2563EB',
  identity_non_human: '#7C3AED',
  resource: '#5F6B7A',
  computer: '#4F46E5',
  group: '#CA8A04',
  domain: '#DC2626',
  ou: '#7C3AED',
  unknown: '#94a3b8',
}

const TIER_RING_COLORS: Record<string, string> = {
  tier_0: '#DC2626',
  tier_1: '#EA580C',
  tier_2: '#5F6B7A',
}

const TECHNIQUE_DANGER: Record<string, 'high' | 'medium' | 'low'> = {
  GenericAll: 'high',
  WriteDACL: 'high',
  WriteOwner: 'high',
  DCSync: 'high',
  ACLAbuse: 'high',
  ForceChangePassword: 'medium',
  AddMember: 'medium',
  Delegation: 'medium',
  GroupMembership: 'low',
  Entitlement: 'low',
  OwnerOf: 'low',
}

function dangerColor(technique: string): string {
  const level = TECHNIQUE_DANGER[technique]
  if (level === 'high') return '#DC2626'
  if (level === 'medium') return '#EA580C'
  return '#94a3b8'
}

function edgeThickness(exploitability?: string): number {
  if (exploitability === 'trivial') return 3.5
  if (exploitability === 'advanced') return 1.5
  return 2.5
}

function tierNodeSize(tier?: string): number {
  if (tier === 'tier_0') return 28
  if (tier === 'tier_1') return 22
  return 18
}

// ── Component ──

export function AttackPathGraph({
  paths,
  width: propWidth,
  height: propHeight,
  onNodeClick,
  onEdgeClick,
  highlightPathId,
  className = '',
}: AttackPathGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    content: string
    title: string
    extra?: string
  } | null>(null)
  const [dimensions, setDimensions] = useState({ width: propWidth || 900, height: propHeight || 500 })

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setDimensions({
        width: propWidth || width,
        height: propHeight || Math.max(400, Math.min(600, width * 0.55)),
      })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [propWidth, propHeight])

  // Deduplicate nodes and edges across all paths
  const { allNodes, allEdges, nodeMap } = useMemo(() => {
    const nMap = new Map<string, AttackPathNode & { hopMin: number; pathIds: Set<string> }>()
    const eSet = new Map<string, AttackPathEdge & { pathIds: Set<string> }>()

    for (const path of paths) {
      path.pathNodes.forEach((node, hopIdx) => {
        const existing = nMap.get(node.id)
        if (existing) {
          existing.hopMin = Math.min(existing.hopMin, hopIdx)
          existing.pathIds.add(path.id)
        } else {
          nMap.set(node.id, { ...node, hopMin: hopIdx, pathIds: new Set([path.id]) })
        }
      })
      for (const edge of path.pathEdges) {
        const key = `${edge.source}→${edge.target}→${edge.technique}`
        const existing = eSet.get(key)
        if (existing) {
          existing.pathIds.add(path.id)
        } else {
          eSet.set(key, { ...edge, pathIds: new Set([path.id]) })
        }
      }
    }

    return { allNodes: Array.from(nMap.values()), allEdges: Array.from(eSet.values()), nodeMap: nMap }
  }, [paths])

  const draw = useCallback(() => {
    if (!svgRef.current || allNodes.length === 0) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const padding = { top: 50, right: 80, bottom: 50, left: 80 }
    const usableW = width - padding.left - padding.right
    const usableH = height - padding.top - padding.bottom

    // ── Defs ──
    const defs = svg.append('defs')

    // Arrow markers for each danger level
    const arrowDefs = [
      { id: 'ap-arrow-high', color: '#DC2626' },
      { id: 'ap-arrow-med', color: '#EA580C' },
      { id: 'ap-arrow-low', color: '#94a3b8' },
    ]
    for (const m of arrowDefs) {
      defs.append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', m.color)
        .attr('d', 'M0,-4L10,0L0,4')
    }

    // Pulse animation for T0 targets
    svg.append('style').text(`
      @keyframes apPulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 0.2; }
      }
      .ap-pulse { animation: apPulse 2s ease-in-out infinite; }
    `)

    // Glow filter
    const glow = defs.append('filter').attr('id', 'ap-glow')
      .attr('x', '-40%').attr('y', '-40%').attr('width', '180%').attr('height', '180%')
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    glow.append('feFlood').attr('flood-color', '#DC2626').attr('flood-opacity', '0.5').attr('result', 'color')
    glow.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'shadow')
    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'shadow')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    // Zoom + pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // ── Layout: left-to-right by hop number ──
    // Compute max hop
    const maxHop = Math.max(...allNodes.map(n => n.hopMin), 1)
    const hopSpacing = usableW / Math.max(maxHop, 1)

    // Group nodes by hop
    const hopGroups = new Map<number, typeof allNodes>()
    for (const node of allNodes) {
      const hop = node.hopMin
      if (!hopGroups.has(hop)) hopGroups.set(hop, [])
      hopGroups.get(hop)!.push(node)
    }

    // Position nodes
    const nodePositions = new Map<string, { x: number; y: number; node: typeof allNodes[0] }>()
    for (const [hop, nodesInHop] of hopGroups) {
      const x = padding.left + hop * hopSpacing
      const ySpacing = usableH / Math.max(nodesInHop.length + 1, 2)
      nodesInHop.forEach((node, i) => {
        const y = padding.top + ySpacing * (i + 1)
        nodePositions.set(node.id, { x, y, node })
      })
    }

    // ── Draw edges ──
    const edgeGroup = g.append('g').attr('class', 'edges')

    for (const edge of allEdges) {
      const from = nodePositions.get(edge.source)
      const to = nodePositions.get(edge.target)
      if (!from || !to) continue

      const color = dangerColor(edge.technique)
      const thickness = edgeThickness(edge.exploitability)
      const isConfirmed = edge.confirmed !== false
      const isHighlighted = highlightPathId ? edge.pathIds.has(highlightPathId) : true
      const danger = TECHNIQUE_DANGER[edge.technique] || 'low'
      const markerId = danger === 'high' ? 'ap-arrow-high' : danger === 'medium' ? 'ap-arrow-med' : 'ap-arrow-low'

      const fromR = tierNodeSize(from.node.tier) + 4
      const toR = tierNodeSize(to.node.tier) + 10

      // Compute control points for curved edges
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const nx = dx / (dist || 1)
      const ny = dy / (dist || 1)

      const x1 = from.x + nx * fromR
      const y1 = from.y + ny * fromR
      const x2 = to.x - nx * toR
      const y2 = to.y - ny * toR

      // Slight curve offset for overlapping edges
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      const curveOffset = (Math.abs(dy) < 20) ? 0 : 0
      const cx = midX + (-ny) * curveOffset
      const cy = midY + nx * curveOffset

      const pathEl = edgeGroup.append('path')
        .attr('d', `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', thickness)
        .attr('stroke-dasharray', isConfirmed ? 'none' : '6,4')
        .attr('opacity', isHighlighted ? 0.85 : 0.15)
        .attr('marker-end', `url(#${markerId})`)
        .attr('cursor', 'pointer')

      pathEl
        .on('mouseenter', function (event) {
          d3.select(this).attr('stroke-width', thickness + 2).attr('opacity', 1)
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            title: edge.technique,
            content: edge.label || edge.type || '',
            extra: edge.mitreId ? `MITRE: ${edge.mitreId}` : undefined,
          })
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke-width', thickness).attr('opacity', isHighlighted ? 0.85 : 0.15)
          setTooltip(null)
        })
        .on('click', () => { if (onEdgeClick) onEdgeClick(edge) })

      // Edge label
      const labelX = (x1 + x2) / 2
      const labelY = (y1 + y2) / 2 - 8

      edgeGroup.append('rect')
        .attr('x', labelX - 38)
        .attr('y', labelY - 8)
        .attr('width', 76)
        .attr('height', 14)
        .attr('rx', 3)
        .attr('fill', color)
        .attr('opacity', isHighlighted ? 0.12 : 0.04)
        .attr('pointer-events', 'none')

      edgeGroup.append('text')
        .text(edge.technique.length > 14 ? edge.technique.slice(0, 14) + '..' : edge.technique)
        .attr('x', labelX)
        .attr('y', labelY + 3)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('opacity', isHighlighted ? 0.9 : 0.2)
        .attr('pointer-events', 'none')
    }

    // ── Draw nodes ──
    const nodeGroup = g.append('g').attr('class', 'nodes')

    for (const [nodeId, pos] of nodePositions) {
      const { x, y, node } = pos
      const radius = tierNodeSize(node.tier)
      const isHighlighted = highlightPathId ? node.pathIds.has(highlightPathId) : true
      const isNHI = node.subType && ['service_account', 'managed_identity', 'app_registration', 'api_key', 'bot', 'machine', 'certificate'].includes(node.subType)
      const nodeColor = node.type === 'identity'
        ? (isNHI ? NODE_COLORS.identity_non_human : NODE_COLORS.identity_human)
        : (NODE_COLORS[node.type] || NODE_COLORS.unknown)

      const tierColor = TIER_RING_COLORS[node.tier || '']
      const isT0Target = node.tier === 'tier_0' && node.hopMin > 0

      const el = nodeGroup.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer')
        .attr('opacity', isHighlighted ? 1 : 0.2)

      // Pulse ring for T0 targets
      if (isT0Target) {
        el.append('circle')
          .attr('r', radius + 8)
          .attr('fill', 'none')
          .attr('stroke', '#DC2626')
          .attr('stroke-width', 2)
          .attr('class', 'ap-pulse')

        el.attr('filter', 'url(#ap-glow)')
      }

      // Tier ring
      if (tierColor) {
        el.append('circle')
          .attr('r', radius + 3)
          .attr('fill', 'none')
          .attr('stroke', tierColor)
          .attr('stroke-width', 2.5)
      }

      // Node shape
      if (node.type === 'identity' && !isNHI) {
        // Circle for human
        el.append('circle')
          .attr('r', radius)
          .attr('fill', nodeColor)
          .attr('stroke', tierColor || '#1e293b')
          .attr('stroke-width', 1.5)
      } else if (node.type === 'identity' && isNHI) {
        // Hexagon for NHI
        const hex = d3.range(6).map(i => {
          const angle = (i * 60 - 30) * Math.PI / 180
          return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`
        }).join(' ')
        el.append('polygon')
          .attr('points', hex)
          .attr('fill', nodeColor)
          .attr('stroke', tierColor || '#1e293b')
          .attr('stroke-width', 1.5)
      } else if (node.type === 'group') {
        // Diamond for group
        const s = radius * 1.4
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 2)
          .attr('fill', nodeColor)
          .attr('transform', 'rotate(45)')
      } else if (node.type === 'resource' || node.type === 'computer') {
        // Square for resource
        const s = radius * 1.6
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 3)
          .attr('fill', nodeColor)
      } else {
        // Default circle
        el.append('circle')
          .attr('r', radius)
          .attr('fill', nodeColor)
      }

      // Icon text
      const icon = node.type === 'identity'
        ? (isNHI ? '\u2699' : '\u{1F464}')
        : node.type === 'group' ? '\u{1F465}'
        : node.type === 'resource' || node.type === 'computer' ? '\u{1F4BB}'
        : node.type === 'domain' ? '\u{1F3E0}'
        : '\u{1F512}'
      el.append('text')
        .text(icon)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', `${Math.max(10, radius * 0.6)}px`)
        .attr('pointer-events', 'none')

      // Label below
      el.append('text')
        .text(node.name.length > 20 ? node.name.slice(0, 20) + '..' : node.name)
        .attr('y', radius + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('pointer-events', 'none')

      // Tier label above
      if (node.tier) {
        el.append('text')
          .text(node.tier.replace('_', ' ').toUpperCase())
          .attr('y', -(radius + 8))
          .attr('text-anchor', 'middle')
          .attr('fill', tierColor || 'var(--text-tertiary)')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .attr('pointer-events', 'none')
      }

      // Interactions
      el.on('mouseenter', function (event) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          title: node.name,
          content: `Type: ${node.type}${node.subType ? ` (${node.subType.replace(/_/g, ' ')})` : ''}`,
          extra: [
            node.tier ? `Tier: ${node.tier.replace('_', ' ')}` : null,
            node.riskScore !== undefined ? `Risk: ${node.riskScore}` : null,
          ].filter(Boolean).join(' | ') || undefined,
        })
        d3.select(this).raise()
      })
      el.on('mouseleave', () => setTooltip(null))
      el.on('click', (event) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(node)
      })
    }

    // ── Hop labels at top ──
    for (const [hop] of hopGroups) {
      const x = padding.left + hop * hopSpacing
      g.append('text')
        .text(hop === 0 ? 'Source' : hop === maxHop ? 'Target' : `Hop ${hop}`)
        .attr('x', x)
        .attr('y', padding.top - 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-tertiary)')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('opacity', 0.6)
    }
  }, [allNodes, allEdges, dimensions, highlightPathId, onNodeClick, onEdgeClick])

  useEffect(() => { draw() }, [draw])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] w-full"
        style={{ boxShadow: 'var(--shadow-card)' }}
      />

      {/* Legend */}
      <div className="absolute top-3 start-3">
        <GraphLegend
          title="Attack Path Legend"
          nodes={ATTACK_PATH_LEGEND_NODES}
          edges={ATTACK_PATH_LEGEND_EDGES}
          tiers={TIER_COLORS}
          defaultCollapsed={false}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-3 pointer-events-none max-w-[280px]"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14, boxShadow: 'var(--shadow-dropdown)' }}
        >
          <p className="text-caption font-semibold text-[var(--text-primary)]">{tooltip.title}</p>
          <p className="text-micro text-[var(--text-secondary)] mt-0.5">{tooltip.content}</p>
          {tooltip.extra && <p className="text-micro text-[var(--text-tertiary)] mt-0.5">{tooltip.extra}</p>}
        </div>
      )}
    </div>
  )
}
