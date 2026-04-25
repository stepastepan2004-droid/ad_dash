<script setup lang="ts">
const ALL = '__all__'

interface RankItem {
  campaignName: string
  platform: string
  value: number
  spend: number
  clicks: number
  impressions: number
}

const props = defineProps<{
  data: { top: RankItem[], bottom: RankItem[] } | null
  metric: string
  promotionType: 'product' | 'media'
}>()

const emit = defineEmits<{
  'update:metric': [value: string]
}>()

const metricOptions = computed(() => {
  const base = [
    { label: 'CTR', value: 'ctr' },
    { label: 'CPC', value: 'cpc' },
    { label: 'Расход', value: 'spend' },
    { label: 'Клики', value: 'clicks' },
  ]
  if (props.promotionType === 'product') {
    base.push({ label: 'ДРР', value: 'drr' })
  }
  return base
})

function formatValue(value: number, metric: string) {
  if (metric === 'ctr' || metric === 'drr') return `${value.toFixed(2)}%`
  if (metric === 'cpc' || metric === 'spend') return value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
  return value.toLocaleString('ru-RU')
}

function truncate(s: string, max = 30) {
  return s.length > max ? s.slice(0, max) + '…' : s
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Рейтинг кампаний</h3>
        <USelectMenu
          :model-value="metric"
          :items="metricOptions"
          value-key="value"
          class="w-32"
          :search-input="false"
          @update:model-value="emit('update:metric', $event)"
        />
      </div>
    </template>

    <div v-if="!data || (data.top.length === 0 && data.bottom.length === 0)" class="flex h-32 items-center justify-center text-dimmed">
      Нет данных
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <!-- Top -->
      <div>
        <p class="mb-2 text-xs font-medium text-emerald-400">▲ Лучшие</p>
        <div class="space-y-1.5">
          <div
            v-for="(item, i) in data.top"
            :key="`top-${i}`"
            class="flex items-center justify-between rounded bg-emerald-500/10 px-3 py-1.5 text-sm"
          >
            <span class="truncate text-toned" :title="item.campaignName">
              {{ truncate(item.campaignName) }}
            </span>
            <span class="ml-2 shrink-0 font-medium text-emerald-400">
              {{ formatValue(item.value, metric) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Bottom -->
      <div>
        <p class="mb-2 text-xs font-medium text-red-400">▼ Худшие</p>
        <div class="space-y-1.5">
          <div
            v-for="(item, i) in data.bottom"
            :key="`bottom-${i}`"
            class="flex items-center justify-between rounded bg-red-500/10 px-3 py-1.5 text-sm"
          >
            <span class="truncate text-toned" :title="item.campaignName">
              {{ truncate(item.campaignName) }}
            </span>
            <span class="ml-2 shrink-0 font-medium text-red-400">
              {{ formatValue(item.value, metric) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
