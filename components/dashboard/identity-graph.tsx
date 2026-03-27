'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'

// ── Types ──

export interface GraphNode {
  id: string
  label: string
  type: 'identity' | 'resource' | 'group' | 'violation' | 'account'
  subType?: string
  tier?: string
  riskScore?: number
  tierViolation?: boolean
  identityType?: string
  isPrivileged?: boolean
  properties?: Record<string, any>
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'entitlement' | 'membership' | 'manager' | 'owner' | 'violation' | 'account'
  label?: string
  properties?: Record<string, any>
}

export type GraphLayout = 'force' | 'hierarchical' | 'radial'

interface IdentityGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  width?: number
  height?: number
  layout?: GraphLayout
  onNodeClick?: (node: GraphNode) => void
  onNodeDoubleClick?: (node: GraphNode) => void
  onNodeRightClick?: (node: GraphNode, x: number, y: number) => void
  onEdgeHover?: (link: GraphLink | null, x: number, y: number) => void
  visibleEdgeTypes?: string[]
}

// ── Constants ──

const NODE_COLORS: Record<string, string> = {
  identity_human: '#2563EB',
  identity_non_human: '#7C3AED',
  resource: '#5F6B7A',
  group: '#CA8A04',
  violation: '#DC2626',
  account: '#4F46E5',
}

const TIER_RING: Record<string, string> = {
  tier_0: '#DC2626',
  tier_1: '#EA580C',
  tier_2: '#5F6B7A',
}

const EDGE_STYLES: Record<string, { stroke: string; dasharray: string; width: number }> = {
  entitlement: { stroke: '#94a3b8', dasharray: 'none', width: 1 },
  membership: { stroke: '#cbd5e1', dasharray: '4,4', width: 0.8 },
  manager: { stroke: '#3B82F6', dasharray: '6,3', width: 1.5 },
  owner: { stroke: '#8B5CF6', dasharray: '6,3', width: 1.5 },
  violation: { stroke: '#DC2626', dasharray: 'none', width: 2 },
  account: { stroke: '#4F46E5', dasharray: '3,3', width: 1 },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#5F6B7A',
}

// ── Helper: tier to Y position for hierarchical layout ──

function tierToY(tier: string | undefined, height: number): number {
  const padding = 60
  const usable = height - padding * 2
  switch (tier) {
    case 'tier_0': return padding
    case 'tier_1': return padding + usable * 0.35
    case 'tier_2': return padding + usable * 0.65
    default: return padding + usable * 0.9
  }
}

// ── Component ──

