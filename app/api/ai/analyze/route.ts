import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { remediationPlans } from '@/lib/db/schema'
import { hasRole } from '@/lib/utils/rbac'
import { buildAIContext } from '@/lib/ai/context-builder'
import { SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { logAction, unauthorized, forbidden } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const orgId = session.user.orgId
    const body = await req.json().catch(() => ({}))
    const { timelineDays, riskAppetite = 'moderate' } = body

    // Build context from database
    let context: any
    try {
      context = await buildAIContext(orgId)
    } catch (dbErr: any) {
      console.error('[AI] Context build failed:', dbErr)
      return NextResponse.json({ error: 'Failed to build AI context', details: dbErr.message }, { status: 500 })
    }

    // Build compact prompt (small models need concise input)
    const s = context.summary
    const topNames = context.topRiskyIdentities.map((i: any) => `${i.name}(risk:${i.risk},tier:${i.tier}${i.tierViolation ? ',VIOLATION' : ''})`).join(', ')
    const violStr = Object.entries(context.openViolations).map(([k, v]) => `${k}:${v}`).join(', ')

    const userPrompt = `Analyze IAM posture. ${Number(s.identityCounts.human) + Number(s.identityCounts.non_human)} identities (${s.identityCounts.human} human, ${s.identityCounts.non_human} NHI). Tiers: T0=${s.tierDistribution.tier_0 || 0}, T1=${s.tierDistribution.tier_1 || 0}, T2=${s.tierDistribution.tier_2 || 0}. ${s.orphanedNhiCount} orphaned NHIs. MFA: ${s.mfaCoverage.withMfa}/${s.mfaCoverage.total}. Open violations: ${violStr}. Top risky: ${topNames}. Timeline: ${timelineDays || 30} days. Risk appetite: ${riskAppetite}. Give 5 prioritized actions. Respond JSON only.`

    // Try providers in order: Ollama → Anthropic → Fallback
    let plan: any = null
    let provider = 'fallback'

    // 1. Try Ollama (local)
    console.log(`[AI] Trying Ollama at ${OLLAMA_URL} with model ${OLLAMA_MODEL}...`)
    plan = await callOllama(userPrompt)
    if (plan) {
      provider = 'ollama'
      console.log('[AI] Ollama succeeded')
    } else {
      console.log('[AI] Ollama failed or returned unparseable response')
    }

    // 2. Try Anthropic if Ollama failed
    if (!plan && process.env.ANTHROPIC_API_KEY) {
      console.log('[AI] Trying Anthropic...')
      plan = await callAnthropic(userPrompt)
      if (plan) provider = 'anthropic'
    }

    // 3. Deterministic fallback
    if (!plan) {
      console.log('[AI] Using deterministic fallback')
      plan = generateFallbackPlan(context)
      provider = 'fallback'
    }

    // Save to database
    const [saved] = await db.insert(remediationPlans).values({
      generatedBy: 'ai',
      inputParams: { timelineDays, riskAppetite, provider },
      rankedActions: plan.rankedActions || [],
      executiveSummary: plan.executiveSummary || '',
      projectedRiskReduction: plan.projectedRiskReduction || 0,
      quickWins: plan.quickWins || [],
      status: 'draft',
      orgId,
    }).returning()

    await logAction({
      actionType: 'generate_recommendation',
      actorIdentityId: session.user.id,
      orgId,
      rationale: `AI analysis generated via ${provider}`,
      payload: { planId: saved.id, provider },
    })

    return NextResponse.json({ planId: saved.id, provider, ...plan })
  } catch (err: any) {
    console.error('[AI] Unhandled error:', err)
    return NextResponse.json({ error: 'AI analysis failed', details: err.message }, { status: 500 })
  }
}

// ── Ollama (local LLM) ──
async function callOllama(prompt: string): Promise<any | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3,
          num_predict: 1024,
        },
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    })

    if (!response.ok) return null

    const result = await response.json()
    const text = result.message?.content || ''
    return parseAIResponse(text)
  } catch {
    return null
  }
}

// ── Anthropic (cloud) ──
async function callAnthropic(prompt: string): Promise<any | null> {
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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    })

    if (!response.ok) return null

    const result = await response.json()
    const text = result.content?.[0]?.text || ''
    return parseAIResponse(text)
  } catch {
    return null
  }
}

// ── Parse AI JSON response ──
function parseAIResponse(text: string): any | null {
  try {
    // Try direct parse
    const parsed = JSON.parse(text)
    if (parsed.rankedActions || parsed.executiveSummary) return parsed
    return null
  } catch {
    // Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.rankedActions || parsed.executiveSummary) return parsed
      } catch { /* ignore */ }
    }
    return null
  }
}

// ── Deterministic fallback ──
function generateFallbackPlan(context: any) {
  const tierViolations = context.topRiskyIdentities.filter((i: any) => i.tierViolation)
  const actions = []
  let priority = 1

  for (const identity of tierViolations.slice(0, 5)) {
    actions.push({
      priority: priority++,
      actionType: 'revoke_access',
      targetIdentityId: identity.id,
      description: `Revoke cross-tier access for ${identity.displayName}`,
      justification: `${identity.adTier} identity accessing ${identity.effectiveTier} resources`,
      effort: 'medium',
      impact: 'high',
      estimatedRiskReduction: 5,
    })
  }

  if (context.summary.orphanedNhiCount > 0) {
    actions.push({
      priority: priority++,
      actionType: 'assign_owner',
      description: `Assign owners to ${context.summary.orphanedNhiCount} orphaned NHIs`,
      justification: 'Orphaned non-human identities lack accountability',
      effort: 'low',
      impact: 'high',
      estimatedRiskReduction: 8,
    })
  }

  const mfa = context.summary.mfaCoverage
  if (mfa.total > mfa.withMfa) {
    actions.push({
      priority: priority++,
      actionType: 'enable_mfa',
      description: `Enable MFA for ${mfa.total - mfa.withMfa} accounts`,
      justification: 'Missing MFA is a critical security gap',
      effort: 'low',
      impact: 'high',
      estimatedRiskReduction: 10,
    })
  }

  const quickWins = actions.filter(a => a.effort === 'low' && a.impact === 'high')
  const totalReduction = Math.min(100, actions.reduce((sum, a) => sum + a.estimatedRiskReduction, 0))

  return {
    executiveSummary: `Analysis identified ${tierViolations.length} tier violations and ${context.summary.orphanedNhiCount} orphaned NHIs requiring immediate attention. Recommended actions could reduce overall risk posture by an estimated ${totalReduction}%.`,
    rankedActions: actions,
    quickWins,
    projectedRiskReduction: totalReduction,
  }
}
