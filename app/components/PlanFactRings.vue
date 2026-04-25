<script setup lang="ts">
const VAT = 1.22

interface Plan {
  budgetPlan: number
  impressionsPlan: number
  clicksPlan: number
  reachPlan: number
}

const props = defineProps<{
  plan: Plan | null
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalReach: number | null
}>()

const emit = defineEmits<{
  editPlan: []
}>()

function pct(fact: number, plan: number) {
  if (!plan) return 0
  return Math.min(100, Math.round((fact / plan) * 100))
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс`
  return n.toLocaleString('ru-RU')
}

function fmtCur(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`
  return `${n.toLocaleString('ru-RU')} ₽`
}

// SVG ring params
const size = 100
const stroke = 8
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

function dashOffset(percent: number) {
  return circumference * (1 - percent / 100)
}

const spendFact = computed(() => props.totalSpend / VAT)

const rings = computed(() => {
  if (!props.plan) return []
  return [
    {
      label: 'Бюджет',
      fact: spendFact.value,
      plan: props.plan.budgetPlan,
      pct: pct(spendFact.value, props.plan.budgetPlan),
      factLabel: fmtCur(spendFact.value),
      planLabel: fmtCur(props.plan.budgetPlan),
      color: '#22d3ee',
    },
    {
      label: 'Показы',
      fact: props.totalImpressions,
      plan: props.plan.impressionsPlan,
      pct: pct(props.totalImpressions, props.plan.impressionsPlan),
      factLabel: fmt(props.totalImpressions),
      planLabel: fmt(props.plan.impressionsPlan),
      color: '#a78bfa',
    },
    {
      label: 'Клики',
      fact: props.totalClicks,
      plan: props.plan.clicksPlan,
      pct: pct(props.totalClicks, props.plan.clicksPlan),
      factLabel: fmt(props.totalClicks),
      planLabel: fmt(props.plan.clicksPlan),
      color: '#f472b6',
    },
    {
      label: 'Охват',
      fact: props.totalReach ?? 0,
      plan: props.plan.reachPlan,
      pct: pct(props.totalReach ?? 0, props.plan.reachPlan),
      factLabel: fmt(props.totalReach ?? 0),
      planLabel: fmt(props.plan.reachPlan),
      color: '#34d399',
    },
  ]
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">План / Факт</h3>
        <UButton size="xs" variant="soft" icon="i-lucide-settings" @click="emit('editPlan')">
          Настроить план
        </UButton>
      </div>
    </template>

    <div v-if="!plan" class="flex h-32 flex-col items-center justify-center gap-2 text-dimmed">
      <p class="text-sm">Задайте плановые значения</p>
      <UButton size="sm" variant="soft" @click="emit('editPlan')">Настроить</UButton>
    </div>

    <div v-else class="grid grid-cols-2 gap-6 lg:grid-cols-4">
      <div v-for="ring in rings" :key="ring.label" class="flex flex-col items-center">
        <!-- SVG ring -->
        <svg :width="size" :height="size" class="mb-2">
          <!-- Background circle -->
          <circle
            :cx="size / 2" :cy="size / 2" :r="radius"
            fill="none" :stroke="ring.color" stroke-opacity="0.15" :stroke-width="stroke"
          />
          <!-- Progress arc -->
          <circle
            :cx="size / 2" :cy="size / 2" :r="radius"
            fill="none" :stroke="ring.color" :stroke-width="stroke"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset(ring.pct)"
            transform="rotate(-90 50 50)"
            class="transition-all duration-500"
          />
          <!-- Center text -->
          <text :x="size / 2" :y="size / 2" text-anchor="middle" dominant-baseline="central" class="fill-white text-lg font-bold">
            {{ ring.pct }}%
          </text>
        </svg>
        <div class="text-center">
          <div class="text-xs font-medium text-dimmed">{{ ring.label }}</div>
          <div class="text-sm font-semibold">{{ ring.factLabel }}</div>
          <div class="text-xs text-muted">из {{ ring.planLabel }}</div>
        </div>
      </div>
    </div>
  </UCard>
</template>