export function IdentityGraph({
  nodes,
  links,
  width = 900,
  height = 600,
  layout = 'force',
  onNodeClick,
  onNodeDoubleClick,
  onNodeRightClick,
  onEdgeHover,
  visibleEdgeTypes,
}: IdentityGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null)

  const getNodeRadius = useCallback((d: GraphNode) => {
    if (d.type === 'identity') return Math.max(8, Math.min(22, (d.riskScore || 10) / 4))
    if (d.type === 'violation') return 7
    if (d.type === 'account') return 6
    return 6
  }, [])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Filter links by visible edge types
    const filteredLinks = visibleEdgeTypes
      ? links.filter(l => visibleEdgeTypes.includes(l.type))
      : links

    // ── Defs (arrows, filters, animations) ──
    const defs = svg.append('defs')

    // Arrow markers
    const markerTypes = [
      { id: 'arrow-manager', color: '#3B82F6' },
      { id: 'arrow-owner', color: '#8B5CF6' },
      { id: 'arrow-violation', color: '#DC2626' },
      { id: 'arrow-account', color: '#4F46E5' },
    ]
    for (const m of markerTypes) {
      defs.append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', m.color)
        .attr('d', 'M0,-5L10,0L0,5')
    }

    // Glow filter for critical violations
    const glowFilter = defs.append('filter')
      .attr('id', 'glow-critical')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur')
    glowFilter.append('feFlood')
      .attr('flood-color', '#DC2626')
      .attr('flood-opacity', '0.6')
      .attr('result', 'color')
    glowFilter.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'shadow')
    const glowMerge = glowFilter.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'shadow')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Pulse animation style
    svg.append('style').text(`
      @keyframes graphPulse {
        0% { r: inherit; opacity: 1; }
        50% { opacity: 0.4; }
        100% { r: inherit; opacity: 1; }
      }
      .graph-pulse-ring {
        animation: graphPulse 2s ease-in-out infinite;
      }
    `)

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Clone nodes to avoid mutating props
    const simNodes = nodes.map(n => ({ ...n })) as GraphNode[]
    const simLinks = filteredLinks.map(l => ({ ...l }))

    // ── Layout Initialization ──
    if (layout === 'hierarchical') {
      // Group nodes by tier for identity nodes, position non-identity near connected identity
      const identityNodes = simNodes.filter(n => n.type === 'identity')
      const tierGroups: Record<string, GraphNode[]> = {}
      for (const n of identityNodes) {
        const key = n.tier || 'unclassified'
        if (!tierGroups[key]) tierGroups[key] = []
        tierGroups[key].push(n)
      }
      for (const [tier, group] of Object.entries(tierGroups)) {
        const y = tierToY(tier, height)
        group.forEach((n, i) => {
          const spacing = width / (group.length + 1)
          n.x = spacing * (i + 1)
          n.y = y
          n.fx = n.x
          n.fy = n.y
        })
      }
      // Position non-identity nodes near their connected identity
      const identityIdSet = new Set(identityNodes.map(n => n.id))
      for (const n of simNodes) {
        if (identityIdSet.has(n.id)) continue
        const connectedLink = simLinks.find(l => {
          const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
          const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
          return sid === n.id || tid === n.id
        })
        if (connectedLink) {
          const sid = typeof connectedLink.source === 'string' ? connectedLink.source : (connectedLink.source as GraphNode).id
          const tid = typeof connectedLink.target === 'string' ? connectedLink.target : (connectedLink.target as GraphNode).id
          const connectedId = sid === n.id ? tid : sid
          const connectedNode = simNodes.find(cn => cn.id === connectedId)
          if (connectedNode && connectedNode.x !== undefined && connectedNode.y !== undefined) {
            n.x = connectedNode.x + (Math.random() - 0.5) * 60
            n.y = connectedNode.y + 30 + Math.random() * 20
          }
        }
      }
    } else if (layout === 'radial') {
      // Radial: high risk at center
      const sorted = [...simNodes].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      const cx = width / 2
      const cy = height / 2
      const maxRadius = Math.min(width, height) / 2 - 40
      sorted.forEach((n, i) => {
        if (i === 0) {
          n.x = cx
          n.y = cy
        } else {
          const risk = n.riskScore || 0
          const ringDist = maxRadius * (1 - risk / 100) * 0.8 + maxRadius * 0.2
          const angle = (i / sorted.length) * 2 * Math.PI
          n.x = cx + ringDist * Math.cos(angle)
          n.y = cy + ringDist * Math.sin(angle)
        }
      })
    }

    // ── Simulation ──
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, any>(simLinks as any[]).id((d: any) => d.id).distance(layout === 'force' ? 80 : 50))
      .force('charge', d3.forceManyBody().strength(layout === 'force' ? -200 : -50))
      .force('center', layout === 'force' ? d3.forceCenter(width / 2, height / 2) : null)
      .force('collision', d3.forceCollide().radius((d: any) => getNodeRadius(d) + 5))

    if (layout !== 'force') {
      simulation.alpha(0.3).alphaDecay(0.05)
    }

    // ── Links ──
    const linkGroup = g.append('g').attr('class', 'links')
    const link = linkGroup
      .selectAll<SVGLineElement, typeof simLinks[0]>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', d => EDGE_STYLES[d.type]?.stroke || '#94a3b8')
      .attr('stroke-width', d => EDGE_STYLES[d.type]?.width || 1)
      .attr('stroke-dasharray', d => EDGE_STYLES[d.type]?.dasharray || 'none')
      .attr('opacity', 0.5)
      .attr('data-link-type', d => d.type)
      .attr('marker-end', d => {
        if (d.type === 'manager') return 'url(#arrow-manager)'
        if (d.type === 'owner') return 'url(#arrow-owner)'
        if (d.type === 'violation') return 'url(#arrow-violation)'
        if (d.type === 'account') return 'url(#arrow-account)'
        return null
      })

    // Edge hover interaction
    link
      .on('mouseenter', function (event, d) {
        if (onEdgeHover) {
          onEdgeHover(d as GraphLink, event.pageX, event.pageY)
        }
        d3.select(this)
          .attr('stroke-width', (EDGE_STYLES[d.type]?.width || 1) * 2.5)
          .attr('opacity', 1)
      })
      .on('mouseleave', function (_event, d) {
        if (onEdgeHover) {
          onEdgeHover(null, 0, 0)
        }
        d3.select(this)
          .attr('stroke-width', EDGE_STYLES[d.type]?.width || 1)
          .attr('opacity', 0.5)
      })

    // Edge labels for manager/owner
    const edgeLabelLinks = simLinks.filter(l => l.type === 'manager' || l.type === 'owner')
    const edgeLabels = g.append('g')
      .selectAll('text')
      .data(edgeLabelLinks)
      .enter()
      .append('text')
      .text((d: any) => d.label || d.type)
      .attr('text-anchor', 'middle')
      .attr('fill', (d: any) => d.type === 'manager' ? '#3B82F6' : '#8B5CF6')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('dy', -4)

    // ── Nodes ──
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const node = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .attr('data-node-id', d => d.id)
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          if (layout === 'force') {
            d.fx = null
            d.fy = null
          }
        })
      )

    // Draw node shapes
    node.each(function (d) {
      const el = d3.select(this)
      const nodeType = d.type === 'identity' ? `identity_${d.identityType}` : d.type
      const color = NODE_COLORS[nodeType] || NODE_COLORS.resource
      const radius = getNodeRadius(d)

      if (d.type === 'identity') {
        // Pulse ring for tier violations
        if (d.tierViolation) {
          el.append('circle')
            .attr('r', radius + 4)
            .attr('fill', 'none')
            .attr('stroke', '#DC2626')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6)
            .attr('class', 'graph-pulse-ring')
        }
        el.append('circle')
          .attr('r', radius)
          .attr('fill', color)
          .attr('stroke', d.tierViolation ? '#DC2626' : (TIER_RING[d.tier || ''] || 'none'))
          .attr('stroke-width', d.tierViolation ? 3 : 1.5)
      } else if (d.type === 'resource') {
        const s = radius * 1.6
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 2)
          .attr('fill', TIER_RING[d.tier || ''] || color)
          .attr('opacity', 0.85)
      } else if (d.type === 'group') {
        const s = radius * 1.6
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 1)
          .attr('fill', d.isPrivileged ? '#DC2626' : '#CA8A04')
          .attr('opacity', 0.85)
          .attr('transform', 'rotate(45)')
      } else if (d.type === 'violation') {
        // Triangle for violations
        const severity = d.properties?.severity || 'medium'
        const vColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium
        const s = radius * 1.8
        const trianglePath = `M0,${-s * 0.7} L${s * 0.6},${s * 0.4} L${-s * 0.6},${s * 0.4} Z`
        el.append('path')
          .attr('d', trianglePath)
          .attr('fill', vColor)
          .attr('opacity', 0.9)
        if (severity === 'critical') {
          el.attr('filter', 'url(#glow-critical)')
        }
        // Exclamation mark
        el.append('text')
          .text('!')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.2em')
          .attr('fill', '#fff')
          .attr('font-size', `${Math.max(8, s * 0.6)}px`)
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none')
      } else if (d.type === 'account') {
        // Hexagon for accounts
        const s = radius * 1.3
        const hex = d3.range(6).map(i => {
          const angle = (i * 60 - 30) * Math.PI / 180
          return `${s * Math.cos(angle)},${s * Math.sin(angle)}`
        }).join(' ')
        el.append('polygon')
          .attr('points', hex)
          .attr('fill', d.properties?.privileged ? '#7C3AED' : '#4F46E5')
          .attr('opacity', 0.85)
      }

      // Label
      el.append('text')
        .text(d.label.length > 16 ? d.label.slice(0, 16) + '...' : d.label)
        .attr('dy', radius + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '10px')
        .attr('pointer-events', 'none')
    })

    // ── Interactions ──

    // Click
    node.on('click', (event, d) => {
      event.stopPropagation()
      if (onNodeClick) onNodeClick(d)
    })

    // Double-click
    node.on('dblclick', (event, d) => {
      event.stopPropagation()
      event.preventDefault()
      if (onNodeDoubleClick) onNodeDoubleClick(d)
    })

    // Right-click (context menu)
    node.on('contextmenu', (event, d) => {
      event.preventDefault()
      event.stopPropagation()
      if (onNodeRightClick) onNodeRightClick(d, event.pageX, event.pageY)
    })

    // Hover: highlight connected edges, dim unconnected
    node.on('mouseenter', function (event, d) {
      setTooltip({ x: event.pageX, y: event.pageY, node: d })

      // Highlight connected
      const connectedNodeIds = new Set<string>([d.id])
      link.each(function (l) {
        const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
        const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
        if (sid === d.id || tid === d.id) {
          connectedNodeIds.add(sid)
          connectedNodeIds.add(tid)
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', (EDGE_STYLES[l.type]?.width || 1) * 2)
        } else {
          d3.select(this).attr('opacity', 0.1)
        }
      })

      node.each(function (n) {
        d3.select(this).attr('opacity', connectedNodeIds.has(n.id) ? 1 : 0.2)
      })
    })

    node.on('mouseleave', function () {
      setTooltip(null)
      link
        .attr('opacity', 0.5)
        .attr('stroke-width', (d: any) => EDGE_STYLES[d.type]?.width || 1)
      node.attr('opacity', 1)
    })

    // ── Tick ──
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      edgeLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [nodes, links, width, height, layout, onNodeClick, onNodeDoubleClick, onNodeRightClick, onEdgeHover, visibleEdgeTypes, getNodeRadius])

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-primary)]"
        style={{ boxShadow: 'var(--shadow-card)' }}
      />

      {/* Legend */}
      <div className="absolute top-3 start-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-badge)] p-2 text-micro space-y-1 select-none">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Nodes</p>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }} /> Human</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#7C3AED' }} /> NHI</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: '#5F6B7A' }} /> Resource</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded rotate-45" style={{ background: '#CA8A04' }} /> Group</div>
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3" viewBox="0 -8 12 16"><path d="M0,-7 L7,4 L-7,4 Z" fill="#DC2626" /></svg>
          Violation
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3" viewBox="-8 -8 16 16">
            <polygon points="6.9,4 4,6.9 -4,6.9 -6.9,4 -6.9,-4 -4,-6.9 4,-6.9 6.9,-4" fill="#4F46E5" />
          </svg>
          Account
        </div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-red-500" /> Tier Violation</div>
        <div className="border-t border-[var(--border-default)] my-1 pt-1">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Edges</p>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5" style={{ background: '#94a3b8' }} /> Entitlement</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#cbd5e1' }} /> Membership</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#3B82F6' }} /> Manager</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#8B5CF6' }} /> Owner</div>
          <div className="flex items-center gap-2"><span className="w-4 h-[2px]" style={{ background: '#DC2626' }} /> Violation</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#4F46E5' }} /> Account</div>
        </div>
      </div>

      {/* Node tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-3 text-caption pointer-events-none max-w-[240px]"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12, boxShadow: 'var(--shadow-dropdown)' }}
        >
          <p className="font-medium text-[var(--text-primary)]">{tooltip.node.label}</p>
          <p className="text-[var(--text-tertiary)] capitalize">{tooltip.node.type} {tooltip.node.subType ? `· ${tooltip.node.subType.replace(/_/g, ' ')}` : ''}</p>
          {tooltip.node.tier && <p className="text-[var(--text-secondary)]">Tier: {tooltip.node.tier.replace('_', ' ')}</p>}
          {tooltip.node.riskScore !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[var(--text-secondary)] text-xs">Risk:</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    tooltip.node.riskScore >= 80 ? 'bg-red-500' :
                    tooltip.node.riskScore >= 60 ? 'bg-orange-500' :
                    tooltip.node.riskScore >= 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${tooltip.node.riskScore}%` }}
                />
              </div>
              <span className="text-[var(--text-secondary)] text-xs font-medium">{tooltip.node.riskScore}</span>
            </div>
          )}
          {tooltip.node.tierViolation && <p className="text-[var(--color-critical)] font-medium text-xs mt-1">TIER VIOLATION</p>}
          {tooltip.node.type === 'violation' && tooltip.node.properties?.severity && (
            <p className="text-xs mt-1 capitalize"><span className="text-[var(--text-tertiary)]">Severity:</span> {tooltip.node.properties.severity}</p>
          )}
        </div>
      )}
    </div>
  )
}
