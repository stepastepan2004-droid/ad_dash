<script setup lang="ts">
const props = defineProps<{
  data: {
    totalImpressions: number
    totalClicks: number
    totalAddToCart: number
    totalLeads: number
    totalRevenue: number
  } | null
}>()

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

function fmtCur(n: number) {
  return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
}

function pct(part: number, total: number) {
  if (!total) return '—'
  return `${(part / total * 100).toFixed(1)}%`
}

const steps = computed(() => {
  if (!props.data) return []
  const d = props.data
  return [
    { label: 'Показы', value: d.totalImpressions, formatted: fmt(d.totalImpressions), rate: null },
    { label: 'Клики', value: d.totalClicks, formatted: fmt(d.totalClicks), rate: pct(d.totalClicks, d.totalImpressions) },
    { label: 'В корзину', value: d.totalAddToCart, formatted: fmt(d.totalAddToCart), rate: pct(d.totalAddToCart, d.totalClicks) },
    { label: 'Заказы', value: d.totalLeads, formatted: fmt(d.totalLeads), rate: pct(d.totalLeads, d.totalAddToCart) },
    { label: 'Выручка', value: d.totalRevenue, formatted: fmtCur(d.totalRevenue), rate: null },
  ]
})

// Width as % of max (first step)
function barWidth(value: number) {
  if (!props.data || !props.data.totalImpressions) return '100%'
  const pct = Math.max(5, (value / props.data.totalImpressions) * 100)
  return `${pct}%`
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">Воронка конверсий</h3>
    </template>

    <div v-if="!data || data.totalImpressions === 0" class="flex h-48 items-center justify-center text-dimmed">
      Нет данных
    </div>

    <div v-else class="space-y-3">
      <div v-for="(step, i) in steps" :key="step.label" class="flex items-center gap-3">
        <div class="w-20 text-right text-sm text-dimmed">{{ step.label }}</div>
        <div class="flex-1">
          <div
            class="flex items-center justify-between rounded px-3 py-1.5 text-sm font-medium text-white"
            :class="[
              i === 0 ? 'bg-indigo-600' :
              i === 1 ? 'bg-indigo-500' :
              i === 2 ? 'bg-violet-500' :
              i === 3 ? 'bg-purple-500' :
              'bg-emerald-500',
            ]"
            :style="{ width: i === 4 ? '100%' : barWidth(step.value) }"
          >
            <span>{{ step.formatted }}</span>
            <span v-if="step.rate" class="text-xs opacity-75">{{ step.rate }}</span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
