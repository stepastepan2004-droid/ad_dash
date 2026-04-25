import * as XLSX from 'xlsx'
import type { NewCampaign } from '../db/schema'

/**
 * Each entry: [pattern (substring match on lowercase header), target field]
 * Order matters — first match wins, so more specific patterns go first.
 */
const COLUMN_PATTERNS: [string, keyof NewCampaign][] = [
  // Period / date
  ['период', 'period'],
  ['дата', 'period'],
  ['день', 'period'],
  ['date', 'period'],

  // Platform
  ['площадка', 'platform'],
  ['платформа', 'platform'],
  ['источник', 'platform'],
  ['platform', 'platform'],

  // Campaign type
  ['тип кампании', 'campaignType'],
  ['тип', 'campaignType'],

  // Campaign name
  ['название кампании', 'campaignName'],
  ['название товара', 'campaignName'],
  ['кампания', 'campaignName'],
  ['название', 'campaignName'],
  ['campaign', 'campaignName'],

  // Core metrics
  ['показы', 'impressions'],
  ['клики', 'clicks'],
  ['расход', 'spend'],
  ['затраты', 'spend'],
  ['spend', 'spend'],

  // CTR / CPC
  ['ctr', 'ctr'],
  ['средняя стоимость клика', 'cpc'],
  ['cpc', 'cpc'],

  // Leads / orders
  ['заказы', 'leads'],
  ['лиды', 'leads'],
  ['конверсии', 'leads'],

  // WB-specific
  ['sku', 'sku'],
  ['артикул', 'sku'],
  ['в корзину', 'addToCart'],
  ['корзин', 'addToCart'],
  ['продажи', 'revenue'],
  ['дрр', 'drr'],

  // Media-specific
  ['охват', 'reach'],
  ['reach', 'reach'],
  ['стоимость 1000 показов', 'cpm'],
  ['cpm', 'cpm'],
]

/** Minimum required to produce a valid row */
const HARD_REQUIRED: (keyof NewCampaign)[] = [
  'period',
  'campaignName',
  'impressions',
  'clicks',
  'spend',
]

const FIELD_LABELS: Record<string, string> = {
  period: 'дата/период/день',
  campaignName: 'кампания/название товара',
  impressions: 'показы',
  clicks: 'клики',
  spend: 'расход',
}

export interface ParseResult {
  success: true
  rows: NewCampaign[]
  rowCount: number
  detectedPlatform: string | null
  warnings: string[]
}

export interface ParseError {
  success: false
  error: string
}

// ─── helpers ────────────────────────────────────────────────────────────

