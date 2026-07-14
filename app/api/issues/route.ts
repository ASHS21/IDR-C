import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/handler'
import { getIssues } from '@/lib/issues/aggregate'

/** GET /api/issues — managed issue list (one per finding type) with status + exposure points. */
export const GET = withApiHandler(async (_req: NextRequest, { orgId, log }) => {
  const issues = await getIssues(orgId)
  log.info('Issues listed', { count: issues.length })
  return NextResponse.json({ issues, assessedAt: new Date().toISOString() })
})
