import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { db } from '@/lib/db'
import { automationRules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { AUTOMATION_TEMPLATES, getTemplate, getTemplatesByCategory } from '@/lib/automation/templates'

/**
 * GET /api/automation-rules/templates
 *
 * Returns all available automation rule templates with their activation status.
 */
export const GET = withApiHandler(async (req: NextRequest, { orgId, log }) => {
  // Check which templates are already activated (have a matching rule)
  const existingRules = await db.select({
    name: automationRules.name,
  }).from(automationRules).where(eq(automationRules.orgId, orgId))

  const activeNames = new Set(existingRules.map(r => r.name))

  const templates = AUTOMATION_TEMPLATES.map(t => ({
    ...t,
    activated: activeNames.has(t.name),
  }))

  const byCategory = getTemplatesByCategory()
  const categorized = Object.entries(byCategory).map(([category, items]) => ({
    category,
    templates: items.map(t => ({
      ...t,
      activated: activeNames.has(t.name),
    })),
  }))

  log.info('Templates listed', { total: templates.length, activated: activeNames.size })

  return NextResponse.json({ templates, categorized })
})

/**
 * POST /api/automation-rules/templates
 *
 * Activate a template by creating an automation rule from it.
 * Body: { templateId: string }
 */
export const POST = withApiHandler(async (req: NextRequest, { orgId, session, log }) => {
  const body = await req.json()
  const { templateId } = body

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

  const template = getTemplate(templateId)
  if (!template) {
    return NextResponse.json({ error: `Template '${templateId}' not found` }, { status: 404 })
  }

  // Check if already activated
  const [existing] = await db.select({ id: automationRules.id })
    .from(automationRules)
    .where(and(
      eq(automationRules.orgId, orgId),
      eq(automationRules.name, template.name),
    ))
    .limit(1)

  if (existing) {
    return NextResponse.json({
      error: 'Template already activated',
      ruleId: existing.id,
    }, { status: 409 })
  }

  // Create the automation rule from template
  const [rule] = await db.insert(automationRules).values({
    name: template.name,
    description: template.description,
    triggerType: template.triggerType,
    triggerCondition: template.triggerCondition,
    actionType: template.actionType,
    actionParams: template.actionParams,
    notifyTargets: template.notifyTargets,
    enabled: true,
    createdBy: session.user.id,
    orgId,
  }).returning()

  log.info('Template activated', { templateId, ruleName: template.name, ruleId: rule.id })

  return NextResponse.json({ rule, templateId }, { status: 201 })
}, { requiredRole: 'iam_admin' })
