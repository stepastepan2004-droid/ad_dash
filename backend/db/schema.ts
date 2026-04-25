import { doublePrecision, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  period: text('period').notNull(),
  platform: text('platform').notNull(),
  campaignType: text('campaign_type').notNull(),
  campaignName: text('campaign_name').notNull(),
  promotionType: text('promotion_type').notNull(), // 'product' | 'media'
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  spend: doublePrecision('spend').notNull().default(0),
  ctr: doublePrecision('ctr'),
  cpc: doublePrecision('cpc'),
  leads: integer('leads'),
  sku: text('sku'),
  addToCart: integer('add_to_cart'),
  revenue: doublePrecision('revenue'),
  drr: doublePrecision('drr'),
  reach: integer('reach'),
  cpm: doublePrecision('cpm'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('campaigns_unique_idx').on(
    table.period,
    table.platform,
    table.campaignType,
    table.campaignName,
    table.promotionType,
  ),
  index('idx_period').on(table.period),
  index('idx_platform').on(table.platform),
  index('idx_campaign_type').on(table.campaignType),
  index('idx_promotion_type').on(table.promotionType),
])

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert

// Budget plans for plan/fact comparison
export const budgetPlans = pgTable('budget_plans', {
  id: serial('id').primaryKey(),
  promotionType: text('promotion_type').notNull(), // 'product' | 'media'
  budgetPlan: doublePrecision('budget_plan').notNull().default(0),
  impressionsPlan: integer('impressions_plan').notNull().default(0),
  clicksPlan: integer('clicks_plan').notNull().default(0),
  reachPlan: integer('reach_plan').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('budget_plans_promo_idx').on(table.promotionType),
])
