import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identityThreats, identities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { unauthorized, forbidden } from '@/lib/actions/helpers'
import { THREAT_TRIAGE_PROMPT } from '@/lib/ai/prompts'
import type { AppRole } from '@/lib/utils/rbac'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const orgId = session.user.orgId
    const { id } = params

    // Load threat + identity
    const [threat] = await db
      .select()
      .from(identityThreats)
      .where(and(eq(identityThreats.id, id), eq(identityThreats.orgId, orgId)))
      .limit(1)

    if (!threat) {
      return NextResponse.json({ error: 'Threat not found' }, { status: 404 })
    }

    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.id, threat.identityId))
      .limit(1)

    // Build triage prompt
    const context = `Threat: ${threat.threatType} (${threat.severity})
Kill Chain Phase: ${threat.killChainPhase}
MITRE ATT&CK: ${threat.mitreTechniqueIds?.join(', ') || 'N/A'}
Confidence: ${threat.confidence}%
Identity: ${identity?.displayName || 'Unknown'} (Type: ${identity?.subType}, Tier: ${identity?.adTier}, Risk: ${identity?.riskScore})
Source IP: ${threat.sourceIp || 'N/A'}
Source Location: ${threat.sourceLocation || 'N/A'}
Target Resource: ${threat.targetResource || 'N/A'}
Evidence: ${JSON.stringify(threat.evidence)}
First Seen: ${threat.firstSeenAt}
Last Seen: ${threat.lastSeenAt}`

    // Try providers: Ollama -> Anthropic -> Fallback
    let triage: any = null
    let provider = 'fallback'

    // 1. Ollama
    triage = await callOllama(context)
    if (triage) {
      provider = 'ollama'
    }

    // 2. Anthropic
    if (!triage && process.env.ANTHROPIC_API_KEY) {
      triage = await callAnthropic(context)
      if (triage) provider = 'anthropic'
    }

    // 3. Fallback
    if (!triage) {
      triage = generateFallbackTriage(threat, identity)
      provider = 'fallback'
    }

    // Save narrative to threat
    await db
      .update(identityThreats)
      .set({ aiNarrative: triage.narrative || triage.assessment })
      .where(eq(identityThreats.id, id))

    return NextResponse.json({ ...triage, provider })
  } catch (err: any) {
    console.error('[Threat Triage] Error:', err)
    return NextResponse.json({ error: 'Triage failed', details: err.message }, { status: 500 })
  }
}

async function callOllama(context: string): Promise<any | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: THREAT_TRIAGE_PROMPT },
          { role: 'user', content: context },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3, num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(120000),
    })
    if (!response.ok) return null
    const result = await response.json()
    return parseTriageResponse(result.message?.content || '')
  } catch {
    return null
  }
}

async function callAnthropic(context: string): Promise<any | null> {
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
        system: THREAT_TRIAGE_PROMPT,
        messages: [{ role: 'user', content: context }],
      }),
    })
    if (!response.ok) return null
    const result = await response.json()
    return parseTriageResponse(result.content?.[0]?.text || '')
  } catch {
    return null
  }
}

function parseTriageResponse(text: string): any | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed.assessment || parsed.narrative) return parsed
    return null
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.assessment || parsed.narrative) return parsed
      } catch { /* ignore */ }
    }
    return null
  }
}

function generateFallbackTriage(threat: any, identity: any): any {
  const severityMap: Record<string, string> = {
    critical: 'IMMEDIATE ACTION REQUIRED',
    high: 'Urgent investigation recommended',
    medium: 'Investigation recommended within 24 hours',
    low: 'Review during next security assessment',
  }

  const recommendations: string[] = []

  if (threat.threatType === 'password_spray' || threat.threatType === 'credential_stuffing') {
    recommendations.push('Reset passwords for targeted accounts')
    recommendations.push('Enforce MFA for affected identities')
    recommendations.push('Block source IP at firewall level')
  } else if (threat.threatType === 'mfa_fatigue') {
    recommendations.push('Contact user to verify MFA push requests')
    recommendations.push('Temporarily disable push MFA and switch to FIDO2/hardware token')
    recommendations.push('Review account for signs of compromise')
  } else if (threat.threatType === 'privilege_escalation') {
    recommendations.push('Immediately remove unauthorized group membership')
    recommendations.push('Review all recent changes by this identity')
    recommendations.push('Check for persistence mechanisms')
  } else if (threat.threatType === 'dcsync') {
    recommendations.push('CRITICAL: Isolate the source system immediately')
    recommendations.push('Reset KRBTGT password (twice, with 12-hour gap)')
    recommendations.push('Full AD security assessment required')
  } else if (threat.threatType === 'golden_ticket') {
    recommendations.push('Reset KRBTGT password twice')
    recommendations.push('Investigate all Tier 0 accounts for compromise')
    recommendations.push('Full incident response engagement recommended')
  } else {
    recommendations.push('Investigate source IP and activity patterns')
    recommendations.push('Review identity access history')
    recommendations.push('Consider temporary access restriction')
  }

  return {
    assessment: severityMap[threat.severity] || 'Review required',
    narrative: `Detected ${threat.threatType} activity involving identity "${identity?.displayName || 'Unknown'}" with ${threat.confidence}% confidence. This maps to MITRE ATT&CK technique(s) ${threat.mitreTechniqueIds?.join(', ') || 'N/A'} in the ${threat.killChainPhase} phase. ${recommendations[0]}.`,
    riskLevel: threat.severity,
    recommendations,
    containmentSteps: [
      'Disable affected account temporarily',
      'Block source IP if identified',
      'Preserve logs for forensic analysis',
    ],
    investigationSteps: [
      'Correlate with other security events in the same timeframe',
      'Check for similar patterns across other identities',
      'Review network logs for additional indicators',
    ],
  }
}
