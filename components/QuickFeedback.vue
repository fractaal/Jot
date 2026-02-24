<script setup lang="ts">
const props = defineProps<{
  processing: boolean
  processingText: string
  resultMessage: string
  resultError: boolean
  showUndo: boolean
}>()

const emit = defineEmits<{
  undo: []
}>()
</script>

<template>
  <div v-if="processing || resultMessage || showUndo" class="hero-feedback">
    <div v-if="processing" class="processing">
      <div class="spinner" />
      <p class="processing-text">{{ processingText }}</p>
    </div>
    <p v-if="resultMessage" class="quick-result" :class="{ error: resultError }">{{ resultMessage }}</p>
    <button v-if="showUndo" type="button" class="undo-btn" @click="emit('undo')">Undo</button>
  </div>
</template>
