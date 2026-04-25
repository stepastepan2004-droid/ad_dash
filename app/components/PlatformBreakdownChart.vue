<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisTooltip, VisCrosshair } from '@unovis/vue'

const VAT = 1.22

interface PeriodPlatform {
  period: string
  platform: string
  totalSpend: number
  totalClicks: number
  totalImpressions: number
}

const props = defineProps<{
  data: PeriodPlatform[]
}>()

// Extract unique periods and platforms
const periods = computed(() => [...new Set(props.data.map(d => d.period))].sort())
const platforms = computed(() => [...new Set(props.data.map(d => d.platform))].sort())

// Colors for platforms
const colors = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#34d399', '#38bdf8', '#fbbf24', '#f87171']

// Transform to format: [{period, platform1_spend, platform2_spend, ...}]
interface ChartRow {
  period: string
  [platform: string]: string | number
}

const chartData = computed<ChartRow[]>(() => {
  const map = new Map<string, ChartRow>()
  for (const p of periods.value) {
    const row: ChartRow = { period: p }
    for (const pl of platforms.value) row[pl] = 0
    map.set(p, row)
  }
  for (const d of props.data) {
    const row = map.get(d.period)
    if (row) row[d.platform] = d.totalSpend / VAT
  }
  return [...map.values()]
})

const x = (_: unknown, i: number) => i

const yAccessors = computed(() =>
  platforms.value.map(pl => (d: ChartRow) => (d[pl] as number) || 0),
)

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

const tickFormat = (i: number) => formatDate(chartData.value[i]?.period ?? '')

const template = (d: ChartRow) => {
  const parts = [`<div class="text-sm"><strong>${d.period}</strong>`]
  for (const pl of platforms.value) {
    const v = (d[pl] as number) || 0
    if (v > 0) {
      parts.push(`<br/>${pl}: ${v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`)
    }
  }
  parts.push('</div>')
  return parts.join('')
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">Расход по площадкам (без НДС)</h3>
    </template>

    <div v-if="data.length === 0" class="flex h-64 items-center justify-center text-dimmed">
      Нет данных
    </div>

    <template v-else>
      <!-- Legend -->
      <div class="mb-3 flex flex-wrap gap-3">
        <div v-for="(pl, i) in platforms" :key="pl" class="flex items-center gap-1.5 text-xs text-dimmed">
          <span class="inline-block size-2.5 rounded-sm" :style="{ background: colors[i % colors.length] }" />
          {{ pl }}
        </div>
      </div>

      <VisXYContainer :data="chartData" :height="300" :padding="{ top: 10, right: 10, bottom: 40, left: 70 }">
        <VisStackedBar :x="x" :y="yAccessors" :color="colors.slice(0, platforms.length)" :bar-padding="0.2" :rounded-corners="2" />
        <VisAxis type="x" :tick-format="tickFormat" :num-ticks="chartData.length" />
        <VisAxis type="y" label="Расход без НДС (₽)" />
        <VisCrosshair :template="template" />
        <VisTooltip />
      </VisXYContainer>
    </template>
  </UCard>
</template>
