import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { attackPaths } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { ATTACK_PATH_NARRATION_PROMPT } from '@/lib/ai/prompts'
import { unauthorized, forbidden } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const { id } = await params
    const orgId = session.user.orgId

    const [path] = await db
      .select()
      .from(attackPaths)
      .where(and(eq(attackPaths.id, id), eq(attackPaths.orgId, orgId)))

    if (!path) {
      return NextResponse.json({ error: 'Attack path not found' }, { status: 404 })
    }

    const prompt = `Analyze this attack path:\n${JSON.stringify({
      pathNodes: path.pathNodes,
      pathEdges: path.pathEdges,
      pathLength: path.pathLength,
      riskScore: path.riskScore,
      attackTechnique: path.attackTechnique,
      mitreId: path.mitreId,
    }, null, 2)}`

    let narrative: any = null
    let provider = 'fallback'

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
          stream: false,
          format: 'json',
          options: { temperature: 0.3, num_predict: 2048 },
        }),
        signal: AbortSignal.timeout(120000),
      })
      if (response.ok) {
        const result = await response.json()
        const text = result.message?.content || ''
        try { narrative = JSON.parse(text); provider = 'ollama' } catch { /* */ }
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
          try { narrative = JSON.parse(text); provider = 'anthropic' } catch {
            // Try extracting JSON from code block
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (match) try { narrative = JSON.parse(match[1]); provider = 'anthropic' } catch { /* */ }
          }
        }
      } catch { /* fallthrough */ }
    }

    // Fallback
    if (!narrative) {
      narrative = {
        narrative: `This attack path shows a ${path.pathLength}-hop chain from a non-Tier 0 identity to a Tier 0 target using ${path.attackTechnique}. Risk score: ${path.riskScore}/100.`,
        riskAssessment: path.riskScore >= 80 ? 'Critical' : path.riskScore >= 60 ? 'High' : 'Medium',
        mitreMapping: path.mitreId ? [{ id: path.mitreId, name: path.attackTechnique, stage: 'privilege_escalation' }] : [],
        remediationOptions: [{ action: 'Review and revoke the most dangerous permission in this chain', breaksPathAtHop: 1, effort: 'medium', sideEffects: 'May impact dependent services' }],
        exploitability: path.pathLength <= 2 ? 'trivial' : path.pathLength <= 4 ? 'moderate' : 'advanced',
      }
      provider = 'fallback'
    }

    // Save narrative to DB
    await db
      .update(attackPaths)
      .set({ aiNarrative: typeof narrative.narrative === 'string' ? narrative.narrative : JSON.stringify(narrative) })
      .where(eq(attackPaths.id, id))

    return NextResponse.json({ ...narrative, provider })
  } catch (error) {
    console.error('[AttackPaths] Narrate error:', error)
    return NextResponse.json({ error: 'Narration failed' }, { status: 500 })
  }
}