function normalizePeriod(value: unknown): string {
  if (!value) return ''

  // Handle numeric Excel serial dates directly → full date YYYY-MM-DD
  if (typeof value === 'number' && value > 10000 && value < 100000) {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  const str = String(value).trim()

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // YYYY-MM-DD with extra (e.g. YYYY-MM-DDTHH:mm:ss)
  const isoFullMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoFullMatch) return `${isoFullMatch[1]}-${isoFullMatch[2]}-${isoFullMatch[3]}`

  // Already YYYY-MM (no day) — keep as-is for backward compat
  if (/^\d{4}-\d{2}$/.test(str)) return str

  // DD.MM.YYYY
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`

  // MM/DD/YYYY
  const slashFullMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashFullMatch) return `${slashFullMatch[3]}-${slashFullMatch[1].padStart(2, '0')}-${slashFullMatch[2].padStart(2, '0')}`

  // MM/YYYY (no day)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{4})$/)
  if (slashMatch) return `${slashMatch[2]}-${slashMatch[1].padStart(2, '0')}`

  // Excel serial date number as string
  if (/^\d{5}$/.test(str)) {
    const date = XLSX.SSF.parse_date_code(Number(str))
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  // Month name in Russian (no day available → YYYY-MM)
  const months: Record<string, string> = {
    'январь': '01', 'февраль': '02', 'март': '03', 'апрель': '04',
    'май': '05', 'июнь': '06', 'июль': '07', 'август': '08',
    'сентябрь': '09', 'октябрь': '10', 'ноябрь': '11', 'декабрь': '12',
  }
  const lower = str.toLowerCase()
  for (const [month, num] of Object.entries(months)) {
    if (lower.includes(month)) {
      const yearMatch = str.match(/(\d{4})/)
      if (yearMatch) return `${yearMatch[1]}-${num}`
    }
  }

  return str
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const str = String(value).replace(/\s/g, '').replace(',', '.')
  const num = Number(str)
  return Number.isNaN(num) ? 0 : num
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).replace(/\s/g, '').replace(',', '.').replace('%', '')
  const num = Number(str)
  return Number.isNaN(num) ? null : num
}

/**
 * Match a header string against COLUMN_PATTERNS using substring containment.
 * Returns the first matching field or undefined.
 */
function matchHeader(header: string): keyof NewCampaign | undefined {
  const lower = header.toLowerCase().trim()
  for (const [pattern, field] of COLUMN_PATTERNS) {
    if (lower.includes(pattern)) return field
  }
  return undefined
}

/**
 * Try to detect the platform from the title row or sheet name.
 * Common patterns: "Кампания по продвижению товаров" → Wildberries, "Ozon" etc.
 */
function detectPlatform(titleRow: string | null, sheetName: string): string | null {
  const text = `${titleRow ?? ''} ${sheetName}`.toLowerCase()

  if (text.includes('wildberries') || text.includes('wb') || text.includes('кампания по продвижению товаров'))
    return 'Wildberries'
  if (text.includes('ozon'))
    return 'Ozon'
  if (text.includes('яндекс') || text.includes('yandex'))
    return 'Яндекс.Директ'
  if (text.includes('vk') || text.includes('вк') || text.includes('вконтакте'))
    return 'VK Ads'
  if (text.includes('google'))
    return 'Google Ads'

  return null
}

/**
 * Detect the campaign type from title row.
 */
function detectCampaignType(titleRow: string | null): string | null {
  if (!titleRow) return null
  const lower = titleRow.toLowerCase()

  if (lower.includes('медийн') || lower.includes('media'))
    return 'Медийное продвижение'
  if (lower.includes('продвижению товаров') || lower.includes('оплата за клик'))
    return 'Продвижение товаров'
  if (lower.includes('поиск'))
    return 'Поиск'
  if (lower.includes('рся') || lower.includes('сети'))
    return 'РСЯ'
  if (lower.includes('ретаргетинг'))
    return 'Ретаргетинг'

  return null
}

// ─── main ───────────────────────────────────────────────────────────────

export function parseExcel(buffer: ArrayBuffer): ParseResult | ParseError {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array' })
  }
  catch {
    return { success: false, error: 'Не удалось прочитать файл. Убедитесь, что это корректный .xlsx файл.' }
  }

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return { success: false, error: 'Файл пустой — не найден ни один лист.' }
  }

  // Read raw rows as arrays to find the header row
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
  if (rawRows.length < 2) {
    return { success: false, error: 'Файл содержит менее 2 строк — недостаточно данных.' }
  }

  // Find header row: the row that matches the most known column patterns (min 3 matches)
  let headerRowIdx = -1
  let bestMatchCount = 0
  let titleRow: string | null = null

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i]
    if (!Array.isArray(row)) continue
    const matched = new Set<string>()
    for (const cell of row) {
      if (typeof cell !== 'string') continue
      const field = matchHeader(cell)
      if (field) matched.add(field)
    }
    if (matched.size > bestMatchCount) {
      bestMatchCount = matched.size
      headerRowIdx = i
    }
  }

  // Collect all rows before header as title context
  if (headerRowIdx > 0) {
    const titleParts: string[] = []
    for (let i = 0; i < headerRowIdx; i++) {
      const row = rawRows[i]
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (cell != null && String(cell).trim()) titleParts.push(String(cell).trim())
        }
      }
    }
    titleRow = titleParts.join(' ')
  }
  else if (headerRowIdx === 0) {
    titleRow = null
  }

  if (headerRowIdx < 0 || bestMatchCount < 3) {
    const sampleHeaders = Array.isArray(rawRows[0])
      ? rawRows[0].filter(c => typeof c === 'string').join(', ')
      : '(нет строковых заголовков)'
    return {
      success: false,
      error: `Не удалось найти строку заголовков (нашлось совпадений: ${bestMatchCount}). Проверьте формат файла. Первая строка: ${sampleHeaders}`,
    }
  }

  // Build field map from header row
  const headerCells = rawRows[headerRowIdx] as unknown[]
  const fieldMap = new Map<number, keyof NewCampaign>()
  const mappedFields = new Set<keyof NewCampaign>()

  for (let col = 0; col < headerCells.length; col++) {
    const cell = headerCells[col]
    if (typeof cell !== 'string') continue
    const field = matchHeader(cell)
    if (field && !mappedFields.has(field)) {
      fieldMap.set(col, field)
      mappedFields.add(field)
    }
  }

  // Detect platform / type from context
  const detectedPlatform = detectPlatform(titleRow, sheetName)
  const detectedType = detectCampaignType(titleRow)
  const warnings: string[] = []

  // Check hard-required fields
  const missing = HARD_REQUIRED.filter(f => !mappedFields.has(f))
  if (missing.length > 0) {
    const labels = missing.map(f => FIELD_LABELS[f] || f).join(', ')
    return {
      success: false,
      error: `Не найдены обязательные колонки: ${labels}. Найденные колонки: ${headerCells.filter(c => typeof c === 'string').join(', ')}`,
    }
  }

  // Warn about missing optional fields that will be auto-filled
  if (!mappedFields.has('platform')) {
    const p = detectedPlatform || 'Не указана'
    warnings.push(`Колонка «Площадка» не найдена — установлено: ${p}`)
  }
  if (!mappedFields.has('campaignType')) {
    const t = detectedType || 'Не указан'
    warnings.push(`Колонка «Тип кампании» не найдена — установлено: ${t}`)
  }

  // Parse data rows (everything after the header)
  const rows: NewCampaign[] = []
  let skippedNoPeriod = 0
  let skippedNoName = 0
  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const rawRow = rawRows[i]
    if (!Array.isArray(rawRow) || rawRow.length === 0) continue

    // Skip completely empty rows
    if (rawRow.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue

    // Build mapped row
    const row: Record<string, unknown> = {}
    for (const [col, field] of fieldMap) {
      row[field] = rawRow[col]
    }

    const period = normalizePeriod(row.period)
    if (!period) { skippedNoPeriod++; continue }

    const platform = row.platform
      ? String(row.platform).trim()
      : (detectedPlatform || 'Не указана')

    const campaignType = row.campaignType
      ? String(row.campaignType).trim()
      : (detectedType || 'Не указан')

    const campaignName = String(row.campaignName || '').trim()
    if (!campaignName) { skippedNoName++; continue }

    rows.push({
      period,
      platform,
      campaignType,
      campaignName,
      impressions: toNumber(row.impressions),
      clicks: toNumber(row.clicks),
      spend: toNumber(row.spend),
      ctr: toNumberOrNull(row.ctr),
      cpc: toNumberOrNull(row.cpc),
      leads: row.leads !== undefined ? Math.round(toNumber(row.leads)) : null,
      sku: row.sku !== undefined ? String(row.sku).trim() : null,
      addToCart: row.addToCart !== undefined ? Math.round(toNumber(row.addToCart)) : null,
      revenue: toNumberOrNull(row.revenue),
      drr: toNumberOrNull(row.drr),
      reach: row.reach !== undefined ? Math.round(toNumber(row.reach)) : null,
      cpm: toNumberOrNull(row.cpm),
    })
  }

  if (skippedNoPeriod > 0) {
    warnings.push(`Пропущено ${skippedNoPeriod} строк без периода/даты.`)
  }
  if (skippedNoName > 0) {
    warnings.push(`Пропущено ${skippedNoName} строк без названия кампании.`)
  }

  if (rows.length === 0) {
    return { success: false, error: 'Не удалось распарсить ни одной строки. Проверьте формат данных.' }
  }

  return { success: true, rows, rowCount: rows.length, detectedPlatform, warnings }
}
