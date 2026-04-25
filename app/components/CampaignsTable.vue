<script setup lang="ts">
import { h } from 'vue'

interface CampaignRow {
  id: number
  period: string
  platform: string
  campaignType: string
  campaignName: string
  impressions: number
  clicks: number
  spend: number
  ctr: number | null
  cpc: number | null
  leads: number | null
  sku: string | null
  addToCart: number | null
  revenue: number | null
  drr: number | null
  reach: number | null
  cpm: number | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const props = defineProps<{
  data: CampaignRow[]
  promotionType: 'product' | 'media'
  vatDivisor?: number // 1 = as-is, 1.22 = strip VAT
  pagination?: Pagination
  currentPage?: number
}>()

const emit = defineEmits<{
  pageChange: [page: number]
}>()

const visiblePages = computed(() => {
  if (!props.pagination) return []
  const current = props.currentPage ?? 1
  const total = props.pagination.pages
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

type Row = { original: CampaignRow }

function fmt(n: number) { return n.toLocaleString('ru-RU') }
function fmtCur(n: number) { return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }) }
function vat(n: number) { return n / (props.vatDivisor ?? 1) }
function vatNull(n: number | null) { return n != null ? vat(n) : null }

// Shared columns
const baseColumns = [
  { accessorKey: 'period', header: 'Период' },
  { accessorKey: 'platform', header: 'Площадка' },
  { accessorKey: 'campaignType', header: 'Тип' },
  { accessorKey: 'campaignName', header: 'Кампания' },
  { accessorKey: 'impressions', header: 'Показы', cell: ({ row }: { row: Row }) => h('span', fmt(row.original.impressions)) },
  { accessorKey: 'clicks', header: 'Клики', cell: ({ row }: { row: Row }) => h('span', fmt(row.original.clicks)) },
  { accessorKey: 'ctr', header: 'CTR', cell: ({ row }: { row: Row }) => h('span', row.original.ctr != null ? `${row.original.ctr.toFixed(2)}%` : '—') },
  { accessorKey: 'cpc', header: 'CPC', cell: ({ row }: { row: Row }) => h('span', row.original.cpc != null ? fmtCur(vat(row.original.cpc)) : '—') },
  { accessorKey: 'spend', header: 'Расход', cell: ({ row }: { row: Row }) => h('span', fmtCur(vat(row.original.spend))) },
  { accessorKey: 'reach', header: 'Охват', cell: ({ row }: { row: Row }) => h('span', row.original.reach != null ? fmt(row.original.reach) : '—') },
  { accessorKey: 'cpm', header: 'CPM', cell: ({ row }: { row: Row }) => h('span', row.original.cpm != null ? fmtCur(vat(row.original.cpm)) : '—') },
]

// Product-only columns
const productColumns = [
  { accessorKey: 'sku', header: 'SKU', cell: ({ row }: { row: Row }) => h('span', row.original.sku ?? '—') },
  { accessorKey: 'addToCart', header: 'В корзину', cell: ({ row }: { row: Row }) => h('span', row.original.addToCart != null ? fmt(row.original.addToCart) : '—') },
  { accessorKey: 'leads', header: 'Заказы', cell: ({ row }: { row: Row }) => h('span', row.original.leads != null ? fmt(row.original.leads) : '—') },
  { accessorKey: 'revenue', header: 'Выручка', cell: ({ row }: { row: Row }) => h('span', row.original.revenue != null ? fmtCur(row.original.revenue) : '—') },
  { accessorKey: 'drr', header: 'ДРР', cell: ({ row }: { row: Row }) => h('span', row.original.drr != null ? `${row.original.drr.toFixed(2)}%` : '—') },
]

const columns = computed(() => {
  if (props.promotionType === 'product') {
    return [...baseColumns, ...productColumns]
  }
  return baseColumns
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Кампании</h3>
        <span v-if="pagination" class="text-sm text-dimmed">
          Всего: {{ pagination.total.toLocaleString('ru-RU') }}
        </span>
      </div>
    </template>

    <div class="overflow-x-auto">
      <UTable :data="data" :columns="columns" />
    </div>

    <template v-if="pagination && pagination.pages > 1" #footer>
      <div class="flex items-center justify-between">
        <span class="text-sm text-dimmed">Стр. {{ currentPage }} из {{ pagination.pages }}</span>
        <div class="flex gap-1">
          <UButton size="sm" variant="soft" icon="i-lucide-chevron-left" :disabled="currentPage === 1" @click="emit('pageChange', (currentPage ?? 1) - 1)" />
          <UButton v-for="p in visiblePages" :key="p" size="sm" :variant="p === currentPage ? 'solid' : 'soft'" @click="emit('pageChange', p)">{{ p }}</UButton>
          <UButton size="sm" variant="soft" icon="i-lucide-chevron-right" :disabled="currentPage === pagination.pages" @click="emit('pageChange', (currentPage ?? 1) + 1)" />
        </div>
      </div>
    </template>
  </UCard>
</template>
