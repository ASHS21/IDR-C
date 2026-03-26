import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../lib/db/schema'
import bcrypt from 'bcryptjs'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/identity_radar'
const client = postgres(DATABASE_URL)
const db = drizzle(client, { schema })

// --- Helpers ---
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function randomDate(startDaysAgo: number, endDaysAgo: number): Date {
  return daysAgo(randomInt(endDaysAgo, startDaysAgo))
}

// --- Name generators ---
const ARABIC_FIRST_NAMES = [
  'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Khalid', 'Fahad', 'Sultan', 'Abdulaziz',
  'Nasser', 'Ibrahim', 'Youssef', 'Hassan', 'Tariq', 'Saad', 'Hamad', 'Faisal',
  'Majed', 'Saud', 'Bandar', 'Abdullah', 'Fatima', 'Noura', 'Sara', 'Maha',
  'Reem', 'Huda', 'Layla', 'Amira', 'Dalal', 'Nada',
]
const ARABIC_LAST_NAMES = [
  'Al-Rashidi', 'Al-Harbi', 'Al-Otaibi', 'Al-Shammari', 'Al-Qahtani',
  'Al-Dosari', 'Al-Mutairi', 'Al-Zahrani', 'Al-Ghamdi', 'Al-Shahrani',
  'Al-Subaie', 'Al-Juhani', 'Al-Anazi', 'Al-Yami', 'Al-Malki',
]
const DEPARTMENTS = [
  'Information Technology', 'Security Operations', 'Finance', 'Human Resources',
  'Legal', 'Engineering', 'Operations', 'Executive', 'Compliance', 'Audit',
]

function randomName(): string {
  return `${randomItem(ARABIC_FIRST_NAMES)} ${randomItem(ARABIC_LAST_NAMES)}`
}

// --- Service account name generators ---
const SVC_PREFIXES = ['svc', 'app', 'bot', 'api', 'sys', 'msi']
const SVC_SYSTEMS = [
  'erp', 'crm', 'hrms', 'ldap', 'backup', 'monitoring', 'scanner',
  'deploy', 'jenkins', 'terraform', 'grafana', 'splunk', 'vault',
  'exchange', 'sharepoint', 'teams', 'intune', 'sccm', 'wsus',
]

function randomSvcName(): string {
  return `${randomItem(SVC_PREFIXES)}-${randomItem(SVC_SYSTEMS)}-${randomInt(1, 99).toString().padStart(2, '0')}`
}

