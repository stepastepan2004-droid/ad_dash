import { Elysia } from 'elysia'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { campaigns } from '../db/schema'
import { parseExcel } from '../utils/excel-parser'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const VALID_PROMOTION_TYPES = ['product', 'media'] as const

export const uploadRoutes = new Elysia()
  .post('/api/upload', async ({ body, query }) => {
    const promotionType = (query as Record<string, string>).promotionType
    if (!promotionType || !VALID_PROMOTION_TYPES.includes(promotionType as any)) {
      return { success: false, error: 'Укажите тип продвижения: promotionType=product или promotionType=media' }
    }

    const formData = body as { file?: File }

    if (!formData.file) {
      return { success: false, error: 'Файл не передан.' }
    }

    const file = formData.file

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `Файл слишком большой (${Math.round(file.size / 1024 / 1024)} МБ). Максимум: 50 МБ.` }
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return { success: false, error: 'Поддерживается только формат .xlsx / .xls' }
    }

    const buffer = await file.arrayBuffer()
    const result = parseExcel(buffer)

    if (!result.success) {
      return result
    }

    // Upsert rows in a transaction
    let upserted = 0
    try {
      await db.transaction(async (tx) => {
        for (const row of result.rows) {
          await tx.insert(campaigns)
            .values({ ...row, promotionType })
            .onConflictDoUpdate({
              target: [campaigns.period, campaigns.platform, campaigns.campaignType, campaigns.campaignName, campaigns.promotionType],
              set: {
                impressions: sql`excluded.impressions`,
                clicks: sql`excluded.clicks`,
                spend: sql`excluded.spend`,
                ctr: sql`excluded.ctr`,
                cpc: sql`excluded.cpc`,
                leads: sql`excluded.leads`,
                sku: sql`excluded.sku`,
                addToCart: sql`excluded.add_to_cart`,
                revenue: sql`excluded.revenue`,
                drr: sql`excluded.drr`,
                reach: sql`excluded.reach`,
                cpm: sql`excluded.cpm`,
                updatedAt: sql`now()`,
              },
            })
          upserted++
        }
      })
    }
    catch (e) {
      const message = e instanceof Error ? e.message : 'Неизвестная ошибка'
      return { success: false, error: `Ошибка записи в БД: ${message}` }
    }

    const parts = [`Загружено ${upserted} строк.`]
    if (result.detectedPlatform) parts.push(`Площадка: ${result.detectedPlatform}`)
    if (result.warnings.length > 0) parts.push(...result.warnings)

    return {
      success: true,
      message: parts.join(' '),
      rowCount: upserted,
      warnings: result.warnings,
    }
  })
