<script setup lang="ts">
const props = defineProps<{
  open: boolean
  currentPlan: { budgetPlan: number, impressionsPlan: number, clicksPlan: number, reachPlan: number } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [plan: { budgetPlan: number, impressionsPlan: number, clicksPlan: number, reachPlan: number }]
}>()

const form = reactive({
  budgetPlan: 0,
  impressionsPlan: 0,
  clicksPlan: 0,
  reachPlan: 0,
})

watch(() => props.open, (v) => {
  if (v && props.currentPlan) {
    Object.assign(form, props.currentPlan)
  }
})

function onSave() {
  emit('save', { ...form })
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" title="Настройка плана" @update:open="emit('update:open', $event)">
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-dimmed">Бюджет (без НДС, ₽)</label>
          <input v-model.number="form.budgetPlan" type="number" class="h-9 w-full rounded-md border border-accented bg-transparent px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary">
        </div>
        <div>
          <label class="mb-1 block text-sm text-dimmed">Показы (план)</label>
          <input v-model.number="form.impressionsPlan" type="number" class="h-9 w-full rounded-md border border-accented bg-transparent px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary">
        </div>
        <div>
          <label class="mb-1 block text-sm text-dimmed">Клики (план)</label>
          <input v-model.number="form.clicksPlan" type="number" class="h-9 w-full rounded-md border border-accented bg-transparent px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary">
        </div>
        <div>
          <label class="mb-1 block text-sm text-dimmed">Охват (план)</label>
          <input v-model.number="form.reachPlan" type="number" class="h-9 w-full rounded-md border border-accented bg-transparent px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary">
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="soft" @click="emit('update:open', false)">Отмена</UButton>
        <UButton @click="onSave">Сохранить</UButton>
      </div>
    </template>
  </UModal>
</template>
