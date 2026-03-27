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

const RING_BG_OPACITY = [0.06, 0.04, 0.02]
const RING_STROKE_OPACITY = [0.3, 0.2, 0.12]

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
  if (node.tier === 'tier_0') return 8
  if (node.tier === 'tier_1') return 6
  if (node.criticality === 'critical') return 7
  return 5
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setDimensions({
        width: propWidth || width,
        height: propHeight || Math.max(500, Math.min(700, width * 0.7)),
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
    const maxRadius = Math.min(cx, cy) - 50

    // ── Defs ──
    const defs = svg.append('defs')

    // Pulse animation
    svg.append('style').text(`
      @keyframes brPulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 0.3; }
      }
      .br-center-pulse { animation: brPulse 2s ease-in-out infinite; transform-origin: center; }
      @keyframes brRipple {
        0% { r: 0; opacity: 0.6; }
        100% { opacity: 0; }
      }
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
        .attr('fill', `rgba(148, 163, 184, ${RING_BG_OPACITY[i - 1] || 0.02})`)
        .attr('stroke', `rgba(148, 163, 184, ${RING_STROKE_OPACITY[i - 1] || 0.1})`)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', i > 1 ? '4,4' : 'none')

      // Ring label
      const label = data.rings[i - 1]?.label || `Ring ${i}`
      g.append('text')
        .text(`${label} (${data.rings[i - 1]?.nodes.length || 0})`)
        .attr('x', cx)
        .attr('y', cy - ringRadius - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-tertiary)')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .attr('opacity', 0.6)
    }

    // ── Compute node positions on rings ──
    const allNodePositions: Array<{
      x: number
      y: number
      node: BlastRadiusNode
      ringLevel: number
    }> = []

    data.rings.forEach((ring, ringIdx) => {
      const ringRadius = ((ringIdx + 1) / ringCount) * maxRadius
      const nodes = ring.nodes
      const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1)

      // Sort: T0 nodes first, then by type
      const sorted = [...nodes].sort((a, b) => {
        if (a.tier === 'tier_0' && b.tier !== 'tier_0') return -1
        if (b.tier === 'tier_0' && a.tier !== 'tier_0') return 1
        return a.type.localeCompare(b.type)
      })

      sorted.forEach((node, nodeIdx) => {
        const angle = angleStep * nodeIdx - Math.PI / 2
        const x = cx + ringRadius * Math.cos(angle)
        const y = cy + ringRadius * Math.sin(angle)
        allNodePositions.push({ x, y, node, ringLevel: ring.level })
      })
    })

    // ── Draw edges from center to ring 1 nodes, ring-to-ring ──
    const edgeGroup = g.append('g').attr('class', 'edges')

    for (const pos of allNodePositions) {
      const edgeColor = getEdgeColor(pos.node)
      const ringLevel = pos.ringLevel

      // Edge style by ring level
      const dasharray = ringLevel === 1 ? 'none' : ringLevel === 2 ? '5,3' : '2,3'
      const strokeWidth = ringLevel === 1 ? 1.2 : ringLevel === 2 ? 0.8 : 0.5
      const opacity = pos.node.tier === 'tier_0' ? 0.7 : 0.25

      edgeGroup.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', pos.x)
        .attr('y2', pos.y)
        .attr('stroke', edgeColor)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-dasharray', dasharray)
        .attr('opacity', opacity)
    }

    // ── Ripple animation on load ──
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (i / ringCount) * maxRadius
      const ripple = g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 0)
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
          .attr('r', r + 4)
          .attr('fill', 'none')
          .attr('stroke', '#DC2626')
          .attr('stroke-width', 2)
          .attr('opacity', 0.6)
        el.attr('filter', 'url(#br-t0-glow)')
      }

      // Node shape
      if (node.type === 'identity') {
        el.append('circle')
          .attr('r', r)
          .attr('fill', color)
          .attr('stroke', isT0 ? '#DC2626' : 'rgba(255,255,255,0.3)')
          .attr('stroke-width', isT0 ? 2 : 0.5)
      } else if (node.type === 'resource') {
        const s = r * 2
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 2)
          .attr('fill', isT0 ? '#DC2626' : node.tier === 'tier_1' ? '#EA580C' : color)
          .attr('opacity', 0.85)
      } else if (node.type === 'group') {
        const s = r * 1.6
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 1)
          .attr('fill', color)
          .attr('transform', 'rotate(45)')
      }

      // Hover
      el.on('mouseenter', function (event) {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          title: node.name,
          content: `Type: ${node.type}${node.subType ? ` (${node.subType.replace(/_/g, ' ')})` : ''}`,
          extra: [
            node.tier ? `Tier: ${node.tier.replace('_', ' ')}` : null,
            node.accessType ? `Access: ${node.accessType}` : null,
            node.criticality ? `Criticality: ${node.criticality}` : null,
          ].filter(Boolean).join(' | ') || undefined,
        })
        d3.select(this).raise()
        // Highlight edge to center
        edgeGroup.selectAll('line').each(function () {
          const line = d3.select(this)
          const lx2 = parseFloat(line.attr('x2'))
          const ly2 = parseFloat(line.attr('y2'))
          if (Math.abs(lx2 - x) < 1 && Math.abs(ly2 - y) < 1) {
            line.attr('opacity', 0.9).attr('stroke-width', 2.5)
          }
        })
      })
      el.on('mouseleave', function () {
        setTooltip(null)
        edgeGroup.selectAll('line').each(function () {
          const line = d3.select(this)
          const origOpacity = parseFloat(line.attr('data-orig-opacity') || '0.25')
          const origWidth = parseFloat(line.attr('data-orig-width') || '1')
          line.attr('opacity', origOpacity).attr('stroke-width', origWidth)
        })
      })
      el.on('click', (event) => {
        event.stopPropagation()
        if (onNodeClick) onNodeClick(node)
      })

      // Label for larger/important nodes (T0 or ring 1)
      if (isT0 || pos.ringLevel === 1) {
        el.append('text')
          .text(node.name.length > 14 ? node.name.slice(0, 14) + '..' : node.name)
          .attr('y', r + 12)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--text-secondary)')
          .attr('font-size', '9px')
          .attr('font-weight', '500')
          .attr('pointer-events', 'none')
      }
    }

    // Store orig opacity/width for restore on hover
    edgeGroup.selectAll('line').each(function () {
      const line = d3.select(this)
      line.attr('data-orig-opacity', line.attr('opacity'))
      line.attr('data-orig-width', line.attr('stroke-width'))
    })

    // ── Center node ──
    const centerGroup = g.append('g').attr('transform', `translate(${cx}, ${cy})`)

    // Outer pulse ring
    centerGroup.append('circle')
      .attr('r', 26)
      .attr('fill', 'none')
      .attr('stroke', '#DC2626')
      .attr('stroke-width', 2)
      .attr('class', 'br-center-pulse')

    centerGroup.attr('filter', 'url(#br-center-glow)')

    // Main circle
    centerGroup.append('circle')
      .attr('r', 20)
      .attr('fill', '#DC2626')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2.5)

    // Center label
    centerGroup.append('text')
      .text(data.center.name.length > 12 ? data.center.name.slice(0, 12) + '..' : data.center.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')

    // Center subtitle
    centerGroup.append('text')
      .text(`Risk: ${data.center.riskScore}`)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-tertiary)')
      .attr('font-size', '9px')
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
          extra: `Tier: ${data.center.tier.replace('_', ' ')} | Risk: ${data.center.riskScore}`,
        })
      })
      .on('mouseleave', () => setTooltip(null))
  }, [data, dimensions, onNodeClick, expandedNodes])

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
      <div className="absolute top-3 end-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-badge)] p-3 space-y-1.5 text-micro select-none" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Impact</p>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Reachable:</span>
          <span className="font-bold text-[var(--text-primary)]">{data.stats.totalReachable}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">T0 Reachable:</span>
          <span className="font-bold text-[var(--color-critical)]">{data.stats.t0Reachable}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Blast Score:</span>
          <span className={`font-bold ${data.stats.blastRadiusScore >= 70 ? 'text-[var(--color-critical)]' : data.stats.blastRadiusScore >= 40 ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'}`}>
            {data.stats.blastRadiusScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">Highest Tier:</span>
          <span className={`font-bold ${data.stats.highestTier === 'tier_0' ? 'text-[var(--color-critical)]' : ''}`}>
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
