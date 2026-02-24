<script setup lang="ts">
interface BreakdownItem {
  category: string
  total: number
}

const props = defineProps<{
  items: BreakdownItem[]
}>()

const CATEGORY_THEME: Record<string, { color: string; icon: string }> = {
  'food & dining': { color: '#FF6B4A', icon: '\u{1F35C}' },
  food: { color: '#FF6B4A', icon: '\u{1F35C}' },
  transportation: { color: '#4AADFF', icon: '\u{1F68C}' },
  shopping: { color: '#C77DFF', icon: '\u{1F6CD}' },
  utilities: { color: '#FFD93D', icon: '\u{26A1}' },
  entertainment: { color: '#6BCB77', icon: '\u{1F3AE}' },
  groceries: { color: '#FF8FA3', icon: '\u{1F6D2}' },
  health: { color: '#8DD3C7', icon: '\u{1F48A}' },
  travel: { color: '#7EC8E3', icon: '\u{2708}\u{FE0F}' },
  'bills & fees': { color: '#FFC857', icon: '\u{1F9FE}' },
  'personal care': { color: '#F4A7B9', icon: '\u{1F9F4}' },
  income: { color: '#6BCB77', icon: '\u{1F4B8}' },
  transfer: { color: '#9BA3AF', icon: '\u{2194}\u{FE0F}' },
  miscellaneous: { color: '#9BA3AF', icon: '\u{1F4DD}' },
}

function themeForCategory(category: string) {
  const key = String(category || 'miscellaneous').toLowerCase()
  return CATEGORY_THEME[key] || CATEGORY_THEME.miscellaneous
}

function formatPhp(amount: number) {
  const value = Number(amount) || 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

const maxTotal = computed(() => {
  return props.items.reduce((highest, item) => Math.max(highest, Number(item.total) || 0), 0) || 1
})
</script>

<template>
  <section class="panel panel--categories">
    <div class="panel-header">
      <h2 class="panel-title">Categories</h2>
    </div>
    <div class="breakdown-list">
      <p v-if="!items.length" class="empty">No category data</p>
      <div
        v-for="item in items"
        :key="item.category"
        class="breakdown-row"
      >
        <div
          class="breakdown-icon"
          :style="{ background: themeForCategory(item.category).color + '18' }"
        >{{ themeForCategory(item.category).icon }}</div>
        <div class="breakdown-content">
          <div class="breakdown-head">
            <span>{{ item.category || 'Miscellaneous' }}</span>
            <span>{{ formatPhp(item.total) }}</span>
          </div>
          <div class="breakdown-track">
            <div
              class="breakdown-fill"
              :style="{ background: themeForCategory(item.category).color, width: ((item.total / maxTotal) * 100) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
