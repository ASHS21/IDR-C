import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { getIssueDetail, setIssueStatus } from '@/lib/issues/aggregate'
import { z } from 'zod'

/** GET /api/issues/[fsid] — issue detail: metadata, mitigation, affected objects, timeline. */
export const GET = withApiHandler(async (_req: NextRequest, { orgId, params }) => {
  const fsid = params?.fsid as string
  const detail = await getIssueDetail(orgId, fsid)
  if (!detail) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  return NextResponse.json(detail)
})

const patchSchema = z.object({
  status: z.enum(['no_action', 'in_progress', 'done', 'accepted_risk']),
  notes: z.string().max(2000).optional(),
})

/** PATCH /api/issues/[fsid] — update operator status / notes. */
export const PATCH = withApiHandler(async (req: NextRequest, { orgId, params, log }) => {
  const fsid = params?.fsid as string
  const body = patchSchema.parse(await req.json())
  await setIssueStatus(orgId, fsid, body.status, body.notes)
  log.info('Issue status updated', { fsid, status: body.status })
  return NextResponse.json({ ok: true })
}, { requiredRole: 'analyst' })
