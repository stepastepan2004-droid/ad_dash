<script setup lang="ts">
const props = defineProps<{
  promotionType: 'product' | 'media'
  label: string
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const toast = useToast()
const uploading = ref(false)
const dragOver = ref(false)

async function uploadFile(file: File) {
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    toast.add({ title: 'Ошибка', description: 'Поддерживается только .xlsx / .xls', color: 'error' })
    return
  }

  uploading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await $fetch<{ success: boolean, message?: string, error?: string, rowCount?: number }>(
      `/api/upload?promotionType=${props.promotionType}`,
      { method: 'POST', body: formData },
    )

    if (res.success) {
      toast.add({ title: 'Успешно', description: res.message || `Загружено ${res.rowCount} строк`, color: 'success' })
      emit('uploaded')
    }
    else {
      toast.add({ title: 'Ошибка', description: res.error || 'Неизвестная ошибка', color: 'error' })
    }
  }
  catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Ошибка загрузки'
    toast.add({ title: 'Ошибка', description: message, color: 'error' })
  }
  finally {
    uploading.value = false
  }
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    uploadFile(input.files[0])
    input.value = ''
  }
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) uploadFile(file)
}
</script>

<template>
  <div
    class="relative rounded-lg border-2 border-dashed p-4 text-center transition-colors"
    :class="dragOver ? 'border-primary bg-primary/5' : 'border-default dark:border-accented'"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <div v-if="uploading" class="flex items-center justify-center gap-2">
      <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
      <span class="text-sm text-muted">Загрузка...</span>
    </div>

    <div v-else class="flex items-center justify-center gap-3">
      <UIcon name="i-lucide-upload" class="size-5 text-dimmed" />
      <span class="text-sm text-muted">{{ label }}</span>
      <label>
        <UButton color="primary" variant="soft" as="span" size="xs" class="cursor-pointer">
          Файл
        </UButton>
        <input type="file" accept=".xlsx,.xls" class="hidden" @change="onFileSelect">
      </label>
    </div>
  </div>
</template>
