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
  rawInput?: string
  createdAt?: string
  updatedAt?: string
}

interface BreakdownItem {
  category: string
  total: number
}

const categories = ref<string[]>([])
const transactions = ref<TransactionItem[]>([])
const categoryBreakdown = ref<BreakdownItem[]>([])
const currentMonthTotal = ref(0)
const summaryMonth = ref<string | null>(null)
const sheetUrl = ref<string | null>(null)
const statusMessage = ref('')
const statusError = ref(false)

const quickProcessing = ref(false)
const quickProcessingText = ref('')
const quickResultMessage = ref('')
const quickResultError = ref(false)
const quickShowUndo = ref(false)
const lastQuickId = ref<string | null>(null)
const lastQuickSummary = ref('')

const manualEntryRef = ref<InstanceType<typeof ManualEntry> | null>(null)

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

function setStatus(message: string, isError = false) {
  statusMessage.value = message
  statusError.value = isError
}

async function fetchCategories() {
  const data = await $fetch<{ categories: string[] }>('/api/categories')
  categories.value = data.categories || []
}

async function loadTransactions() {
  const data = await $fetch<{ transactions: TransactionItem[] }>('/api/transactions')
  transactions.value = data.transactions || []
}

async function loadSummary() {
  const data = await $fetch<{
    month: string
    currentMonthTotal: number
    categoryBreakdown: BreakdownItem[]
  }>('/api/summary')
  currentMonthTotal.value = Number(data.currentMonthTotal) || 0
  categoryBreakdown.value = data.categoryBreakdown || []
  summaryMonth.value = data.month || null
}

async function loadSheetUrl() {
  try {
    const data = await $fetch<{ url: string | null }>('/api/sheet-url')
    sheetUrl.value = data.url || null
  } catch {
    // ignore
  }
}

async function refreshData() {
  await Promise.all([loadTransactions(), loadSummary()])
}

async function onQuickAdd(text: string) {
  quickProcessing.value = true
  quickProcessingText.value = `Classifying "${text}"...`
  quickResultMessage.value = ''
  quickShowUndo.value = false

  try {
    const parsed = await $fetch<any>('/api/nl/parse', {
      method: 'POST',
      body: { text },
    })

    const payload = {
      ...(parsed.transaction || {}),
      source: 'nl',
      rawInput: text,
      quickAddMeta: {
        ...(parsed.meta || {}),
        originalText: text,
        merchant: parsed.transaction?.merchant,
      },
    }

    const createdRes = await $fetch<{ transaction: TransactionItem }>('/api/transactions', {
      method: 'POST',
      body: payload,
    })

    const created = createdRes.transaction
    lastQuickId.value = created?.id || null
    lastQuickSummary.value = `${formatMoney(created?.amount, created?.currency)} \u00B7 ${created?.merchant || 'Unknown'}`

    quickShowUndo.value = true
    quickResultMessage.value = `Logged ${formatMoney(created?.amount, created?.currency)} \u00B7 ${created?.merchant || 'Unknown'}`
    quickResultError.value = false
    await refreshData()
  } catch (error: any) {
    const msg = error?.data?.data?.error || error?.message || 'Quick add failed'
    quickResultMessage.value = msg
    quickResultError.value = true
    setStatus(msg, true)
  } finally {
    quickProcessing.value = false
    quickProcessingText.value = ''
  }
}

async function onQuickUndo() {
  if (!lastQuickId.value) return

  try {
    await $fetch(`/api/transactions/${lastQuickId.value}`, { method: 'DELETE' })
    quickResultMessage.value = `Undid ${lastQuickSummary.value}`
    quickResultError.value = false
    lastQuickId.value = null
    quickShowUndo.value = false
    await refreshData()
  } catch (error: any) {
    quickResultMessage.value = error?.data?.data?.error || error?.message || 'Undo failed'
    quickResultError.value = true
  }
}

async function onManualSave(payload: Record<string, any>) {
  try {
    await $fetch('/api/transactions', {
      method: 'POST',
      body: payload,
    })
    setStatus('Transaction saved')
    await refreshData()
  } catch (error: any) {
    setStatus(error?.data?.data?.error || error?.message || 'Save failed', true)
  }
}

async function onManualUpdate(id: string, payload: Record<string, any>) {
  try {
    await $fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      body: payload,
    })
    setStatus('Transaction updated')
    await refreshData()
  } catch (error: any) {
    setStatus(error?.data?.data?.error || error?.message || 'Update failed', true)
  }
}

function onEdit(id: string) {
  const tx = transactions.value.find((t) => t.id === id)
  if (!tx) return
  manualEntryRef.value?.startEdit(tx)
}

async function onDelete(id: string) {
  try {
    await $fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    setStatus('Transaction deleted')
    await refreshData()
  } catch (error: any) {
    setStatus(error?.data?.data?.error || error?.message || 'Delete failed', true)
  }
}

onMounted(async () => {
  try {
    await fetchCategories()
    await Promise.all([refreshData(), loadSheetUrl()])
    setStatus('Ready')
  } catch (error: any) {
    setStatus(error?.message || 'Failed to initialize', true)
  }
})
</script>

<template>
  <main class="app-shell">
    <TopBar @quick-add="onQuickAdd" />

    <QuickFeedback
      :processing="quickProcessing"
      :processing-text="quickProcessingText"
      :result-message="quickResultMessage"
      :result-error="quickResultError"
      :show-undo="quickShowUndo"
      @undo="onQuickUndo"
    />

    <SummaryBar
      :current-month-total="currentMonthTotal"
      :summary-month="summaryMonth"
    />

    <div class="dashboard">
      <TransactionList
        :transactions="transactions"
        @edit="onEdit"
        @delete="onDelete"
      />

      <aside class="sidebar">
        <CategoryBreakdown :items="categoryBreakdown" />

        <ManualEntry
          ref="manualEntryRef"
          :categories="categories"
          @save="onManualSave"
          @update="onManualUpdate"
        />

        <SheetLink :url="sheetUrl" />
      </aside>
    </div>

    <p class="status" :class="{ error: statusError }">{{ statusMessage }}</p>
  </main>
</template>
