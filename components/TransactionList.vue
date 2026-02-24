<script setup lang="ts">
interface TransactionItem {
  id: string
  date: string
  amount: number
  currency: string
  merchant: string
  category: string
  account: string
  note: string
  source: string
  createdAt?: string
  updatedAt?: string
}

const props = defineProps<{
  transactions: TransactionItem[]
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
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

function formatMoney(amount: number, currency = 'PHP') {
  const value = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency || 'PHP',
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency || 'PHP'} ${value.toFixed(2)}`
  }
}

function formatRelativeTime(tx: TransactionItem) {
  const source = tx.createdAt || tx.updatedAt || tx.date
  if (!source) return ''

  const date = new Date(source)
  if (Number.isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(source))) {
      return formatShortDate(source)
    }
    return ''
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hr ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return formatShortDate(date)
}

function formatShortDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(date)
}

function onDelete(id: string) {
  if (window.confirm('Delete this transaction?')) {
    emit('delete', id)
  }
}
</script>

<template>
  <section class="panel panel--transactions">
    <div class="panel-header">
      <h2 class="panel-title">Transactions</h2>
      <span class="panel-count">{{ transactions.length }}</span>
    </div>
    <ul class="tx-list">
      <li v-if="!transactions.length" class="empty">No transactions yet</li>
      <li
        v-for="tx in transactions"
        :key="tx.id"
        class="tx-item"
      >
        <div
          class="tx-icon"
          :style="{ background: themeForCategory(tx.category).color + '18' }"
        >{{ themeForCategory(tx.category).icon }}</div>
        <div class="tx-main">
          <p class="tx-merchant">{{ tx.merchant || 'Unknown' }}</p>
          <div class="tx-meta">
            <span class="tx-time">{{ formatRelativeTime(tx) }}</span>
            <span
              class="tx-category-tag"
              :style="{ color: themeForCategory(tx.category).color, background: themeForCategory(tx.category).color + '14' }"
            >{{ tx.category || 'Miscellaneous' }}</span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount">-{{ formatMoney(tx.amount, tx.currency) }}</span>
          <div class="tx-actions">
            <button type="button" @click="emit('edit', tx.id)">Edit</button>
            <button type="button" @click="onDelete(tx.id)">Del</button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
