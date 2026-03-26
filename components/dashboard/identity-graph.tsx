'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface GraphNode {
  id: string
  label: string
  type: 'identity' | 'resource' | 'group'
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

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'entitlement' | 'membership' | 'manager' | 'owner'
  label?: string
}

interface IdentityGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode) => void
  visibleEdgeTypes?: string[]
}

const NODE_COLORS: Record<string, string> = {
  identity_human: '#2563EB',
  identity_non_human: '#7C3AED',
  resource: '#5F6B7A',
  group: '#CA8A04',
}

const TIER_RING: Record<string, string> = {
  tier_0: '#DC2626',
  tier_1: '#EA580C',
  tier_2: '#5F6B7A',
}

const EDGE_STYLES: Record<string, { stroke: string; dasharray: string }> = {
  entitlement: { stroke: '#94a3b8', dasharray: 'none' },
  membership: { stroke: '#cbd5e1', dasharray: '4,4' },
  manager: { stroke: '#3B82F6', dasharray: '6,3' },
  owner: { stroke: '#8B5CF6', dasharray: '6,3' },
}

export function IdentityGraph({
  nodes,
  links,
  width = 900,
  height = 600,
  onNodeClick,
  visibleEdgeTypes,
}: IdentityGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Filter links by visible edge types
    const filteredLinks = visibleEdgeTypes
      ? links.filter(l => visibleEdgeTypes.includes(l.type))
      : links

    // Arrow markers for manager/owner edges
    const defs = svg.append('defs')
    const markerTypes = [
      { id: 'arrow-manager', color: '#3B82F6' },
      { id: 'arrow-owner', color: '#8B5CF6' },
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

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes as GraphNode[])
      .force('link', d3.forceLink<GraphNode, any>(filteredLinks as any[]).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => EDGE_STYLES[d.type]?.stroke || '#94a3b8')
      .attr('stroke-width', (d: any) => (d.type === 'manager' || d.type === 'owner') ? 1.5 : 1)
      .attr('stroke-dasharray', (d: any) => EDGE_STYLES[d.type]?.dasharray || 'none')
      .attr('opacity', 0.5)
      .attr('marker-end', (d: any) => {
        if (d.type === 'manager') return 'url(#arrow-manager)'
        if (d.type === 'owner') return 'url(#arrow-owner)'
        return null
      })

    // Edge labels for manager/owner
    const edgeLabels = g.append('g')
      .selectAll('text')
      .data(filteredLinks.filter((l: any) => l.type === 'manager' || l.type === 'owner'))
      .enter()
      .append('text')
      .text((d: any) => d.label || d.type)
      .attr('text-anchor', 'middle')
      .attr('fill', (d: any) => d.type === 'manager' ? '#3B82F6' : '#8B5CF6')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('dy', -4)

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes as GraphNode[])
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
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
          d.fx = null
          d.fy = null
        })
      )

    // Node circles/shapes
    node.each(function (d) {
      const el = d3.select(this)
      const nodeType = d.type === 'identity' ? `identity_${d.identityType}` : d.type
      const color = NODE_COLORS[nodeType] || NODE_COLORS.resource
      const radius = d.type === 'identity' ? Math.max(8, (d.riskScore || 10) / 5) : 6

      if (d.type === 'identity') {
        // Circle for identities
        el.append('circle')
          .attr('r', radius)
          .attr('fill', color)
          .attr('stroke', d.tierViolation ? '#DC2626' : (TIER_RING[d.tier || ''] || 'none'))
          .attr('stroke-width', d.tierViolation ? 3 : 1.5)
      } else if (d.type === 'resource') {
        // Square for resources
        const s = radius * 1.5
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 2)
          .attr('fill', TIER_RING[d.tier || ''] || color)
          .attr('opacity', 0.8)
      } else {
        // Diamond for groups
        const s = radius * 1.5
        el.append('rect')
          .attr('x', -s / 2).attr('y', -s / 2)
          .attr('width', s).attr('height', s)
          .attr('rx', 1)
          .attr('fill', d.isPrivileged ? '#DC2626' : '#CA8A04')
          .attr('opacity', 0.8)
          .attr('transform', 'rotate(45)')
      }

      // Label
      el.append('text')
        .text(d.label.length > 15 ? d.label.slice(0, 15) + '...' : d.label)
        .attr('dy', d.type === 'identity' ? radius + 12 : 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '10px')
        .attr('pointer-events', 'none')
    })

    // Interactions
    node.on('click', (event, d) => {
      event.stopPropagation()
      if (onNodeClick) {
        onNodeClick(d)
      }
    })
    node.on('mouseenter', (event, d) => {
      setTooltip({ x: event.pageX, y: event.pageY, node: d })
    })
    node.on('mouseleave', () => setTooltip(null))

    // Click on empty space to deselect
    svg.on('click', () => {
      if (onNodeClick) {
        // Don't deselect here; the panel has its own close button
      }
    })

    // Tick
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
  }, [nodes, links, width, height, onNodeClick, visibleEdgeTypes])

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
      <div className="absolute top-3 left-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-badge)] p-2 text-micro space-y-1">
        <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Nodes</p>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }} /> Human</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#7C3AED' }} /> NHI</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: '#5F6B7A' }} /> Resource</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded rotate-45" style={{ background: '#CA8A04' }} /> Group</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-red-500" /> Tier Violation</div>
        <div className="border-t border-[var(--border-default)] my-1 pt-1">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Edges</p>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5" style={{ background: '#94a3b8' }} /> Entitlement</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#cbd5e1' }} /> Membership</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#3B82F6' }} /> Manager</div>
          <div className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: '#8B5CF6' }} /> Owner</div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-3 text-caption pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12, boxShadow: 'var(--shadow-dropdown)' }}
        >
          <p className="font-medium text-[var(--text-primary)]">{tooltip.node.label}</p>
          <p className="text-[var(--text-tertiary)] capitalize">{tooltip.node.type} {tooltip.node.subType ? `· ${tooltip.node.subType.replace(/_/g, ' ')}` : ''}</p>
          {tooltip.node.tier && <p className="text-[var(--text-secondary)]">Tier: {tooltip.node.tier.replace('_', ' ')}</p>}
          {tooltip.node.riskScore !== undefined && <p className="text-[var(--text-secondary)]">Risk: {tooltip.node.riskScore}</p>}
          {tooltip.node.tierViolation && <p className="text-[var(--color-critical)] font-medium">TIER VIOLATION</p>}
        </div>
      )}
    </div>
  )
}
