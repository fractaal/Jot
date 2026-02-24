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
}

const props = defineProps<{
  categories: string[]
}>()

const emit = defineEmits<{
  save: [payload: Record<string, any>]
  update: [id: string, payload: Record<string, any>]
}>()

const isOpen = ref(false)
const isEditing = ref(false)
const editId = ref('')

const form = reactive({
  date: formatDateForManila(),
  amount: '' as string | number,
  currency: 'PHP',
  category: '',
  account: 'General',
  merchant: '',
  note: '',
})

watch(() => props.categories, (cats) => {
  if (cats.length && !form.category) {
    form.category = cats[0]
  }
}, { immediate: true })

function formatDateForManila() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date())
}

function resetForm() {
  isEditing.value = false
  editId.value = ''
  form.date = formatDateForManila()
  form.amount = ''
  form.currency = 'PHP'
  form.category = props.categories[0] || ''
  form.account = 'General'
  form.merchant = ''
  form.note = ''
}

function startEdit(tx: TransactionItem) {
  isOpen.value = true
  isEditing.value = true
  editId.value = tx.id
  form.date = tx.date
  form.amount = tx.amount
  form.currency = tx.currency || 'PHP'
  form.category = tx.category
  form.account = tx.account || 'General'
  form.merchant = tx.merchant
  form.note = tx.note || ''
}

function onSubmit() {
  const payload: Record<string, any> = {
    date: form.date,
    amount: Number(form.amount),
    currency: form.currency,
    category: form.category,
    account: form.account,
    merchant: form.merchant,
    note: form.note,
    source: 'manual',
  }

  if (isEditing.value && editId.value) {
    emit('update', editId.value, payload)
  } else {
    emit('save', payload)
  }

  resetForm()
}

function onCancel() {
  resetForm()
}

defineExpose({ startEdit })
</script>

<template>
  <section class="panel panel--manual">
    <button
      class="manual-toggle-btn"
      :class="{ open: isOpen }"
      @click="isOpen = !isOpen"
    >
      <span class="panel-title">Manual Entry</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <template v-if="isOpen">
      <h3 class="manual-title">{{ isEditing ? 'Edit transaction' : 'Add transaction' }}</h3>
      <form class="manual-form" @submit.prevent="onSubmit">
        <label>
          <span class="field-label">Date</span>
          <input v-model="form.date" type="date" required />
        </label>

        <label>
          <span class="field-label">Amount</span>
          <input v-model="form.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
        </label>

        <label>
          <span class="field-label">Currency</span>
          <input v-model="form.currency" type="text" required />
        </label>

        <label>
          <span class="field-label">Category</span>
          <select v-model="form.category" required>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </label>

        <label>
          <span class="field-label">Account</span>
          <input v-model="form.account" type="text" required />
        </label>

        <label class="full">
          <span class="field-label">Merchant</span>
          <input v-model="form.merchant" type="text" placeholder="Store name" required />
        </label>

        <label class="full">
          <span class="field-label">Note</span>
          <input v-model="form.note" type="text" placeholder="Optional" />
        </label>

        <div class="manual-actions">
          <button type="submit">{{ isEditing ? 'Update' : 'Save' }}</button>
          <button v-if="isEditing" type="button" class="btn-ghost" @click="onCancel">Cancel</button>
        </div>
      </form>
    </template>
  </section>
</template>
