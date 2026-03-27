import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, identities, attackPaths } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { buildAdjacencyList, findAllPaths, invalidateCache } from '@/lib/graph/traversal'
import { ATTACK_PATH_NARRATION_PROMPT } from '@/lib/ai/prompts'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow all in dev when no secret is set
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allOrgs = await db.select({ id: organizations.id }).from(organizations)
    let totalPaths = 0

    for (const org of allOrgs) {
      const orgId = org.id

      // Invalidate cache to get fresh data
      invalidateCache(orgId)

      // Build adjacency list
      const graph = await buildAdjacencyList(orgId)

      // Find T0 targets
      const t0NodeIds = new Set<string>()
      for (const [nodeId, meta] of graph.nodeMetadata) {
        if (meta.tier === 'tier_0') t0NodeIds.add(nodeId)
      }

      if (t0NodeIds.size === 0) continue

      // Find non-T0 identity starting points
      const orgIdents = await db
        .select({ id: identities.id, adTier: identities.adTier })
        .from(identities)
        .where(eq(identities.orgId, orgId))

      const startingIdentities = orgIdents
        .filter(i => i.adTier !== 'tier_0')
        .map(i => i.id)

      // Discover paths
      const discoveredPaths: Array<{
        sourceIdentityId: string
        targetId: string
        targetType: 'identity' | 'resource'
        pathNodes: any[]
        pathEdges: any[]
        pathLength: number
        riskScore: number
        attackTechnique: string
        mitreId: string | null
      }> = []

      for (const startId of startingIdentities) {
        const paths = findAllPaths(graph, startId, (nodeId) => t0NodeIds.has(nodeId), 6)

        for (const p of paths) {
          const lastNodeId = p.path[p.path.length - 1]
          const targetMeta = graph.nodeMetadata.get(lastNodeId)

          const baseRisk = Math.max(20, 100 - (p.length - 1) * 15)
          const hasDangerous = p.edges.some(e => e.properties?.dangerous)
          const hasGenericAll = p.edges.some(e => e.label?.includes('GenericAll'))
          const riskScore = Math.min(100, baseRisk + (hasDangerous ? 15 : 0) + (hasGenericAll ? 20 : 0))

          const technique = determineTechnique(p.edges)

          discoveredPaths.push({
            sourceIdentityId: startId,
            targetId: lastNodeId,
            targetType: targetMeta?.type === 'resource' ? 'resource' : 'identity',
            pathNodes: p.path.map(nodeId => {
              const meta = graph.nodeMetadata.get(nodeId)
              return { id: nodeId, type: meta?.type || 'unknown', name: meta?.name || nodeId, tier: meta?.tier }
            }),
            pathEdges: p.edges.map(e => ({
              source: e.source, target: e.target, type: e.type, label: e.label,
              technique: edgeToTechnique(e),
            })),
            pathLength: p.length,
            riskScore,
            attackTechnique: technique.name,
            mitreId: technique.mitreId,
          })
        }
      }

      // Sort and take top 100
      discoveredPaths.sort((a, b) => b.riskScore - a.riskScore)
      const topPaths = discoveredPaths.slice(0, 100)

      if (topPaths.length > 0) {
        await db.delete(attackPaths).where(eq(attackPaths.orgId, orgId))

        await db.insert(attackPaths).values(topPaths.map(p => ({
          sourceIdentityId: p.sourceIdentityId,
          targetIdentityId: p.targetType === 'identity' ? p.targetId : undefined,
          targetResourceId: p.targetType === 'resource' ? p.targetId : undefined,
          pathNodes: p.pathNodes,
          pathEdges: p.pathEdges,
          pathLength: p.pathLength,
          riskScore: p.riskScore,
          attackTechnique: p.attackTechnique,
          mitreId: p.mitreId,
          status: 'open' as const,
          orgId,
        })))

        totalPaths += topPaths.length
      }

      // Narrate top 50 (background, non-blocking)
      narrateTopPaths(orgId, topPaths.slice(0, 50)).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: `Attack path scan complete: ${totalPaths} paths discovered`,
      count: totalPaths,
    })
  } catch (error) {
    console.error('Attack path scanner cron error:', error)
    return NextResponse.json(
      { success: false, message: 'Attack path scanner failed', error: String(error) },
      { status: 500 }
    )
  }
}

