import { Elysia } from 'elysia'
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { campaigns, budgetPlans } from '../db/schema'

function buildWhere(query: Record<string, string | undefined>) {
  const { promotionType, platform, type, periodFrom, periodTo, period } = query
  const conditions = []
  if (promotionType) conditions.push(eq(campaigns.promotionType, promotionType))
  if (platform) conditions.push(eq(campaigns.platform, platform))
  if (type) conditions.push(eq(campaigns.campaignType, type))
  if (periodFrom) conditions.push(gte(campaigns.period, periodFrom))
  if (periodTo) conditions.push(lte(campaigns.period, periodTo))
  // backward compat: exact period filter
  if (period) conditions.push(eq(campaigns.period, period))
  return conditions.length > 0 ? and(...conditions) : undefined
}

export const campaignRoutes = new Elysia()
  .get('/api/campaigns', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)

    const page = Math.max(1, Number(q.page) || 1)
    const limit = Math.min(500, Math.max(1, Number(q.limit) || 50))
    const offset = (page - 1) * limit

    const [data, totalRows] = await Promise.all([
      db.select().from(campaigns)
        .where(where)
        .orderBy(desc(campaigns.period))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(campaigns).where(where),
    ])

    const total = totalRows[0]?.count ?? 0

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  .get('/api/campaigns/summary', async ({ query, set }) => {
    const where = buildWhere(query as Record<string, string | undefined>)

    try {
      const rows = await db.select({
        totalImpressions: sql<number>`coalesce(sum(${campaigns.impressions}), 0)`,
        totalClicks: sql<number>`coalesce(sum(${campaigns.clicks}), 0)`,
        totalSpend: sql<number>`coalesce(sum(${campaigns.spend}), 0)`,
        avgCtr: sql<number | null>`case when sum(${campaigns.impressions}) > 0 then round((sum(${campaigns.clicks})::numeric / sum(${campaigns.impressions})::numeric * 100), 2) else null end`,
        avgCpc: sql<number | null>`case when sum(${campaigns.clicks}) > 0 then round((sum(${campaigns.spend})::numeric / sum(${campaigns.clicks})::numeric), 2) else null end`,
        totalLeads: sql<number | null>`sum(${campaigns.leads})`,
        totalRevenue: sql<number | null>`sum(${campaigns.revenue})`,
        totalReach: sql<number | null>`sum(${campaigns.reach})`,
        avgCpm: sql<number | null>`case when sum(${campaigns.impressions}) > 0 then round((sum(${campaigns.spend})::numeric / sum(${campaigns.impressions})::numeric * 1000), 2) else null end`,
        avgDrr: sql<number | null>`case when sum(${campaigns.revenue}) > 0 then round((sum(${campaigns.spend})::numeric / sum(${campaigns.revenue})::numeric * 100), 2) else null end`,
        campaignCount: sql<number>`count(distinct ${campaigns.campaignName})`,
      }).from(campaigns).where(where)

      return rows[0]
    }
    catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      console.error('Summary query failed:', message)
      set.status = 500
      return { error: message }
    }
  })

  .get('/api/campaigns/by-period', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)

    return await db.select({
      period: campaigns.period,
      totalSpend: sql<number>`coalesce(sum(${campaigns.spend}), 0)`,
      totalClicks: sql<number>`coalesce(sum(${campaigns.clicks}), 0)`,
      totalImpressions: sql<number>`coalesce(sum(${campaigns.impressions}), 0)`,
      totalReach: sql<number>`coalesce(sum(${campaigns.reach}), 0)`,
      totalLeads: sql<number>`coalesce(sum(${campaigns.leads}), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${campaigns.revenue}), 0)`,
    }).from(campaigns).where(where).groupBy(campaigns.period).orderBy(campaigns.period)
  })

  .get('/api/campaigns/by-platform', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)

    return await db.select({
      platform: campaigns.platform,
      totalSpend: sql<number>`sum(${campaigns.spend})`,
      totalClicks: sql<number>`sum(${campaigns.clicks})`,
      totalImpressions: sql<number>`sum(${campaigns.impressions})`,
    }).from(campaigns).where(where).groupBy(campaigns.platform)
  })

  .get('/api/campaigns/by-type', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)

    return await db.select({
      campaignType: campaigns.campaignType,
      totalSpend: sql<number>`sum(${campaigns.spend})`,
      totalClicks: sql<number>`sum(${campaigns.clicks})`,
      totalImpressions: sql<number>`sum(${campaigns.impressions})`,
    }).from(campaigns).where(where).groupBy(campaigns.campaignType)
  })

  .delete('/api/campaigns', async ({ query }) => {
    const promotionType = (query as Record<string, string | undefined>).promotionType
    if (promotionType) {
      await db.delete(campaigns).where(eq(campaigns.promotionType, promotionType))
      return { success: true, message: `Данные "${promotionType === 'product' ? 'Товарное' : 'Медийное'}" удалены` }
    }
    await db.delete(campaigns)
    return { success: true, message: 'Все данные удалены' }
  })

  .get('/api/campaigns/filters', async ({ query }) => {
    const promotionType = (query as Record<string, string | undefined>).promotionType
    const where = promotionType ? eq(campaigns.promotionType, promotionType) : undefined

    const [periodsRows, platformsRows, typesRows] = await Promise.all([
      db.selectDistinct({ period: campaigns.period })
        .from(campaigns).where(where).orderBy(desc(campaigns.period)),
      db.selectDistinct({ platform: campaigns.platform })
        .from(campaigns).where(where).orderBy(campaigns.platform),
      db.selectDistinct({ campaignType: campaigns.campaignType })
        .from(campaigns).where(where).orderBy(campaigns.campaignType),
    ])

    return {
      periods: periodsRows.map(r => r.period),
      platforms: platformsRows.map(r => r.platform),
      types: typesRows.map(r => r.campaignType),
    }
  })

  // By period with granularity (day/week/month)
  .get('/api/campaigns/by-period-granular', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)
    const granularity = q.granularity || 'day' // day | week | month

    let periodExpr: ReturnType<typeof sql>
    if (granularity === 'month') {
      periodExpr = sql`left(${campaigns.period}, 7)` // YYYY-MM
    } else if (granularity === 'week') {
      periodExpr = sql`to_char(date_trunc('week', ${campaigns.period}::date), 'YYYY-MM-DD')`
    } else {
      periodExpr = sql`${campaigns.period}` // day — as-is
    }

    return await db.select({
      period: periodExpr.as('period'),
      totalSpend: sql<number>`coalesce(sum(${campaigns.spend}), 0)`,
      totalClicks: sql<number>`coalesce(sum(${campaigns.clicks}), 0)`,
      totalImpressions: sql<number>`coalesce(sum(${campaigns.impressions}), 0)`,
      totalReach: sql<number>`coalesce(sum(${campaigns.reach}), 0)`,
      totalLeads: sql<number>`coalesce(sum(${campaigns.leads}), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${campaigns.revenue}), 0)`,
    }).from(campaigns).where(where).groupBy(periodExpr).orderBy(periodExpr)
  })

  // By period + platform (for stacked chart)
  .get('/api/campaigns/by-period-platform', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)
    const granularity = q.granularity || 'day'

    let periodExpr: ReturnType<typeof sql>
    if (granularity === 'month') {
      periodExpr = sql`left(${campaigns.period}, 7)`
    } else if (granularity === 'week') {
      periodExpr = sql`to_char(date_trunc('week', ${campaigns.period}::date), 'YYYY-MM-DD')`
    } else {
      periodExpr = sql`${campaigns.period}`
    }

    return await db.select({
      period: periodExpr.as('period'),
      platform: campaigns.platform,
      totalSpend: sql<number>`coalesce(sum(${campaigns.spend}), 0)`,
      totalClicks: sql<number>`coalesce(sum(${campaigns.clicks}), 0)`,
      totalImpressions: sql<number>`coalesce(sum(${campaigns.impressions}), 0)`,
    }).from(campaigns).where(where)
      .groupBy(periodExpr, campaigns.platform)
      .orderBy(periodExpr)
  })

  // Budget plans CRUD
  .get('/api/budget-plans', async ({ query }) => {
    const promotionType = (query as Record<string, string | undefined>).promotionType
    if (!promotionType) return null
    const rows = await db.select().from(budgetPlans).where(eq(budgetPlans.promotionType, promotionType))
    return rows[0] ?? null
  })

  .post('/api/budget-plans', async ({ body }) => {
    const data = body as {
      promotionType: string
      budgetPlan: number
      impressionsPlan: number
      clicksPlan: number
      reachPlan: number
    }
    if (!data.promotionType) return { success: false, error: 'promotionType required' }

    await db.insert(budgetPlans)
      .values(data)
      .onConflictDoUpdate({
        target: [budgetPlans.promotionType],
        set: {
          budgetPlan: sql`excluded.budget_plan`,
          impressionsPlan: sql`excluded.impressions_plan`,
          clicksPlan: sql`excluded.clicks_plan`,
          reachPlan: sql`excluded.reach_plan`,
          updatedAt: sql`now()`,
        },
      })

    return { success: true }
  })

  // Funnel data (product only)
  .get('/api/campaigns/funnel', async ({ query }) => {
    const where = buildWhere(query as Record<string, string | undefined>)

    const rows = await db.select({
      totalImpressions: sql<number>`coalesce(sum(${campaigns.impressions}), 0)`,
      totalClicks: sql<number>`coalesce(sum(${campaigns.clicks}), 0)`,
      totalAddToCart: sql<number>`coalesce(sum(${campaigns.addToCart}), 0)`,
      totalLeads: sql<number>`coalesce(sum(${campaigns.leads}), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${campaigns.revenue}), 0)`,
    }).from(campaigns).where(where)

    return rows[0]
  })

  // Top/bottom campaigns by metric
  .get('/api/campaigns/ranking', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const where = buildWhere(q)
    const metric = q.metric || 'ctr'
    const limit = Math.min(10, Math.max(1, Number(q.limit) || 5))

    // Map metric name to column
    const metricColumns: Record<string, any> = {
      ctr: campaigns.ctr,
      cpc: campaigns.cpc,
      drr: campaigns.drr,
      spend: campaigns.spend,
      clicks: campaigns.clicks,
      impressions: campaigns.impressions,
    }

    const col = metricColumns[metric]
    if (!col) return { top: [], bottom: [] }

    const [top, bottom] = await Promise.all([
      db.select({
        campaignName: campaigns.campaignName,
        platform: campaigns.platform,
        value: sql<number>`sum(${col})`,
        spend: sql<number>`sum(${campaigns.spend})`,
        clicks: sql<number>`sum(${campaigns.clicks})`,
        impressions: sql<number>`sum(${campaigns.impressions})`,
      })
        .from(campaigns)
        .where(where)
        .groupBy(campaigns.campaignName, campaigns.platform)
        .having(sql`sum(${col}) is not null and sum(${col}) > 0`)
        .orderBy(sql`sum(${col}) desc`)
        .limit(limit),
      db.select({
        campaignName: campaigns.campaignName,
        platform: campaigns.platform,
        value: sql<number>`sum(${col})`,
        spend: sql<number>`sum(${campaigns.spend})`,
        clicks: sql<number>`sum(${campaigns.clicks})`,
        impressions: sql<number>`sum(${campaigns.impressions})`,
      })
        .from(campaigns)
        .where(where)
        .groupBy(campaigns.campaignName, campaigns.platform)
        .having(sql`sum(${col}) is not null and sum(${col}) > 0`)
        .orderBy(sql`sum(${col}) asc`)
        .limit(limit),
    ])

    return { top, bottom }
  })

  // Search campaigns
  .get('/api/campaigns/search', async ({ query }) => {
    const q = query as Record<string, string | undefined>
    const search = q.search?.trim()
    if (!search) return []

    const where = buildWhere(q)
    const searchPattern = `%${search}%`

    const searchCondition = where
      ? and(where, sql`(${campaigns.campaignName} ilike ${searchPattern} or ${campaigns.sku} ilike ${searchPattern})`)
      : sql`(${campaigns.campaignName} ilike ${searchPattern} or ${campaigns.sku} ilike ${searchPattern})`

    return await db.select().from(campaigns)
      .where(searchCondition)
      .orderBy(desc(campaigns.period))
      .limit(50)
  })

  .get('/api/campaigns/export', async ({ query, set }) => {
    const where = buildWhere(query as Record<string, string | undefined>)

    const data = await db.select().from(campaigns)
      .where(where)
      .orderBy(desc(campaigns.period))

    const headers = ['Период', 'Площадка', 'Тип', 'Кампания', 'SKU', 'Показы', 'Клики', 'CTR', 'В корзину', 'CPC', 'Расход', 'Заказы', 'Продажи', 'ДРР', 'Охват', 'CPM']
    const rows = data.map(r => [
      r.period, r.platform, r.campaignType, r.campaignName, r.sku ?? '',
      r.impressions, r.clicks, r.ctr ?? '', r.addToCart ?? '', r.cpc ?? '',
      r.spend, r.leads ?? '', r.revenue ?? '', r.drr ?? '', r.reach ?? '', r.cpm ?? '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => {
        const s = String(cell)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(','))
      .join('\n')

    set.headers['content-type'] = 'text/csv; charset=utf-8'
    set.headers['content-disposition'] = 'attachment; filename="campaigns.csv"'
    return '\uFEFF' + csv
  })
