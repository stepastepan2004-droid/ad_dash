<script setup lang="ts">
const props = defineProps<{
  modelValue: { periodFrom: string, periodTo: string }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
}>()

function update(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <div class="flex items-center gap-2">
      <div>
        <label class="mb-1 block text-xs text-dimmed">С</label>
        <input
          type="date"
          :value="modelValue.periodFrom"
          class="h-9 rounded-md border border-accented bg-elevated px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary"
          @input="update('periodFrom', ($event.target as HTMLInputElement).value)"
        >
        <div v-if="modelValue.periodFrom" class="mt-0.5 text-xs text-dimmed">
          {{ formatDisplay(modelValue.periodFrom) }}
        </div>
      </div>
      <div>
        <label class="mb-1 block text-xs text-dimmed">По</label>
        <input
          type="date"
          :value="modelValue.periodTo"
          class="h-9 rounded-md border border-accented bg-elevated px-3 text-sm text-highlighted outline-none focus:ring-1 focus:ring-primary"
          @input="update('periodTo', ($event.target as HTMLInputElement).value)"
        >
        <div v-if="modelValue.periodTo" class="mt-0.5 text-xs text-dimmed">
          {{ formatDisplay(modelValue.periodTo) }}
        </div>
      </div>
    </div>
  </div>
</template>
