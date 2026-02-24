<script setup lang="ts">
const emit = defineEmits<{
  quickAdd: [text: string]
}>()

const quickInput = ref('')
const submitting = ref(false)

const heroDate = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date())
})

async function onSubmit() {
  const text = quickInput.value.trim()
  if (!text || submitting.value) return

  submitting.value = true
  emit('quickAdd', text)
  quickInput.value = ''
  submitting.value = false
}

defineExpose({ submitting })
</script>

<template>
  <header class="topbar">
    <div class="topbar-brand">
      <h1 class="topbar-title">Jot</h1>
      <span class="topbar-date">{{ heroDate }}</span>
    </div>
    <form class="hero-form" @submit.prevent="onSubmit">
      <div class="hero-input-wrap">
        <svg class="hero-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <input
          v-model="quickInput"
          type="text"
          placeholder="grabbed coffee 180"
          autocomplete="off"
          required
        />
        <button type="submit" class="hero-submit" aria-label="Log expense" :disabled="submitting">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </form>
  </header>
</template>
