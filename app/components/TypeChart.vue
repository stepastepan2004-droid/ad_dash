<script setup lang="ts">
import { VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'

const props = defineProps<{
  data: { campaignType: string, totalSpend: number, totalClicks: number }[]
}>()

const x = (_: unknown, i: number) => i
const y = (d: { totalSpend: number }) => d.totalSpend

const tickFormat = (i: number) => props.data[i]?.campaignType ?? ''
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold">По типам кампаний</h3>
    </template>

    <div v-if="data.length === 0" class="flex h-48 items-center justify-center text-dimmed">
      Нет данных
    </div>

    <VisXYContainer v-else :data="data" :height="300" :padding="{ top: 10, right: 10, bottom: 30, left: 60 }">
      <VisGroupedBar :x="x" :y="[y]" color="#a78bfa" :bar-padding="0.3" :rounded-corners="4" />
      <VisAxis type="x" :tick-format="tickFormat" />
      <VisAxis type="y" label="Расход (₽)" />
      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>
