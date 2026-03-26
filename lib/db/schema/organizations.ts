import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  industry: text('industry'),
  regulatoryFrameworks: text('regulatory_frameworks').array().default([]),
  adForestName: text('ad_forest_name'),
  tenantId: text('tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
