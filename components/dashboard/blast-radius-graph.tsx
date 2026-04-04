'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  GraphLegend,
  BLAST_RADIUS_LEGEND_NODES,
  BLAST_RADIUS_LEGEND_EDGES,
  TIER_COLORS,
} from './graph-legend'

// ── Types ──

export interface BlastRadiusNode {
  id: string
  name: string
  type: 'identity' | 'resource' | 'group'
  subType?: string
  tier?: string
  accessType?: string
  criticality?: string
}

export interface BlastRadiusEdge {
  source: string
  target: string
  label: string
  accessType: string
}

export interface BlastRadiusRing {
  level: number
  label: string
  nodes: BlastRadiusNode[]
  edges?: BlastRadiusEdge[]
}

export interface BlastRadiusCenter {
  id: string
  name: string
  type: string
  tier: string
  riskScore: number
  subType?: string
}

export interface BlastRadiusStats {
  totalReachable: number
  t0Reachable: number
  blastRadiusScore: number
  highestTier: string
}

export interface BlastRadiusGraphProps {
  data: {
    center: BlastRadiusCenter
    rings: BlastRadiusRing[]
    stats: BlastRadiusStats
  }
  width?: number
  height?: number
  onNodeClick?: (node: BlastRadiusNode) => void
  className?: string
}

// ── Constants ──

const NODE_COLORS: Record<string, string> = {
  identity_human: '#2563EB',
  identity_non_human: '#7C3AED',
  resource: '#5F6B7A',
  group: '#CA8A04',
  group_privileged: '#DC2626',
}

const TIER_EDGE_COLORS: Record<string, string> = {
  tier_0: '#DC2626',
  tier_1: '#EA580C',
  tier_2: '#94a3b8',
}

const RING_BG_OPACITY = [0.08, 0.05, 0.03]
const RING_STROKE_OPACITY = [0.35, 0.25, 0.15]

function getNodeColor(node: BlastRadiusNode): string {
  if (node.type === 'group') {
    return NODE_COLORS.group
  }
  if (node.type === 'identity') {
    const isNHI = node.subType && ['service_account', 'managed_identity', 'app_registration', 'api_key', 'bot', 'machine', 'certificate'].includes(node.subType)
    return isNHI ? NODE_COLORS.identity_non_human : NODE_COLORS.identity_human
  }
  return NODE_COLORS.resource
}

function getEdgeColor(node: BlastRadiusNode): string {
  return TIER_EDGE_COLORS[node.tier || ''] || TIER_EDGE_COLORS.tier_2
}

function nodeRadius(node: BlastRadiusNode): number {
  if (node.tier === 'tier_0') return 10
  if (node.tier === 'tier_1') return 8
  if (node.criticality === 'critical') return 9
  return 7
}

// ── Component ──