// ── Helpers (duplicated from main route to keep cron self-contained) ──

function determineTechnique(edges: Array<{ type: string; label: string; properties?: Record<string, any> }>): { name: string; mitreId: string | null } {
  for (const e of edges) {
    const label = (e.label || '').toLowerCase()
    if (label.includes('genericall') || label.includes('generic_all')) return { name: 'AD Object Takeover', mitreId: 'T1222.001' }
    if (label.includes('writedacl') || label.includes('write_dacl')) return { name: 'DACL Modification', mitreId: 'T1222.001' }
    if (label.includes('writeowner') || label.includes('write_owner')) return { name: 'Owner Modification', mitreId: 'T1222.001' }
    if (label.includes('dcsync')) return { name: 'DCSync', mitreId: 'T1003.006' }
    if (label.includes('force_change_password')) return { name: 'Forced Password Change', mitreId: 'T1098' }
    if (label.includes('add_member') || label.includes('addmember')) return { name: 'Group Membership Abuse', mitreId: 'T1098.002' }
    if (e.type === 'delegation' && e.properties?.dangerous) return { name: 'Delegation Abuse', mitreId: 'T1134.001' }
    if (label.includes('domain admin') || label.includes('enterprise admin')) return { name: 'Privilege Escalation via Entitlement', mitreId: 'T1078.002' }
  }
  if (edges.some(e => e.type === 'membership')) return { name: 'Group Membership Chain', mitreId: 'T1078.002' }
  if (edges.some(e => e.type === 'owner')) return { name: 'NHI Owner Compromise', mitreId: 'T1078.004' }
  return { name: 'Lateral Movement', mitreId: 'T1021' }
}

function edgeToTechnique(edge: { type: string; label: string; properties?: Record<string, any> }): string {
  const label = (edge.label || '').toLowerCase()
  if (label.includes('genericall')) return 'GenericAll'
  if (label.includes('writedacl')) return 'WriteDACL'
  if (label.includes('writeowner')) return 'WriteOwner'
  if (label.includes('dcsync')) return 'DCSync'
  if (label.includes('add_member')) return 'AddMember'
  if (label.includes('force_change_password')) return 'ForceChangePassword'
  if (edge.type === 'membership') return 'GroupMembership'
  if (edge.type === 'entitlement') return 'Entitlement'
  if (edge.type === 'owner') return 'OwnerOf'
  if (edge.type === 'delegation') return 'Delegation'
  if (edge.type === 'acl') return 'ACLAbuse'
  return edge.type
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

async function narrateTopPaths(orgId: string, paths: any[]) {
  for (const path of paths) {
    try {
      const prompt = `Analyze this attack path:\n${JSON.stringify(path, null, 2)}`
      let narrative: string | null = null

      // Try Ollama
      try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
              { role: 'system', content: ATTACK_PATH_NARRATION_PROMPT },
              { role: 'user', content: prompt },
            ],
            stream: false, format: 'json',
            options: { temperature: 0.3, num_predict: 1024 },
          }),
          signal: AbortSignal.timeout(60000),
        })
        if (response.ok) {
          const result = await response.json()
          const text = result.message?.content || ''
          try { const parsed = JSON.parse(text); narrative = parsed.narrative || text } catch { narrative = text }
        }
      } catch { /* fallthrough */ }

      // Try Anthropic
      if (!narrative && process.env.ANTHROPIC_API_KEY) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY!,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2048,
              system: ATTACK_PATH_NARRATION_PROMPT,
              messages: [{ role: 'user', content: prompt }],
            }),
          })
          if (response.ok) {
            const result = await response.json()
            const text = result.content?.[0]?.text || ''
            try { const parsed = JSON.parse(text); narrative = parsed.narrative || text } catch { narrative = text }
          }
        } catch { /* fallthrough */ }
      }

      if (narrative) {
        const matching = await db
          .select({ id: attackPaths.id })
          .from(attackPaths)
          .where(and(eq(attackPaths.orgId, orgId), eq(attackPaths.sourceIdentityId, path.sourceIdentityId), eq(attackPaths.riskScore, path.riskScore)))
          .limit(1)

        if (matching.length > 0) {
          await db.update(attackPaths).set({ aiNarrative: narrative }).where(eq(attackPaths.id, matching[0].id))
        }
      }
    } catch { /* continue */ }
  }
}
