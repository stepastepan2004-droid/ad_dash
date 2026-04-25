<script setup lang="ts">
const VAT = 1.22

const props = defineProps<{
  promotionType: 'product' | 'media'
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalReach: number | null
  // Product-only
  totalLeads: number | null
  totalRevenue: number | null
}>()

// All spend-derived values computed without VAT from raw sums
const spendNoVat = computed(() => props.totalSpend / VAT)
const revenueNoVat = computed(() => (props.totalRevenue ?? 0) / VAT)

const ctr = computed(() =>
  props.totalImpressions > 0
    ? Math.round((props.totalClicks / props.totalImpressions) * 10000) / 100
    : null,
)

const cpc = computed(() =>
  props.totalClicks > 0
    ? Math.round((spendNoVat.value / props.totalClicks) * 100) / 100
    : null,
)

const cpm = computed(() =>
  props.totalImpressions > 0
    ? Math.round((spendNoVat.value / props.totalImpressions * 1000) * 100) / 100
    : null,
)

const drr = computed(() =>
  revenueNoVat.value > 0
    ? Math.round((spendNoVat.value / revenueNoVat.value * 100) * 100) / 100
    : null,
)

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n))
}

function fmtCur(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <UCard>
      <div class="text-xs text-muted">Показы</div>
      <div class="mt-0.5 text-xl font-semibold">{{ fmt(totalImpressions) }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">Клики</div>
      <div class="mt-0.5 text-xl font-semibold">{{ fmt(totalClicks) }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">Охват</div>
      <div class="mt-0.5 text-xl font-semibold">{{ totalReach != null ? fmt(totalReach) : '—' }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">Расход без НДС</div>
      <div class="mt-0.5 text-xl font-semibold">{{ fmtCur(spendNoVat) }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">CTR</div>
      <div class="mt-0.5 text-xl font-semibold">{{ ctr != null ? `${ctr}%` : '—' }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">CPC</div>
      <div class="mt-0.5 text-xl font-semibold">{{ cpc != null ? fmtCur(cpc) : '—' }}</div>
    </UCard>

    <UCard>
      <div class="text-xs text-muted">CPM</div>
      <div class="mt-0.5 text-xl font-semibold">{{ cpm != null ? fmtCur(cpm) : '—' }}</div>
    </UCard>

    <!-- Product-only -->
    <UCard v-if="promotionType === 'product'">
      <div class="text-xs text-muted">ДРР</div>
      <div class="mt-0.5 text-xl font-semibold">{{ drr != null ? `${drr}%` : '—' }}</div>
    </UCard>

    <UCard v-if="promotionType === 'product'">
      <div class="text-xs text-muted">Заказы</div>
      <div class="mt-0.5 text-xl font-semibold">{{ totalLeads != null ? fmt(totalLeads) : '—' }}</div>
    </UCard>

    <UCard v-if="promotionType === 'product'">
      <div class="text-xs text-muted">Выручка без НДС</div>
      <div class="mt-0.5 text-xl font-semibold">{{ fmtCur(revenueNoVat) }}</div>
    </UCard>
  </div>
</template>
