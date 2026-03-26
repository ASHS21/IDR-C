import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { identities } from '@/lib/db/schema'
import { and, eq, gte, lte, ilike, or, desc, asc, count, sql, SQL } from 'drizzle-orm'
import { identityFilterSchema } from '@/lib/schemas/identity'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.orgId
  const params = Object.fromEntries(req.nextUrl.searchParams)

  const parsed = identityFilterSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  const filters = parsed.data
  const conditions: SQL[] = [eq(identities.orgId, orgId)]

  if (filters.type) conditions.push(eq(identities.type, filters.type))
  if (filters.subType) conditions.push(eq(identities.subType, filters.subType))
  if (filters.adTier) conditions.push(eq(identities.adTier, filters.adTier))
  if (filters.status) conditions.push(eq(identities.status, filters.status))
  if (filters.sourceSystem) conditions.push(eq(identities.sourceSystem, filters.sourceSystem))
  if (filters.riskScoreMin !== undefined) conditions.push(gte(identities.riskScore, filters.riskScoreMin))
  if (filters.riskScoreMax !== undefined) conditions.push(lte(identities.riskScore, filters.riskScoreMax))
  if (filters.tierViolation !== undefined) conditions.push(eq(identities.tierViolation, filters.tierViolation))

  if (filters.search) {
    const search = `%${filters.search}%`
    conditions.push(
      or(
        ilike(identities.displayName, search),
        ilike(identities.upn, search),
        ilike(identities.email, search),
        ilike(identities.samAccountName, search),
      )!
    )
  }

  const where = and(...conditions)

  // Sort
  const sortColumn = filters.sortBy && filters.sortBy in identities
    ? (identities as any)[filters.sortBy]
    : identities.riskScore
  const orderFn = filters.sortOrder === 'asc' ? asc : desc

  const offset = (filters.page - 1) * filters.pageSize

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(identities)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(filters.pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(identities)
      .where(where),
  ])

  return NextResponse.json({
    data,
    total: totalResult[0]?.total ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  })
}