// --- Main seed ---
async function seed() {
  console.log('Seeding database...')

  // 1. Organization
  const [org] = await db.insert(schema.organizations).values({
    name: 'Acme Financial Services',
    domain: 'acmefs.sa',
    industry: 'Financial Services',
    regulatoryFrameworks: ['NCA_ECC', 'SAMA_CSF', 'PDPL'],
    adForestName: 'acmefs.local',
    tenantId: 'acmefs-tenant-001',
  }).returning()
  console.log(`Created org: ${org.id}`)

  // 2. Admin user for NextAuth
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await db.insert(schema.users).values({
    name: 'Admin User',
    email: 'admin@acmefs.sa',
    hashedPassword,
    appRole: 'admin',
    orgId: org.id,
  })
  console.log('Created admin user: admin@acmefs.sa / admin123')

  // 3. Identities (200 total: 140 human + 60 NHI)
  const identityValues: (typeof schema.identities.$inferInsert)[] = []

  // 100 employees
  for (let i = 0; i < 100; i++) {
    const name = randomName()
    const firstName = name.split(' ')[0].toLowerCase()
    const lastName = name.split(' ')[1]?.toLowerCase().replace('al-', '') || 'user'
    const dormant = i < 10 // first 10 are dormant
    identityValues.push({
      displayName: name,
      type: 'human',
      subType: 'employee',
      status: dormant ? 'dormant' : 'active',
      adTier: i < 5 ? 'tier_0' : i < 20 ? 'tier_1' : 'tier_2',
      riskScore: dormant ? randomInt(40, 70) : randomInt(0, 50),
      sourceSystem: 'active_directory',
      sourceId: `EMP-${(i + 1).toString().padStart(4, '0')}`,
      upn: `${firstName}.${lastName}@acmefs.sa`,
      samAccountName: `${firstName}.${lastName}`,
      email: `${firstName}.${lastName}@acmefs.sa`,
      department: randomItem(DEPARTMENTS),
      lastLogonAt: dormant ? daysAgo(randomInt(91, 365)) : daysAgo(randomInt(0, 30)),
      passwordLastSetAt: daysAgo(randomInt(1, 180)),
      createdInSourceAt: daysAgo(randomInt(100, 1000)),
      orgId: org.id,
    })
  }

  // 20 contractors
  for (let i = 0; i < 20; i++) {
    const name = randomName()
    const firstName = name.split(' ')[0].toLowerCase()
    identityValues.push({
      displayName: name,
      type: 'human',
      subType: 'contractor',
      status: i < 3 ? 'inactive' : 'active',
      adTier: 'tier_2',
      riskScore: randomInt(10, 40),
      sourceSystem: 'azure_ad',
      sourceId: `CTR-${(i + 1).toString().padStart(4, '0')}`,
      upn: `${firstName}.contractor@acmefs.sa`,
      samAccountName: `c.${firstName}`,
      email: `${firstName}@contractor-firm.com`,
      department: randomItem(['Engineering', 'Operations', 'Information Technology']),
      lastLogonAt: daysAgo(randomInt(0, 60)),
      createdInSourceAt: daysAgo(randomInt(30, 365)),
      orgId: org.id,
    })
  }

  // 20 vendors
  for (let i = 0; i < 20; i++) {
    const name = randomName()
    identityValues.push({
      displayName: name,
      type: 'human',
      subType: 'vendor',
      status: i < 2 ? 'suspended' : 'active',
      adTier: 'tier_2',
      riskScore: randomInt(5, 30),
      sourceSystem: 'okta',
      sourceId: `VND-${(i + 1).toString().padStart(4, '0')}`,
      upn: `vendor${i + 1}@partner.com`,
      email: `vendor${i + 1}@partner.com`,
      lastLogonAt: daysAgo(randomInt(0, 90)),
      createdInSourceAt: daysAgo(randomInt(60, 500)),
      orgId: org.id,
    })
  }

  // 25 service accounts
  for (let i = 0; i < 25; i++) {
    const svcName = randomSvcName()
    const orphaned = i < 5
    identityValues.push({
      displayName: svcName,
      type: 'non_human',
      subType: 'service_account',
      status: orphaned ? 'orphaned' : 'active',
      adTier: i < 3 ? 'tier_0' : i < 10 ? 'tier_1' : 'tier_2',
      riskScore: orphaned ? randomInt(60, 90) : randomInt(10, 50),
      sourceSystem: 'active_directory',
      sourceId: `SVC-${(i + 1).toString().padStart(4, '0')}`,
      samAccountName: svcName,
      lastLogonAt: daysAgo(randomInt(0, 60)),
      createdInSourceAt: daysAgo(randomInt(100, 800)),
      expiryAt: i < 8 ? daysAgo(-randomInt(30, 365)) : daysAgo(randomInt(-365, -1)),
      orgId: org.id,
    })
  }

  // 15 managed identities
  for (let i = 0; i < 15; i++) {
    identityValues.push({
      displayName: `msi-${randomItem(SVC_SYSTEMS)}-${randomInt(1, 20)}`,
      type: 'non_human',
      subType: 'managed_identity',
      status: 'active',
      adTier: i < 2 ? 'tier_0' : 'tier_1',
      riskScore: randomInt(5, 35),
      sourceSystem: 'azure_ad',
      sourceId: `MSI-${(i + 1).toString().padStart(4, '0')}`,
      lastLogonAt: daysAgo(randomInt(0, 14)),
      createdInSourceAt: daysAgo(randomInt(30, 400)),
      orgId: org.id,
    })
  }

  // 10 app registrations
  for (let i = 0; i < 10; i++) {
    identityValues.push({
      displayName: `app-${randomItem(SVC_SYSTEMS)}-${randomItem(['prod', 'dev', 'staging'])}`,
      type: 'non_human',
      subType: 'app_registration',
      status: 'active',
      adTier: 'tier_1',
      riskScore: randomInt(10, 40),
      sourceSystem: 'azure_ad',
      sourceId: `APP-${(i + 1).toString().padStart(4, '0')}`,
      lastLogonAt: daysAgo(randomInt(0, 30)),
      createdInSourceAt: daysAgo(randomInt(60, 600)),
      expiryAt: daysAgo(-randomInt(30, 365)),
      orgId: org.id,
    })
  }

  // 5 API keys, 3 bots, 2 machines
  const nhiBatch: typeof identityValues = []
  for (let i = 0; i < 5; i++) {
    nhiBatch.push({
      displayName: `apikey-${randomItem(SVC_SYSTEMS)}-${i + 1}`,
      type: 'non_human', subType: 'api_key', status: 'active',
      adTier: 'tier_2', riskScore: randomInt(5, 25),
      sourceSystem: 'manual', sourceId: `KEY-${i + 1}`,
      createdInSourceAt: daysAgo(randomInt(30, 300)),
      expiryAt: daysAgo(-randomInt(10, 180)),
      orgId: org.id,
    })
  }
  for (let i = 0; i < 3; i++) {
    nhiBatch.push({
      displayName: `bot-${randomItem(['helpdesk', 'alerts', 'scheduler'])}-${i + 1}`,
      type: 'non_human', subType: 'bot', status: 'active',
      adTier: 'tier_2', riskScore: randomInt(5, 20),
      sourceSystem: 'azure_ad', sourceId: `BOT-${i + 1}`,
      lastLogonAt: daysAgo(randomInt(0, 7)),
      createdInSourceAt: daysAgo(randomInt(60, 400)),
      orgId: org.id,
    })
  }
  for (let i = 0; i < 2; i++) {
    nhiBatch.push({
      displayName: `machine-dc${i + 1}.acmefs.local`,
      type: 'non_human', subType: 'machine', status: 'active',
      adTier: 'tier_0', riskScore: randomInt(15, 40),
      sourceSystem: 'active_directory', sourceId: `MCH-${i + 1}`,
      lastLogonAt: daysAgo(0),
      createdInSourceAt: daysAgo(randomInt(500, 1500)),
      orgId: org.id,
    })
  }
  identityValues.push(...nhiBatch)

  // Insert all identities
  const allIdentities = await db.insert(schema.identities).values(identityValues).returning()
  console.log(`Created ${allIdentities.length} identities`)

  // Set owner for NHIs (first 5 orphaned have no owner, rest get random human owners)
  const humanIds = allIdentities.filter(i => i.type === 'human').map(i => i.id)
  const nhiIds = allIdentities.filter(i => i.type === 'non_human')
  for (const nhi of nhiIds) {
    if (nhi.status !== 'orphaned' && Math.random() > 0.2) {
      await db.update(schema.identities)
        .set({ ownerIdentityId: randomItem(humanIds) })
        .where(eq(schema.identities.id, nhi.id))
    }
  }

  // Set managers for some humans
  const managerCandidates = allIdentities.filter(i => i.type === 'human' && i.adTier !== 'tier_2').map(i => i.id)
  for (const identity of allIdentities.filter(i => i.type === 'human' && i.adTier === 'tier_2')) {
    if (managerCandidates.length > 0 && Math.random() > 0.3) {
      await db.update(schema.identities)
        .set({ managerIdentityId: randomItem(managerCandidates) })
        .where(eq(schema.identities.id, identity.id))
    }
  }

  // 4. Accounts (1-3 per identity)
  const accountValues: (typeof schema.accounts.$inferInsert)[] = []
  for (const identity of allIdentities) {
    const numAccounts = identity.type === 'human' ? randomInt(1, 3) : 1
    const platforms: (typeof schema.platformEnum.enumValues)[number][] =
      identity.type === 'human'
        ? ['ad', 'azure_ad', 'okta'].slice(0, numAccounts) as any
        : [identity.sourceSystem === 'azure_ad' ? 'azure_ad' : 'ad'] as any

    for (let j = 0; j < numAccounts; j++) {
      accountValues.push({
        identityId: identity.id,
        platform: platforms[j] || 'ad',
        accountName: identity.samAccountName || identity.displayName,
        accountType: identity.adTier === 'tier_0' ? 'admin'
          : identity.adTier === 'tier_1' ? 'privileged'
          : identity.type === 'non_human' ? 'service'
          : 'standard',
        enabled: identity.status === 'active' || identity.status === 'dormant',
        lastAuthenticatedAt: identity.lastLogonAt,
        mfaEnabled: identity.type === 'human' && Math.random() > 0.15,
        mfaMethods: identity.type === 'human' && Math.random() > 0.15
          ? [randomItem(['authenticator', 'sms', 'email', 'fido2'])]
          : [],
        privileged: identity.adTier === 'tier_0' || identity.adTier === 'tier_1',
        orgId: org.id,
      })
    }
  }
  const allAccounts = await db.insert(schema.accounts).values(accountValues).returning()
  console.log(`Created ${allAccounts.length} accounts`)

  // 5. Resources (100)
  const resourceTypes: (typeof schema.resourceTypeEnum.enumValues)[number][] = [
    'domain_controller', 'domain_controller', 'domain_controller',
    'server', 'server', 'server', 'server', 'server', 'server', 'server',
    'server', 'server', 'server', 'server', 'server', 'server', 'server',
    'application', 'application', 'application', 'application', 'application',
    'application', 'application', 'application', 'application', 'application',
    'database', 'database', 'database', 'database', 'database',
    'database', 'database', 'database', 'database', 'database',
    'file_share', 'file_share', 'file_share', 'file_share', 'file_share',
    'cloud_resource', 'cloud_resource', 'cloud_resource', 'cloud_resource',
    'cloud_resource', 'cloud_resource', 'cloud_resource', 'cloud_resource',
    'workstation', 'workstation', 'workstation', 'workstation', 'workstation',
    'workstation', 'workstation', 'workstation', 'workstation', 'workstation',
    'network_device', 'network_device', 'network_device', 'network_device',
    'saas_app', 'saas_app', 'saas_app', 'saas_app', 'saas_app',
    'saas_app', 'saas_app', 'saas_app', 'saas_app', 'saas_app',
  ]
  const resourceNames: Record<string, string[]> = {
    domain_controller: ['DC-PRIMARY', 'DC-SECONDARY', 'DC-DR'],
    server: ['SRV-APP-01', 'SRV-APP-02', 'SRV-WEB-01', 'SRV-WEB-02', 'SRV-DB-01',
      'SRV-FILE-01', 'SRV-EXCH-01', 'SRV-SCCM-01', 'SRV-WSUS-01', 'SRV-PRINT-01',
      'SRV-ADFS-01', 'SRV-AADConnect', 'SRV-PKI-01', 'SRV-RADIUS-01', 'SRV-NPS-01',
      'SRV-BACKUP-01', 'SRV-MON-01'],
    application: ['ERP-SAP', 'CRM-Dynamics', 'HR-SuccessFactors', 'ServiceNow', 'Jira',
      'Confluence', 'GitLab', 'Jenkins', 'SonarQube', 'Artifactory'],
    database: ['DB-ERP-PROD', 'DB-CRM-PROD', 'DB-HR-PROD', 'DB-FINANCE', 'DB-AUDIT',
      'DB-LOGS', 'DB-ANALYTICS', 'DB-APP-01', 'DB-APP-02', 'DB-STAGING'],
    file_share: ['FS-DEPT', 'FS-SHARED', 'FS-FINANCE', 'FS-LEGAL', 'FS-EXEC'],
    cloud_resource: ['AZ-VNET-PROD', 'AZ-KEYVAULT-01', 'AZ-STORAGE-01', 'AZ-AKS-PROD',
      'AZ-APIM-01', 'AZ-FUNC-01', 'AZ-SQL-01', 'AZ-COSMOSDB-01'],
    workstation: Array.from({ length: 10 }, (_, i) => `WS-${(i + 1).toString().padStart(3, '0')}`),
    network_device: ['FW-CORE-01', 'FW-DMZ-01', 'SW-CORE-01', 'VPN-GW-01'],
    saas_app: ['M365', 'Salesforce', 'Slack', 'Zoom', 'Box', 'Okta-SSO', 'CyberArk-PAM',
      'SailPoint-IIQ', 'Splunk-Cloud', 'Datadog'],
  }

  const resourceValues: (typeof schema.resources.$inferInsert)[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < 100; i++) {
    const rType = resourceTypes[i] || 'server'
    const names = resourceNames[rType] || [`RES-${i}`]
    let name = names[i % names.length] || `RES-${rType}-${i}`
    if (usedNames.has(name)) name = `${name}-${i}`
    usedNames.add(name)

    const tier: (typeof schema.adTierEnum.enumValues)[number] =
      rType === 'domain_controller' ? 'tier_0'
      : ['server', 'application', 'database'].includes(rType) ? 'tier_1'
      : 'tier_2'

    resourceValues.push({
      name,
      type: rType,
      adTier: tier,
      criticality: tier === 'tier_0' ? 'critical' : tier === 'tier_1' ? 'high' : 'medium',
      environment: Math.random() > 0.15 ? 'production' : randomItem(['staging', 'development', 'dr']),
      ownerIdentityId: Math.random() > 0.3 ? randomItem(humanIds) : undefined,
      orgId: org.id,
    })
  }
  const allResources = await db.insert(schema.resources).values(resourceValues).returning()
  console.log(`Created ${allResources.length} resources`)

  // 6. Groups (50)
  const groupValues: (typeof schema.groups.$inferInsert)[] = []
  const privilegedGroupNames = [
    'Domain Admins', 'Enterprise Admins', 'Schema Admins', 'Administrators',
    'Account Operators', 'Server Operators', 'Backup Operators',
  ]
  const securityGroupNames = [
    'IT-Department', 'HR-Department', 'Finance-Department', 'Legal-Department',
    'Engineering', 'Operations', 'Compliance', 'Audit', 'Executive-Staff',
    'All-Employees', 'Contractors-Group', 'Vendors-Group',
  ]
  const appGroupNames = [
    'APP-ERP-Users', 'APP-ERP-Admins', 'APP-CRM-Users', 'APP-CRM-Admins',
    'APP-HR-Users', 'APP-ServiceNow-Users', 'APP-Jira-Users',
    'APP-GitLab-Developers', 'APP-Jenkins-Admins',
  ]
  const azureGroupNames = [
    'AZ-Subscription-Owners', 'AZ-Subscription-Contributors',
    'AZ-Subscription-Readers', 'AZ-KeyVault-Admins',
    'AZ-Storage-Contributors', 'AZ-SQL-Admins',
  ]
  const allGroupNames = [
    ...privilegedGroupNames.map(n => ({ name: n, type: 'privileged_access' as const, tier: 'tier_0' as const, priv: true })),
    ...securityGroupNames.map(n => ({ name: n, type: 'security' as const, tier: 'tier_2' as const, priv: false })),
    ...appGroupNames.map(n => ({ name: n, type: 'role_based' as const, tier: 'tier_1' as const, priv: n.includes('Admin') })),
    ...azureGroupNames.map(n => ({ name: n, type: 'security' as const, tier: n.includes('Owner') || n.includes('Admin') ? 'tier_0' as const : 'tier_1' as const, priv: n.includes('Owner') || n.includes('Admin') })),
  ]

  for (let i = 0; i < Math.min(50, allGroupNames.length); i++) {
    const g = allGroupNames[i]
    groupValues.push({
      name: g.name,
      type: g.type,
      scope: 'global',
      adTier: g.tier,
      sourceSystem: g.name.startsWith('AZ-') ? 'azure_ad' : 'active_directory',
      sourceId: `GRP-${(i + 1).toString().padStart(4, '0')}`,
      memberCount: 0,
      nestedGroupCount: 0,
      isPrivileged: g.priv,
      ownerIdentityId: randomItem(humanIds),
      orgId: org.id,
    })
  }
  // Fill to 50 if needed
  while (groupValues.length < 50) {
    const idx = groupValues.length
    groupValues.push({
      name: `GRP-Custom-${idx}`,
      type: 'security',
      scope: 'domain_local',
      adTier: 'tier_2',
      sourceSystem: 'active_directory',
      sourceId: `GRP-${(idx + 1).toString().padStart(4, '0')}`,
      memberCount: 0,
      nestedGroupCount: 0,
      isPrivileged: false,
      ownerIdentityId: randomItem(humanIds),
      orgId: org.id,
    })
  }
  const allGroups = await db.insert(schema.groups).values(groupValues).returning()
  console.log(`Created ${allGroups.length} groups`)

  // 7. Group memberships (~300)
  const membershipValues: (typeof schema.groupMemberships.$inferInsert)[] = []
  const membershipSet = new Set<string>()
  for (const group of allGroups) {
    const numMembers = group.isPrivileged ? randomInt(2, 8) : randomInt(5, 20)
    for (let j = 0; j < numMembers; j++) {
      const identityId = randomItem(allIdentities.map(i => i.id))
      const key = `${group.id}-${identityId}`
      if (membershipSet.has(key)) continue
      membershipSet.add(key)
      membershipValues.push({
        groupId: group.id,
        identityId,
        membershipType: Math.random() > 0.8 ? 'nested' : 'direct',
        addedBy: 'system',
        orgId: org.id,
      })
    }
  }
  await db.insert(schema.groupMemberships).values(membershipValues)
  console.log(`Created ${membershipValues.length} group memberships`)

  // Update member counts
  for (const group of allGroups) {
    const count = membershipValues.filter(m => m.groupId === group.id).length
    await db.update(schema.groups)
      .set({ memberCount: count })
      .where(eq(schema.groups.id, group.id))
  }

  // 8. Entitlements (500)
  const permissionNames: Record<string, string[]> = {
    tier_0: ['Domain Admin', 'Enterprise Admin', 'Schema Admin', 'Global Admin',
      'Privileged Authentication Admin', 'Exchange Admin', 'Security Admin'],
    tier_1: ['Server Operator', 'Backup Operator', 'Application Admin',
      'SQL Admin', 'Storage Blob Contributor', 'Virtual Machine Contributor',
      'Key Vault Admin', 'Reader', 'Contributor'],
    tier_2: ['User', 'Reader', 'Help Desk Operator', 'Print Operator',
      'Basic User', 'Standard User', 'Guest'],
  }

  const entitlementValues: (typeof schema.entitlements.$inferInsert)[] = []
  for (let i = 0; i < 500; i++) {
    const identity = randomItem(allIdentities)
    const resource = randomItem(allResources)
    const tier = resource.adTier || 'tier_2'
    const tierKey = tier === 'unclassified' ? 'tier_2' : tier
    const isTierViolation = identity.adTier === 'tier_2' && (tier === 'tier_0' || tier === 'tier_1')

    entitlementValues.push({
      identityId: identity.id,
      resourceId: resource.id,
      permissionType: randomItem(['role', 'group_membership', 'direct_assignment', 'inherited', 'delegated'] as const),
      permissionName: randomItem(permissionNames[tierKey] || permissionNames.tier_2),
      permissionScope: resource.name,
      adTierOfPermission: tier,
      grantedAt: randomDate(365, 1),
      grantedBy: 'system',
      lastUsedAt: Math.random() > 0.2 ? randomDate(90, 0) : null,
      certifiable: true,
      certificationStatus: randomItem(['pending', 'certified', 'certified', 'certified', 'expired'] as const),
      lastCertifiedAt: Math.random() > 0.3 ? randomDate(180, 1) : null,
      riskTags: isTierViolation
        ? ['tier_violation']
        : Math.random() > 0.9
          ? [randomItem(['toxic_combination', 'sod_violation', 'excessive_privilege'])]
          : [],
      orgId: org.id,
    })
  }
  const allEntitlements = await db.insert(schema.entitlements).values(entitlementValues).returning()
  console.log(`Created ${allEntitlements.length} entitlements`)

  // Mark tier violations on identities
  for (const identity of allIdentities) {
    const tierNum = (t: string) => t === 'tier_0' ? 0 : t === 'tier_1' ? 1 : t === 'tier_2' ? 2 : 3
    const myEntitlements = allEntitlements.filter(e => e.identityId === identity.id)
    const highestAccess = myEntitlements.reduce((min, e) => {
      const t = tierNum(e.adTierOfPermission)
      return t < min ? t : min
    }, 3)
    const myTier = tierNum(identity.adTier || 'unclassified')
    if (highestAccess < myTier) {
      const effectiveTier = highestAccess === 0 ? 'tier_0' : highestAccess === 1 ? 'tier_1' : 'tier_2'
      await db.update(schema.identities)
        .set({ effectiveTier, tierViolation: true })
        .where(eq(schema.identities.id, identity.id))
    }
  }

  // 9. Policies (10)
  const policyDefs = [
    { name: 'Tier Breach Detection', type: 'tiering_rule' as const, severity: 'critical' as const,
      definition: { rule: 'effective_tier < ad_tier' } },
    { name: 'SoD: Finance + Audit', type: 'sod_rule' as const, severity: 'high' as const,
      definition: { conflicting_roles: ['Finance Admin', 'Audit Admin'] } },
    { name: 'Dormant Account Policy', type: 'lifecycle_policy' as const, severity: 'medium' as const,
      definition: { inactivity_days: 90 } },
    { name: 'MFA Required', type: 'mfa_policy' as const, severity: 'high' as const,
      definition: { require_mfa: true, scope: 'all_users' } },
    { name: 'Password Age Policy', type: 'password_policy' as const, severity: 'medium' as const,
      definition: { max_age_days: 90 } },
    { name: 'Quarterly Certification', type: 'certification_policy' as const, severity: 'medium' as const,
      definition: { certification_period_days: 90 } },
    { name: 'NHI Ownership Required', type: 'lifecycle_policy' as const, severity: 'high' as const,
      definition: { require_owner: true, scope: 'non_human' } },
    { name: 'Excessive Privilege Detection', type: 'access_policy' as const, severity: 'high' as const,
      definition: { max_entitlements_multiplier: 2 } },
    { name: 'Tier 0 MFA Enforcement', type: 'mfa_policy' as const, severity: 'critical' as const,
      definition: { require_mfa: true, scope: 'tier_0' } },
    { name: 'SoD: HR + IT Admin', type: 'sod_rule' as const, severity: 'high' as const,
      definition: { conflicting_roles: ['HR Admin', 'IT Admin'] } },
  ]

  const policyValues = policyDefs.map(p => ({
    ...p,
    enabled: true,
    frameworkMappings: { NCA_ECC: ['2-3-1'], SAMA_CSF: ['CC-1'] },
    orgId: org.id,
  }))
  const allPolicies = await db.insert(schema.policies).values(policyValues).returning()
  console.log(`Created ${allPolicies.length} policies`)

  // 10. Policy Violations (30)
  const violationDefs: { type: typeof schema.violationTypeEnum.enumValues[number], severity: typeof schema.severityEnum.enumValues[number], policyIdx: number }[] = [
    // 8 tier breaches
    ...Array(8).fill(null).map(() => ({ type: 'tier_breach' as const, severity: 'critical' as const, policyIdx: 0 })),
    // 5 excessive privilege
    ...Array(5).fill(null).map(() => ({ type: 'excessive_privilege' as const, severity: 'high' as const, policyIdx: 7 })),
    // 4 missing MFA
    ...Array(4).fill(null).map(() => ({ type: 'missing_mfa' as const, severity: 'high' as const, policyIdx: 3 })),
    // 4 dormant access
    ...Array(4).fill(null).map(() => ({ type: 'dormant_access' as const, severity: 'medium' as const, policyIdx: 2 })),
    // 3 orphaned identity
    ...Array(3).fill(null).map(() => ({ type: 'orphaned_identity' as const, severity: 'high' as const, policyIdx: 6 })),
    // 3 expired certification
    ...Array(3).fill(null).map(() => ({ type: 'expired_certification' as const, severity: 'medium' as const, policyIdx: 5 })),
    // 2 SoD conflicts
    ...Array(2).fill(null).map(() => ({ type: 'sod_conflict' as const, severity: 'high' as const, policyIdx: 1 })),
    // 1 password age
    { type: 'password_age' as const, severity: 'medium' as const, policyIdx: 4 },
  ]

  const violationValues = violationDefs.map((v, i) => ({
    policyId: allPolicies[v.policyIdx].id,
    identityId: randomItem(allIdentities).id,
    entitlementId: Math.random() > 0.4 ? randomItem(allEntitlements).id : undefined,
    violationType: v.type,
    severity: v.severity,
    status: i < 20 ? 'open' as const
      : i < 25 ? 'acknowledged' as const
      : i < 28 ? 'remediated' as const
      : 'excepted' as const,
    detectedAt: randomDate(60, 1),
    orgId: org.id,
  }))
  const allViolations = await db.insert(schema.policyViolations).values(violationValues).returning()
  console.log(`Created ${allViolations.length} policy violations`)

  // 11. Integration Sources (5)
  const integrationValues = [
    { name: 'Corporate Active Directory', type: 'active_directory' as const,
      syncStatus: 'connected' as const, lastSyncAt: daysAgo(0),
      lastSyncRecordCount: 180, syncFrequencyMinutes: 360 },
    { name: 'Azure AD / Entra ID', type: 'azure_ad' as const,
      syncStatus: 'connected' as const, lastSyncAt: daysAgo(0),
      lastSyncRecordCount: 200, syncFrequencyMinutes: 240 },
    { name: 'Okta SSO', type: 'okta' as const,
      syncStatus: 'connected' as const, lastSyncAt: daysAgo(1),
      lastSyncRecordCount: 150, syncFrequencyMinutes: 360 },
    { name: 'SailPoint IdentityNow', type: 'sailpoint' as const,
      syncStatus: 'error' as const, lastSyncAt: daysAgo(3),
      lastSyncRecordCount: 120, syncFrequencyMinutes: 360 },
    { name: 'CyberArk PAM', type: 'cyberark' as const,
      syncStatus: 'connected' as const, lastSyncAt: daysAgo(0),
      lastSyncRecordCount: 45, syncFrequencyMinutes: 240 },
  ].map(i => ({ ...i, config: {}, orgId: org.id }))
  await db.insert(schema.integrationSources).values(integrationValues)
  console.log('Created 5 integration sources')

  // 12. Sample action log entries
  const sampleActor = allIdentities.find(i => i.adTier === 'tier_0' && i.type === 'human') || allIdentities[0]
  const actionLogValues = [
    { actionType: 'certify_entitlement' as const, actorIdentityId: sampleActor.id,
      targetEntitlementId: allEntitlements[0].id, payload: {},
      rationale: 'Quarterly access review completed', source: 'manual' as const, orgId: org.id },
    { actionType: 'acknowledge_violation' as const, actorIdentityId: sampleActor.id,
      targetPolicyViolationId: allViolations[0].id, payload: {},
      rationale: 'Investigating tier breach', source: 'manual' as const, orgId: org.id },
    { actionType: 'sync_source' as const, actorIdentityId: sampleActor.id,
      payload: { source: 'active_directory', records: 180 },
      rationale: 'Scheduled sync', source: 'automated' as const, orgId: org.id },
    { actionType: 'escalate_risk' as const, actorIdentityId: sampleActor.id,
      targetIdentityId: allIdentities.find(i => i.riskScore > 60)?.id || allIdentities[0].id,
      payload: { previousScore: 45, newScore: 75 },
      rationale: 'Multiple tier violations detected', source: 'automated' as const, orgId: org.id },
  ]
  await db.insert(schema.actionLog).values(actionLogValues)
  console.log('Created sample action log entries')

  // 13. Sample remediation plan
  await db.insert(schema.remediationPlans).values({
    generatedBy: 'ai',
    inputParams: { budget: 50000, timelineDays: 30, riskAppetite: 'moderate' },
    rankedActions: [
      { priority: 1, action: 'Revoke Tier 0 access for Tier 2 identities', count: 8 },
      { priority: 2, action: 'Enable MFA for privileged accounts', count: 4 },
      { priority: 3, action: 'Assign owners to orphaned NHIs', count: 5 },
    ],
    executiveSummary: 'Critical tier violations require immediate attention. 8 Tier 2 identities have Tier 0 access, representing the highest risk. Enabling MFA and resolving NHI ownership will reduce overall risk by an estimated 35%.',
    projectedRiskReduction: 35,
    quickWins: [
      { action: 'Disable 10 dormant accounts', effort: 'low', impact: 'medium' },
      { action: 'Enable MFA for 4 accounts', effort: 'low', impact: 'high' },
    ],
    status: 'draft',
    orgId: org.id,
  })
  console.log('Created sample remediation plan')

  console.log('\nSeed complete!')
  console.log('Login: admin@acmefs.sa / admin123')

  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
