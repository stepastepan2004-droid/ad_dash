<script setup lang="ts">
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'

const VAT = 1.22

interface PeriodData {
  period: string
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  totalReach: number
  totalLeads: number
  totalRevenue: number
}

const props = defineProps<{
  data: PeriodData[]
  promotionType: 'product' | 'media'
}>()

const selectedMetric = ref('spend')

const metricOptions = computed(() => {
  const base = [
    { label: 'Расход без НДС', value: 'spend' },
    { label: 'Показы', value: 'impressions' },
    { label: 'Клики', value: 'clicks' },
    { label: 'Охват', value: 'reach' },
    { label: 'CTR (%)', value: 'ctr' },
    { label: 'CPC (₽)', value: 'cpc' },
    { label: 'CPM (₽)', value: 'cpm' },
  ]
  if (props.promotionType === 'product') {
    base.push(
      { label: 'ДРР (%)', value: 'drr' },
      { label: 'Заказы', value: 'orders' },
      { label: 'Выручка без НДС', value: 'revenue' },
    )
  }
  return base
})

function getMetricValue(d: PeriodData, metric: string): number {
  switch (metric) {
    case 'spend': return d.totalSpend / VAT
    case 'impressions': return d.totalImpressions
    case 'clicks': return d.totalClicks
    case 'reach': return d.totalReach
    case 'ctr': return d.totalImpressions > 0 ? (d.totalClicks / d.totalImpressions) * 100 : 0
    case 'cpc': return d.totalClicks > 0 ? (d.totalSpend / VAT) / d.totalClicks : 0
    case 'cpm': return d.totalImpressions > 0 ? (d.totalSpend / VAT) / d.totalImpressions * 1000 : 0
    case 'drr': return (d.totalRevenue / VAT) > 0 ? (d.totalSpend / VAT) / (d.totalRevenue / VAT) * 100 : 0
    case 'orders': return d.totalLeads
    case 'revenue': return d.totalRevenue / VAT
    default: return 0
  }
}

function getMetricLabel(metric: string): string {
  return metricOptions.value.find(o => o.value === metric)?.label ?? metric
}

const x = (_: unknown, i: number) => i
const y = (d: PeriodData) => getMetricValue(d, selectedMetric.value)

function formatDate(period: string) {
  if (period.length === 10) {
    const [, m, d] = period.split('-')
    return `${d}.${m}`
  }
  if (period.length === 7) {
    const [y, m] = period.split('-')
    return `${m}.${y}`
  }
  return period
}

const tickFormat = (i: number) => formatDate(props.data[i]?.period ?? '')

function formatValue(v: number): string {
  const m = selectedMetric.value
  if (m === 'ctr' || m === 'drr') return `${v.toFixed(2)}%`
  if (m === 'spend' || m === 'cpc' || m === 'cpm' || m === 'revenue') {
    return v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
  }
  return Math.round(v).toLocaleString('ru-RU')
}

const template = (d: PeriodData) =>
  `<div class="text-sm"><strong>${d.period}</strong><br/>${getMetricLabel(selectedMetric.value)}: ${formatValue(getMetricValue(d, selectedMetric.value))}</div>`
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-semibold">Динамика</h3>
        <USelectMenu
          :model-value="selectedMetric"
          :items="metricOptions"
          value-key="value"
          class="w-48"
          :search-input="false"
          @update:model-value="selectedMetric = $event"
        />
      </div>
    </template>

    <div v-if="data.length === 0" class="flex h-64 items-center justify-center text-dimmed">
      Нет данных
    </div>

    <VisXYContainer v-else :data="data" :height="350" :padding="{ top: 10, right: 10, bottom: 60, left: 70 }">
      <VisGroupedBar :x="x" :y="[y]" color="#22d3ee" :bar-padding="0.2" :rounded-corners="3" />
      <VisAxis type="x" :tick-format="tickFormat" :num-ticks="data.length" :tick-text-angle="-45" />
      <VisAxis type="y" :label="getMetricLabel(selectedMetric)" />
      <VisCrosshair :template="template" />
      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>
