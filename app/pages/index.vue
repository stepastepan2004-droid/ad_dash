<script setup lang="ts">
const {
  filters, summary, byPeriod,
  isLoading, refreshAll,
} = useCampaigns()

const toast = useToast()
const refreshing = ref(false)
const clearing = ref(false)
const showClearConfirm = ref(false)

async function onRefresh() {
  refreshing.value = true
  await refreshAll()
  refreshing.value = false
}

async function onUploaded() {
  await refreshAll()
}

async function onClearConfirmed() {
  showClearConfirm.value = false
  clearing.value = true
  try {
    await $fetch(`/api/campaigns?promotionType=${filters.promotionType}`, { method: 'DELETE' })
    const label = filters.promotionType === 'product' ? 'товарного' : 'медийного'
    toast.add({ title: 'Готово', description: `Данные ${label} продвижения удалены`, color: 'success' })
    await refreshAll()
  }
  catch {
    toast.add({ title: 'Ошибка', description: 'Не удалось очистить данные', color: 'error' })
  }
  finally {
    clearing.value = false
  }
}

const hasData = computed(() => (byPeriod.value?.length ?? 0) > 0)
const promotionLabel = computed(() => filters.promotionType === 'product' ? 'товарного' : 'медийного')

const tabs = [
  { label: 'Товарное', value: 'product' as const, icon: 'i-lucide-shopping-cart' },
  { label: 'Медийное', value: 'media' as const, icon: 'i-lucide-megaphone' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Рекламные кампании</h1>
      <div class="flex items-center gap-2">
        <UButton
          v-if="hasData"
          icon="i-lucide-trash-2"
          :loading="clearing"
          variant="soft"
          color="error"
          @click="showClearConfirm = true"
        >
          Очистить
        </UButton>
        <UButton icon="i-lucide-refresh-cw" :loading="refreshing" variant="soft" @click="onRefresh">
          Обновить
        </UButton>
        <UColorModeButton />
      </div>
    </div>

    <!-- Promotion type tabs -->
    <div class="mb-6 flex gap-2">
      <UButton
        v-for="tab in tabs" :key="tab.value"
        :icon="tab.icon"
        :variant="filters.promotionType === tab.value ? 'solid' : 'soft'"
        :color="filters.promotionType === tab.value ? 'primary' : 'neutral'"
        @click="filters.promotionType = tab.value"
      >
        {{ tab.label }}
      </UButton>
    </div>

    <!-- Upload zone — single Ozon button per tab -->
    <div class="mb-8">
      <FileUpload
        v-if="filters.promotionType === 'product'"
        promotion-type="product"
        label="Загрузить Ozon товарное"
        @uploaded="onUploaded"
      />
      <FileUpload
        v-else
        promotion-type="media"
        label="Загрузить Ozon медийное"
        @uploaded="onUploaded"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!hasData" class="py-16 text-center text-dimmed">
      <UIcon name="i-lucide-bar-chart-3" class="mx-auto mb-4 size-16" />
      <p>Загрузите Excel-файл, чтобы увидеть дашборд</p>
    </div>

    <!-- Dashboard -->
    <template v-else>
      <div v-if="isLoading" class="mb-4 flex items-center gap-2 text-sm text-dimmed">
        <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
        Загрузка данных...
      </div>

      <!-- Date filter only -->
      <div class="mb-6">
        <DashboardFilters
          :model-value="filters"
          @update:model-value="Object.assign(filters, $event)"
        />
      </div>

      <!-- Summary metrics -->
      <div class="mb-6">
        <MetricsCards
          v-if="summary"
          :promotion-type="filters.promotionType"
          :total-impressions="summary.totalImpressions"
          :total-clicks="summary.totalClicks"
          :total-spend="summary.totalSpend"
          :total-reach="summary.totalReach"
          :total-leads="summary.totalLeads"
          :total-revenue="summary.totalRevenue"
        />
      </div>

      <!-- Main chart — daily dynamics only -->
      <div class="mb-6">
        <TimeChart
          :data="byPeriod ?? []"
          :promotion-type="filters.promotionType"
        />
      </div>
    </template>

    <!-- Delete modal -->
    <UModal v-model:open="showClearConfirm" :title="`Удалить данные ${promotionLabel} продвижения?`" description="Это действие необратимо.">
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="soft" @click="showClearConfirm = false">Отмена</UButton>
          <UButton color="error" @click="onClearConfirmed">Удалить</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
