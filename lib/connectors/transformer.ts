import { db } from '@/lib/db'
import { identities } from '@/lib/db/schema/identities'
import { groups } from '@/lib/db/schema/groups'
import { eq, and } from 'drizzle-orm'
import type { RawIdentity, RawGroup, SyncResult } from './base'

// AD userAccountControl flag for disabled
const UAC_DISABLED = 0x0002

// AD lastLogon is Windows FILETIME (100ns intervals since 1601-01-01)
export function windowsFileTimeToDate(fileTime: string | number): Date | null {
  const ft = typeof fileTime === 'string' ? parseInt(fileTime) : fileTime
  if (!ft || ft <= 0) return null
  const epoch = (ft / 10000) - 11644473600000
  return new Date(epoch)
}

// Map UAC flags to status
export function uacToStatus(uac: number): string {
  if (uac & UAC_DISABLED) return 'disabled'
  return 'active'
}

// Map Okta status to our enum
export function oktaStatusMap(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'active',
    PROVISIONED: 'active',
    STAGED: 'inactive',
    SUSPENDED: 'suspended',
    DEPROVISIONED: 'disabled',
    LOCKED_OUT: 'suspended',
    PASSWORD_EXPIRED: 'active',
    RECOVERY: 'active',
  }
  return map[status] || 'active'
}

// Tier 0 group names (configurable - these are common defaults)
export const TIER_0_GROUPS = [
  'Domain Admins',
  'Enterprise Admins',
  'Schema Admins',
  'Administrators',
  'Account Operators',
  'Server Operators',
  'Print Operators',
  'Backup Operators',
  'DnsAdmins',
  'Group Policy Creator Owners',
]

export function classifyTier(groupNames: string[]): string {
  const t0 = groupNames.some(g =>
    TIER_0_GROUPS.some(t => g.toLowerCase().includes(t.toLowerCase()))
  )
  if (t0) return 'tier_0'

  const serverPatterns = ['server', 'admin', 'operator']
  const t1 = groupNames.some(g =>
    serverPatterns.some(p => g.toLowerCase().includes(p))
  )
  if (t1) return 'tier_1'

  return 'tier_2'
}

export async function syncToDatabase(
  orgId: string,
  sourceSystem: string,
  rawIdentities: RawIdentity[],
  rawGroups: RawGroup[],
): Promise<SyncResult> {
  const start = Date.now()
  const errors: string[] = []
  let identitiesUpserted = 0
  let accountsUpserted = 0
  let groupsUpserted = 0
  let entitlementsUpserted = 0

  // Upsert identities
  for (const raw of rawIdentities) {
    try {
      const existing = await db
        .select({ id: identities.id })
        .from(identities)
        .where(
          and(
            eq(identities.orgId, orgId),
            eq(identities.sourceId, raw.sourceId),
            eq(identities.sourceSystem, sourceSystem as any)
          )
        )
        .limit(1)

      const data = {
        displayName: raw.displayName,
        type: raw.type as any,
        subType: raw.subType as any,
        status: raw.status as any,
        adTier: raw.adTier as any,
        sourceSystem: sourceSystem as any,
        sourceId: raw.sourceId,
        upn: raw.upn || null,
        samAccountName: raw.samAccountName || null,
        email: raw.email || null,
        department: raw.department || null,
        lastLogonAt: raw.lastLogonAt || null,
        passwordLastSetAt: raw.passwordLastSetAt || null,
        orgId,
        updatedAt: new Date(),
      }

      if (existing.length > 0) {
        await db.update(identities).set(data).where(eq(identities.id, existing[0].id))
      } else {
        await db.insert(identities).values({ ...data, createdInSourceAt: new Date() })
      }
      identitiesUpserted++
    } catch (e: any) {
      errors.push(`Identity ${raw.displayName}: ${e.message}`)
    }
  }

  // Upsert groups
  for (const raw of rawGroups) {
    try {
      const existing = await db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.orgId, orgId), eq(groups.sourceId, raw.sourceId)))
        .limit(1)

      const data = {
        name: raw.name,
        type: raw.type as any,
        scope: (raw.scope || 'global') as any,
        adTier: raw.adTier as any,
        sourceSystem: sourceSystem as any,
        sourceId: raw.sourceId,
        memberCount: raw.members.length,
        nestedGroupCount: 0,
        isPrivileged: raw.isPrivileged,
        orgId,
      }

      if (existing.length > 0) {
        await db.update(groups).set(data).where(eq(groups.id, existing[0].id))
      } else {
        await db.insert(groups).values(data)
      }
      groupsUpserted++
    } catch (e: any) {
      errors.push(`Group ${raw.name}: ${e.message}`)
    }
  }

  return {
    identitiesUpserted,
    accountsUpserted,
    groupsUpserted,
    entitlementsUpserted,
    errors,
    duration: Date.now() - start,
  }
}