export function BlastRadiusGraph({
  data,
  width: propWidth,
  height: propHeight,
  onNodeClick,
  className = '',
}: BlastRadiusGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    title: string
    content: string
    extra?: string
  } | null>(null)
  const [dimensions, setDimensions] = useState({ width: propWidth || 800, height: propHeight || 600 })

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setDimensions({
        width: propWidth || width,
        height: propHeight || Math.max(550, Math.min(750, width * 0.75)),
      })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [propWidth, propHeight])

  const draw = useCallback(() => {
    if (!svgRef.current || !data) return

    const { width, height } = dimensions
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const cx = width / 2
    const cy = height / 2
    const maxRadius = Math.min(cx, cy) - 60

    // ── Defs ──
    const defs = svg.append('defs')

    // Pulse animation
    svg.append('style').text(`
      @keyframes brPulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 0.3; }
      }
      .br-center-pulse { animation: brPulse 2s ease-in-out infinite; transform-origin: center; }
    `)

    // Glow for center
    const glow = defs.append('filter').attr('id', 'br-center-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
    glow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
    glow.append('feFlood').attr('flood-color', '#DC2626').attr('flood-opacity', '0.4').attr('result', 'color')
    glow.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'shadow')
    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'shadow')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // T0 glow
    const t0Glow = defs.append('filter').attr('id', 'br-t0-glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    t0Glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur')
    t0Glow.append('feFlood').attr('flood-color', '#DC2626').attr('flood-opacity', '0.5').attr('result', 'color')
    t0Glow.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'shadow')
    const t0Merge = t0Glow.append('feMerge')
    t0Merge.append('feMergeNode').attr('in', 'shadow')
    t0Merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Arrow marker for edges
    defs.append('marker')
      .attr('id', 'br-arrow')
      .attr('viewBox', '0 0 10 6').attr('refX', 10).attr('refY', 3)
      .attr('markerWidth', 8).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L10,3 L0,6 Z')
      .attr('fill', 'rgba(148,163,184,0.4)')

    const g = svg.append('g')

    // Zoom + pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    const ringCount = data.rings.length || 1

    // ── Draw concentric ring backgrounds ──
    for (let i = ringCount; i >= 1; i--) {
      const ringRadius = (i / ringCount) * maxRadius
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', ringRadius)
        .attr('fill', `rgba(148, 163, 184, ${RING_BG_OPACITY[i - 1] || 0.03})`)
        .attr('stroke', `rgba(148, 163, 184, ${RING_STROKE_OPACITY[i - 1] || 0.12})`)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', i > 1 ? '6,4' : 'none')

      // Ring label — bigger and more visible
      const label = data.rings[i - 1]?.label || `Ring ${i}`
      const nodeCount = data.rings[i - 1]?.nodes.length || 0
      g.append('text')
        .text(`${label} \u2022 ${nodeCount} nodes`)
        .attr('x', cx)
        .attr('y', cy - ringRadius - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('opacity', 0.8)
    }

    // ── Compute node positions on rings ──
    interface NodePosition {
      x: number
      y: number
      node: BlastRadiusNode
      ringLevel: number
    }

    const allNodePositions: NodePosition[] = []

    data.rings.forEach((ring, ringIdx) => {
      const ringRadius = ((ringIdx + 1) / ringCount) * maxRadius
      const nodes = ring.nodes
      // Add padding between nodes to prevent overlap
      const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1)

      // Sort: T0 nodes first, then by type for visual grouping
      const sorted = [...nodes].sort((a, b) => {
        if (a.tier === 'tier_0' && b.tier !== 'tier_0') return -1
        if (b.tier === 'tier_0' && a.tier !== 'tier_0') return 1
        if (a.type !== b.type) return a.type.localeCompare(b.type)
        return 0
      })

      sorted.forEach((node, nodeIdx) => {
        const angle = angleStep * nodeIdx - Math.PI / 2
        const x = cx + ringRadius * Math.cos(angle)
        const y = cy + ringRadius * Math.sin(angle)
        allNodePositions.push({ x, y, node, ringLevel: ring.level })
      })
    })

    // ── Draw curved edges from center to nodes ──
    const edgeGroup = g.append('g').attr('class', 'edges')

    for (const pos of allNodePositions) {
      const edgeColor = getEdgeColor(pos.node)
      const ringLevel = pos.ringLevel
      const isT0 = pos.node.tier === 'tier_0'

      // Edge style: thicker + more visible for T0, dashed for outer rings
      const dasharray = ringLevel === 1 ? 'none' : ringLevel === 2 ? '6,3' : '3,3'
      const strokeWidth = isT0 ? 2 : ringLevel === 1 ? 1.5 : 1
      const opacity = isT0 ? 0.7 : ringLevel === 1 ? 0.4 : 0.2

      // Use curved paths for better readability (less straight-line clutter)
      const midX = (cx + pos.x) / 2
      const midY = (cy + pos.y) / 2
      // Offset the midpoint slightly for a curve effect
      const dx = pos.x - cx
      const dy = pos.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const curveOffset = dist * 0.08
      const perpX = -dy / dist * curveOffset
      const perpY = dx / dist * curveOffset

      const path = edgeGroup.append('path')
        .attr('d', `M${cx},${cy} Q${midX + perpX},${midY + perpY} ${pos.x},${pos.y}`)
        .attr('fill', 'none')
        .attr('stroke', edgeColor)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-dasharray', dasharray)
        .attr('opacity', opacity)
        .attr('data-node-id', pos.node.id)
        .attr('data-orig-opacity', opacity)
        .attr('data-orig-width', strokeWidth)

      if (isT0) {
        path.attr('marker-end', 'url(#br-arrow)')
      }
    }

    // ── Ripple animation on load ──
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (i / ringCount) * maxRadius
      const ripple = g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', '#DC2626')
        .attr('stroke-width', 2)
        .attr('opacity', 0.5)

      ripple.transition()
        .delay(i * 300)
        .duration(800)
        .attr('r', ringRadius)
        .attr('opacity', 0)
        .remove()
    }

    // ── Draw nodes on rings ──
    const nodeGroup = g.append('g').attr('class', 'nodes')

    for (const pos of allNodePositions) {
      const { x, y, node } = pos
      const color = getNodeColor(node)
      const r = nodeRadius(node)
      const isT0 = node.tier === 'tier_0'

      const el = nodeGroup.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer')

      // T0 glow ring
      if (isT0) {
        el.append('circle')
          .attr('r', r + 5)
          .attr('fill', 'none')
          .attr('stroke', '#DC2626')
          .attr('stroke-width', 2.5)
          .attr('opacity', 0.6)
        el.attr('filter', 'url(#br-t0-glow)')
      }

      // Node shape
      if (node.type === 'identity') {
        el.append('circle')
          .attr('r', r)
          .attr('fill', color)
          .attr('stroke', isT0 ? '#DC2626' : 'rgba(255,255,255,0.4)')
          .attr('stroke-width', isT0 ? 2.5 : 1)
      } else if (node.type === 'resource') {
        const s = r * 2
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 3)
          .attr('fill', isT0 ? '#DC2626' : node.tier === 'tier_1' ? '#EA580C' : color)
          .attr('stroke', 'rgba(255,255,255,0.3)')
          .attr('stroke-width', 1)
          .attr('opacity', 0.9)
      } else if (node.type === 'group') {
        const s = r * 1.6
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 2)
          .attr('fill', color)
          .attr('stroke', 'rgba(255,255,255,0.3)')
          .attr('stroke-width', 1)
          .attr('transform', 'rotate(45)')
      }

      // Hover interactions
      el.on('mouseenter', function (event) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          title: node.name,
          content: `Type: ${node.type}${node.subType ? ` (${node.subType.replace(/_/g, ' ')})` : ''}`,
          extra: [
            node.tier ? `Tier: ${node.tier.replace('_', ' ').toUpperCase()}` : null,
            node.accessType ? `Access: ${node.accessType}` : null,
            node.criticality ? `Criticality: ${node.criticality}` : null,
          ].filter(Boolean).join(' \u2022 ') || undefined,
        })

        // Raise node and highlight its edge
        d3.select(this).raise()
        edgeGroup.selectAll('path').each(function () {
          const path = d3.select(this)
          if (path.attr('data-node-id') === node.id) {
            path.attr('opacity', 1).attr('stroke-width', 3)
          } else {
            path.attr('opacity', 0.05)
          }
        })
      })

      el.on('mouseleave', function () {
        setTooltip(null)
        // Restore all edges
        edgeGroup.selectAll('path').each(function () {
          const path = d3.select(this)
          path.attr('opacity', path.attr('data-orig-opacity'))
          path.attr('stroke-width', path.attr('data-orig-width'))
        })
      })

      el.on('click', (event) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(node)
      })

      // ── Labels: show for ALL nodes, with smarter truncation ──
      const maxLabelLen = pos.ringLevel === 1 ? 16 : pos.ringLevel === 2 ? 12 : 10
      const labelText = node.name.length > maxLabelLen
        ? node.name.slice(0, maxLabelLen) + '\u2026'
        : node.name
      const labelSize = isT0 ? '10px' : pos.ringLevel === 1 ? '9px' : '8px'

      // Background pill for label readability
      const textNode = el.append('text')
        .text(labelText)
        .attr('y', r + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', isT0 ? 'var(--text-primary)' : 'var(--text-secondary)')
        .attr('font-size', labelSize)
        .attr('font-weight', isT0 ? '700' : '500')
        .attr('pointer-events', 'none')

      // Tier badge below label for T0/T1 nodes
      if (node.tier === 'tier_0' || node.tier === 'tier_1') {
        const badgeColor = node.tier === 'tier_0' ? '#DC2626' : '#EA580C'
        const badgeText = node.tier === 'tier_0' ? 'T0' : 'T1'
        el.append('rect')
          .attr('x', -10).attr('y', r + 18)
          .attr('width', 20).attr('height', 12)
          .attr('rx', 6)
          .attr('fill', badgeColor)
          .attr('opacity', 0.9)
        el.append('text')
          .text(badgeText)
          .attr('x', 0).attr('y', r + 26.5)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .attr('pointer-events', 'none')
      }
    }

    // ── Center node ──
    const centerGroup = g.append('g').attr('transform', `translate(${cx}, ${cy})`)

    // Outer pulse ring
    centerGroup.append('circle')
      .attr('r', 30)
      .attr('fill', 'none')
      .attr('stroke', '#DC2626')
      .attr('stroke-width', 2)
      .attr('class', 'br-center-pulse')

    centerGroup.attr('filter', 'url(#br-center-glow)')

    // Main circle — bigger
    centerGroup.append('circle')
      .attr('r', 24)
      .attr('fill', '#DC2626')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)

    // Center name
    const centerName = data.center.name.length > 14
      ? data.center.name.slice(0, 14) + '\u2026'
      : data.center.name
    centerGroup.append('text')
      .text(centerName)
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')

    // Risk score inside center
    centerGroup.append('text')
      .text(`Risk: ${data.center.riskScore}`)
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '8px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')

    // Center tier label below
    centerGroup.append('text')
      .text(data.center.tier.replace('_', ' ').toUpperCase())
      .attr('y', 36)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-tertiary)')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')

    // Center hover
    centerGroup
      .attr('cursor', 'pointer')
      .on('mouseenter', (event) => {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          title: data.center.name,
          content: `Type: ${data.center.type}${data.center.subType ? ` (${data.center.subType.replace(/_/g, ' ')})` : ''}`,
          extra: `Tier: ${data.center.tier.replace('_', ' ').toUpperCase()} \u2022 Risk: ${data.center.riskScore} \u2022 Reachable: ${data.stats.totalReachable}`,
        })
      })
      .on('mouseleave', () => setTooltip(null))
  }, [data, dimensions, onNodeClick])

  useEffect(() => { draw() }, [draw])

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-96 text-[var(--text-tertiary)] ${className}`}>
        Select an identity to visualize blast radius
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)] w-full"
        style={{ boxShadow: 'var(--shadow-card)' }}
      />

      {/* Stats overlay (top-right) */}
      <div className="absolute top-3 end-3 bg-[var(--bg-primary)]/95 backdrop-blur-sm border border-[var(--border-default)] rounded-[var(--radius-badge)] p-3 space-y-1.5 text-micro select-none" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Impact Summary</p>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Reachable:</span>
          <span className="font-bold text-[var(--text-primary)] text-sm">{data.stats.totalReachable}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">T0 Reachable:</span>
          <span className="font-bold text-[var(--color-critical)] text-sm">{data.stats.t0Reachable}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Blast Score:</span>
          <span className={`font-bold text-sm ${data.stats.blastRadiusScore >= 70 ? 'text-[var(--color-critical)]' : data.stats.blastRadiusScore >= 40 ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'}`}>
            {data.stats.blastRadiusScore}/100
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Highest Tier:</span>
          <span className={`font-bold text-sm ${data.stats.highestTier === 'tier_0' ? 'text-[var(--color-critical)]' : ''}`}>
            {data.stats.highestTier?.replace('_', ' ').toUpperCase() || 'N/A'}
          </span>
        </div>
      </div>

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-3 start-3">
        <GraphLegend
          title="Blast Radius Legend"
          nodes={BLAST_RADIUS_LEGEND_NODES}
          edges={BLAST_RADIUS_LEGEND_EDGES}
          tiers={TIER_COLORS}
          defaultCollapsed={true}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border border-[var(--border-default)] rounded-[var(--radius-card)] p-3 pointer-events-none max-w-[300px]"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14, boxShadow: 'var(--shadow-dropdown)' }}
        >
          <p className="text-caption font-bold text-[var(--text-primary)]">{tooltip.title}</p>
          <p className="text-micro text-[var(--text-secondary)] mt-0.5">{tooltip.content}</p>
          {tooltip.extra && <p className="text-micro text-[var(--text-tertiary)] mt-1">{tooltip.extra}</p>}
        </div>
      )}
    </div>
  )
}
