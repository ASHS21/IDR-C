import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { SMART_CSV_PARSER_PROMPT } from '@/lib/ai/prompts'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b'

// Target fields for Identity Radar ontology
const TARGET_FIELDS = [
  'displayName', 'type', 'subType', 'upn', 'samAccountName', 'email',
  'department', 'status', 'adTier', 'sourceId', 'lastLogonAt',
  'passwordLastSetAt', 'createdInSourceAt', 'managerDn', 'memberOf',
] as const

type TargetField = typeof TARGET_FIELDS[number]

interface DetectionResult {
  mapping: Record<string, string>
  formatDetection: {
    dateFormat: string
    csvType: string
  }
  confidence: Record<string, number>
  unmapped: string[]
}

// Fuzzy match rules for deterministic fallback
const FUZZY_RULES: { patterns: string[]; target: TargetField }[] = [
  { patterns: ['displayname', 'display_name', 'fullname', 'full_name', 'name', 'cn'], target: 'displayName' },
  { patterns: ['mail', 'email', 'emailaddress', 'email_address', 'useremail'], target: 'email' },
  { patterns: ['upn', 'userprincipalname', 'user_principal_name', 'principal'], target: 'upn' },
  { patterns: ['samaccountname', 'sam_account_name', 'sam', 'logonname', 'logon_name', 'sam_account'], target: 'samAccountName' },
  { patterns: ['department', 'dept'], target: 'department' },
  { patterns: ['lastlogon', 'lastlogontimestamp', 'last_logon', 'lastlogondate', 'last_logon_at', 'lastsignin'], target: 'lastLogonAt' },
  { patterns: ['whencreated', 'createdate', 'created', 'createddatetime', 'created_at', 'creation_date', 'createdon'], target: 'createdInSourceAt' },
  { patterns: ['memberof', 'member_of', 'groups'], target: 'memberOf' },
  { patterns: ['manager', 'managedby', 'managed_by', 'managerdn', 'manager_dn'], target: 'managerDn' },
  { patterns: ['passwordlastset', 'pwd_last_set', 'pwdlastset', 'password_last_set', 'passwordlastsetat'], target: 'passwordLastSetAt' },
  { patterns: ['status', 'enabled', 'disabled', 'accountstatus', 'account_status', 'useraccountcontrol', 'account_control'], target: 'status' },
  { patterns: ['objectguid', 'objectsid', 'externalid', 'external_id', 'sourceid', 'source_id', 'id', 'objectid'], target: 'sourceId' },
  { patterns: ['type', 'identitytype', 'identity_type', 'accounttype', 'account_type'], target: 'type' },
  { patterns: ['subtype', 'sub_type', 'identity_sub_type'], target: 'subType' },
  { patterns: ['adtier', 'ad_tier', 'tier'], target: 'adTier' },
]

function fuzzyMatch(headers: string[], sampleRows: string[][]): DetectionResult {
  const mapping: Record<string, string> = {}
  const confidence: Record<string, number> = {}
  const usedTargets = new Set<string>()

  for (const header of headers) {
    const lower = header.toLowerCase().replace(/[\s\-_]+/g, '')

    for (const rule of FUZZY_RULES) {
      if (usedTargets.has(rule.target)) continue

      const match = rule.patterns.some(p => {
        const normalized = p.replace(/[\s\-_]+/g, '')
        return lower === normalized || lower.includes(normalized) || normalized.includes(lower)
      })

      if (match) {
        mapping[header] = rule.target
        confidence[header] = lower === rule.patterns[0].replace(/[\s\-_]+/g, '') ? 95 : 75
        usedTargets.add(rule.target)
        break
      }
    }
  }

  // Detect date format from sample data
  let dateFormat = 'iso8601'
  const allValues = sampleRows.flat()
  if (allValues.some(v => /^\d{17,18}$/.test(v))) {
    dateFormat = 'ad_filetime'
  } else if (allValues.some(v => /^\d{1,2}\/\d{1,2}\/\d{4}/.test(v))) {
    dateFormat = 'us_date'
  } else if (allValues.some(v => /^\d{10,13}$/.test(v))) {
    dateFormat = 'epoch'
  }

  // Detect CSV type
  let csvType = 'generic'
  const headerStr = headers.join(',').toLowerCase()
  if (headerStr.includes('samaccountname') || headerStr.includes('useraccountcontrol') || headerStr.includes('distinguishedname')) {
    csvType = 'ad_powershell'
  } else if (headerStr.includes('userprincipalname') && headerStr.includes('assignedlicenses')) {
    csvType = 'azure_ad'
  } else if (headerStr.includes('sailpoint') || headerStr.includes('identitynow')) {
    csvType = 'sailpoint'
  } else if (headerStr.includes('okta') || headerStr.includes('oktaid')) {
    csvType = 'okta'
  }

  const unmapped = headers.filter(h => !mapping[h])

  return { mapping, formatDetection: { dateFormat, csvType }, confidence, unmapped }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body?.headers || !Array.isArray(body.headers) || !body.sampleRows) {
      return NextResponse.json({ error: 'headers and sampleRows are required' }, { status: 400 })
    }

    const { headers, sampleRows } = body as { headers: string[]; sampleRows: string[][] }

    // Build prompt for AI
    const sampleStr = sampleRows.map((row: string[], i: number) =>
      `Row ${i + 1}: ${headers.map((h: string, j: number) => `${h}="${row[j] || ''}"`).join(', ')}`
    ).join('\n')

    const userPrompt = `Headers: ${headers.join(', ')}\n\nSample data:\n${sampleStr}`

    // Try providers: Ollama -> Anthropic -> fuzzy fallback
    let result: DetectionResult | null = null

    // 1. Try Ollama
    result = await callOllamaDetect(userPrompt)

    // 2. Try Anthropic
    if (!result && process.env.ANTHROPIC_API_KEY) {
      result = await callAnthropicDetect(userPrompt)
    }

    // 3. Deterministic fallback
    if (!result) {
      result = fuzzyMatch(headers, sampleRows)
    } else {
      // Add unmapped list from AI result
      result.unmapped = headers.filter(h => !result!.mapping[h])
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[CSV-Detect] Error:', err)
    return NextResponse.json({ error: 'Detection failed', details: err.message }, { status: 500 })
  }
}

async function callOllamaDetect(prompt: string): Promise<DetectionResult | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SMART_CSV_PARSER_PROMPT },
          { role: 'user', content: prompt },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) return null

    const result = await response.json()
    const text = result.message?.content || ''
    return parseDetectionResponse(text)
  } catch {
    return null
  }
}

async function callAnthropicDetect(prompt: string): Promise<DetectionResult | null> {
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
        max_tokens: 1024,
        system: SMART_CSV_PARSER_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return null

    const result = await response.json()
    const text = result.content?.[0]?.text || ''
    return parseDetectionResponse(text)
  } catch {
    return null
  }
}

function parseDetectionResponse(text: string): DetectionResult | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed.mapping && typeof parsed.mapping === 'object') {
      return {
        mapping: parsed.mapping,
        formatDetection: parsed.formatDetection || { dateFormat: 'iso8601', csvType: 'generic' },
        confidence: parsed.confidence || {},
        unmapped: [],
      }
    }
    return null
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.mapping) {
          return {
            mapping: parsed.mapping,
            formatDetection: parsed.formatDetection || { dateFormat: 'iso8601', csvType: 'generic' },
            confidence: parsed.confidence || {},
            unmapped: [],
          }
        }
      } catch { /* ignore */ }
    }
    return null
  }
}
