import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identityAliases, identities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hasRole } from '@/lib/utils/rbac'
import { resolveIdentities } from '@/lib/data-quality/resolver'
import { unauthorized, forbidden } from '@/lib/actions/helpers'
import type { AppRole } from '@/lib/utils/rbac'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'analyst')) return forbidden()

    const orgId = session.user.orgId

    // Return pending alias review queue joined with identity display names
    const pendingAliases = await db
      .select({
        id: identityAliases.id,
        canonicalIdentityId: identityAliases.canonicalIdentityId,
        sourceSystem: identityAliases.sourceSystem,
        sourceId: identityAliases.sourceId,
        sourceDisplayName: identityAliases.sourceDisplayName,
        sourceEmail: identityAliases.sourceEmail,
        sourceUpn: identityAliases.sourceUpn,
        matchConfidence: identityAliases.matchConfidence,
        matchMethod: identityAliases.matchMethod,
        matchedFields: identityAliases.matchedFields,
        status: identityAliases.status,
        createdAt: identityAliases.createdAt,
        canonicalDisplayName: identities.displayName,
        canonicalEmail: identities.email,
        canonicalUpn: identities.upn,
        canonicalSourceSystem: identities.sourceSystem,
      })
      .from(identityAliases)
      .innerJoin(identities, eq(identityAliases.canonicalIdentityId, identities.id))
      .where(and(
        eq(identityAliases.orgId, orgId),
        eq(identityAliases.status, 'pending_review'),
      ))
      .orderBy(identityAliases.createdAt)

    return NextResponse.json({ aliases: pendingAliases })
  } catch (err: any) {
    console.error('[Data Quality] Resolve GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch aliases', details: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const orgId = session.user.orgId
    const body = await req.json().catch(() => ({}))
    const { aliasId, status } = body

    if (!aliasId || !['confirmed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'aliasId and status (confirmed|rejected) required' }, { status: 400 })
    }

    // Verify alias belongs to this org
    const [alias] = await db
      .select()
      .from(identityAliases)
      .where(and(eq(identityAliases.id, aliasId), eq(identityAliases.orgId, orgId)))
      .limit(1)

    if (!alias) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 })
    }

    await db
      .update(identityAliases)
      .set({
        status,
        reviewedBy: (session.user as any).identityId || null,
        reviewedAt: new Date(),
      })
      .where(eq(identityAliases.id, aliasId))

    return NextResponse.json({ success: true, aliasId, status })
  } catch (err: any) {
    console.error('[Data Quality] Resolve PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update alias', details: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.orgId) return unauthorized()
    if (!hasRole((session.user as any).appRole as AppRole, 'iam_admin')) return forbidden()

    const orgId = session.user.orgId
    const body = await req.json().catch(() => ({}))
    const { skipAI } = body

    const report = await resolveIdentities(orgId, { skipAI: !!skipAI })

    return NextResponse.json(report)
  } catch (err: any) {
    console.error('[Data Quality] Resolve POST error:', err)
    return NextResponse.json({ error: 'Resolution failed', details: err.message }, { status: 500 })
  }
}
