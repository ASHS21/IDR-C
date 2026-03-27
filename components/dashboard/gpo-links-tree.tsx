'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, FolderTree, FileText } from 'lucide-react'

interface GpoLink {
  id: string
  gpoId: string
  gpoName: string
  gpoTier: string
  linkedOu: string
  linkOrder: number
  enforced: boolean
  linkEnabled: boolean
  adTierOfOu: string
}

interface GpoLinksTreeProps {
  links: GpoLink[]
}

interface OuTreeNode {
  name: string
  dn: string
  tier: string
  children: OuTreeNode[]
  gpos: Array<{ id: string; name: string; tier: string; enforced: boolean; linkEnabled: boolean; dangerous: boolean }>
}

const TIER_COLORS: Record<string, string> = {
  tier_0: '#DC2626',
  tier_1: '#EA580C',
  tier_2: '#6B7280',
  unclassified: '#9CA3AF',
}

const TIER_BG: Record<string, string> = {
  tier_0: 'bg-red-500/10 border-red-500/30',
  tier_1: 'bg-orange-500/10 border-orange-500/30',
  tier_2: 'bg-gray-500/10 border-gray-500/30',
  unclassified: 'bg-gray-400/10 border-gray-400/30',
}

function parseDnToPath(dn: string): string[] {
  // Parse "OU=Servers,OU=Corp,DC=acmefs,DC=local" into path parts
  const parts = dn.split(',').reverse()
  const path: string[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed.startsWith('DC=')) {
      path.push(trimmed.replace('DC=', ''))
    } else if (trimmed.startsWith('OU=')) {
      path.push(trimmed.replace('OU=', ''))
    } else if (trimmed.startsWith('CN=')) {
      path.push(trimmed.replace('CN=', ''))
    }
  }
  return path
}

function buildTree(links: GpoLink[]): OuTreeNode {
  const root: OuTreeNode = { name: 'Domain', dn: '', tier: 'unclassified', children: [], gpos: [] }

  for (const link of links) {
    const pathParts = parseDnToPath(link.linkedOu)
    let current = root

    // Walk down the tree, creating nodes as needed
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      let child = current.children.find(c => c.name === part)
      if (!child) {
        child = {
          name: part,
          dn: pathParts.slice(0, i + 1).join('.'),
          tier: 'unclassified',
          children: [],
          gpos: [],
        }
        current.children.push(child)
      }
      current = child
    }

    // Set the tier of the leaf OU from the link
    current.tier = link.adTierOfOu

    // Determine if this GPO-OU combo is dangerous
    const dangerous = link.adTierOfOu === 'tier_0' && link.gpoTier !== 'tier_0'

    current.gpos.push({
      id: link.gpoId,
      name: link.gpoName,
      tier: link.gpoTier,
      enforced: link.enforced,
      linkEnabled: link.linkEnabled,
      dangerous,
    })
  }

  return root
}

function TreeNode({ node, depth = 0 }: { node: OuTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 3)
  const router = useRouter()
  const hasChildren = node.children.length > 0 || node.gpos.length > 0
  const tierColor = TIER_COLORS[node.tier] || TIER_COLORS.unclassified
  const tierBg = TIER_BG[node.tier] || TIER_BG.unclassified

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors`}
        style={{ paddingInlineStart: `${depth * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} className="text-[var(--text-tertiary)] flex-shrink-0" /> : <ChevronRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0 rtl:-scale-x-100" />
        ) : (
          <span className="w-[14px]" />
        )}
        <FolderTree size={14} style={{ color: tierColor }} className="flex-shrink-0" />
        <span className="text-caption font-medium text-[var(--text-primary)] truncate">{node.name}</span>
        {node.tier !== 'unclassified' && (
          <span
            className={`text-micro px-1.5 py-0.5 rounded border font-medium ${tierBg}`}
            style={{ color: tierColor }}
          >
            {node.tier.replace('_', ' ').toUpperCase()}
          </span>
        )}
        {node.gpos.length > 0 && (
          <span className="text-micro text-[var(--text-tertiary)]">({node.gpos.length} GPOs)</span>
        )}
      </div>

      {expanded && (
        <div>
          {/* GPOs linked to this OU */}
          {node.gpos.map((gpo) => (
            <div
              key={`${node.dn}-${gpo.id}`}
              className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${gpo.dangerous ? 'bg-red-500/5' : ''}`}
              style={{ paddingInlineStart: `${(depth + 1) * 20 + 8}px` }}
              onClick={() => router.push(`/dashboard/gpo/${gpo.id}`)}
            >
              <FileText size={13} className="flex-shrink-0" style={{ color: TIER_COLORS[gpo.tier] || '#6B7280' }} />
              <span className={`text-caption truncate ${gpo.dangerous ? 'text-[var(--color-critical)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                {gpo.name}
              </span>
              {gpo.enforced && (
                <span className="text-micro px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/30 font-medium">
                  ENFORCED
                </span>
              )}
              {!gpo.linkEnabled && (
                <span className="text-micro px-1 py-0.5 rounded bg-gray-500/10 text-gray-500 border border-gray-500/30 font-medium">
                  DISABLED
                </span>
              )}
              {gpo.dangerous && (
                <span className="text-micro px-1 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/30 font-medium">
                  RISK
                </span>
              )}
            </div>
          ))}
          {/* Child OUs */}
          {node.children.map((child) => (
            <TreeNode key={child.dn} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function GpoLinksTree({ links }: GpoLinksTreeProps) {
  const tree = useMemo(() => buildTree(links), [links])

  if (links.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-tertiary)]">
        <FolderTree size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-body">No GPO links found</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tree.children.map((child) => (
        <TreeNode key={child.dn} node={child} depth={0} />
      ))}
      {tree.gpos.length > 0 && (
        <TreeNode node={tree} depth={0} />
      )}
    </div>
  )
}
