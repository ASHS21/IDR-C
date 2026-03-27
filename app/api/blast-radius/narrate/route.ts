import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { BLAST_RADIUS_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { center, rings, stats } = body

    if (!center || !rings || !stats) {
      return NextResponse.json({ error: 'Missing blast radius data' }, { status: 400 })
    }

    const prompt = `${BLAST_RADIUS_PROMPT}

Blast radius data:
${JSON.stringify({ center, rings, stats }, null, 2)}`

    // Try Ollama first, then fall back to a simple deterministic narrative
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt,
          stream: false,
          format: 'json',
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json()
        const parsed = JSON.parse(ollamaData.response)
        return NextResponse.json(parsed)
      }
    } catch {
      // Ollama not available, fall back
    }

    // Deterministic fallback
    const tierBreachWarning = stats.tierBreaches > 0
      ? `CRITICAL: ${stats.tierBreaches} Tier 0 assets are reachable from this ${center.tier} identity, representing potential full domain compromise.`
      : ''

    const narrative = {
      narrative: `Compromising ${center.name} (${center.type}, ${center.tier}) would expose ${stats.totalReachable} entities across ${rings.length} depth levels. ${tierBreachWarning} Direct access reaches ${rings[0]?.nodes?.length || 0} entities, with transitive paths expanding the blast radius significantly. ${stats.criticalAssets} critical assets are within the reachable set.`,
      criticalAssetsAtRisk: rings
        .flatMap((r: { nodes: Array<{ tier?: string; criticality?: string; name: string; type: string }> }) => r.nodes)
        .filter((n: { tier?: string; criticality?: string }) => n.tier === 'tier_0' || n.criticality === 'critical')
        .slice(0, 5)
        .map((n: { name: string; type: string; tier?: string }) => ({
          name: n.name,
          type: n.type,
          tier: n.tier || 'unknown',
          accessPath: 'via entitlement or group membership',
        })),
      identitiesAtRisk: stats.identityCount,
      tierEscalationPossible: stats.tierBreaches > 0,
      immediateContainmentSteps: [
        'Disable the compromised account immediately',
        'Revoke all active sessions and tokens',
        stats.tierBreaches > 0 ? 'Isolate Tier 0 assets from the compromised path' : 'Review and restrict entitlements',
        'Rotate credentials for all reachable service accounts',
        'Notify the SOC team and begin investigation',
      ].filter(Boolean),
    }

    return NextResponse.json(narrative)
  } catch (error) {
    console.error('Blast radius narration error:', error)
    return NextResponse.json({ error: 'Failed to generate narration' }, { status: 500 })
  }
}
