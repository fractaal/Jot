<script setup lang="ts">
const MONTHLY_BUDGET = 15000

const props = defineProps<{
  currentMonthTotal: number
  summaryMonth: string | null
}>()

const formatPhp = (amount: number) => {
  const value = Number(amount) || 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

const monthLabel = computed(() => {
  const month = props.summaryMonth
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return 'THIS MONTH'
  const [year, monthNum] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNum - 1, 1))
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(date).toUpperCase()
})

const budgetLeft = computed(() => MONTHLY_BUDGET - props.currentMonthTotal)
const ringPercent = computed(() => Math.round((props.currentMonthTotal / MONTHLY_BUDGET) * 100))
const isOverBudget = computed(() => budgetLeft.value < 0)
</script>

<template>
  <section class="summary-bar">
    <div class="summary-cell summary-cell--primary">
      <span class="summary-micro">SPENT</span>
      <span class="summary-value">{{ formatPhp(currentMonthTotal) }}</span>
    </div>
    <div class="summary-cell">
      <span class="summary-micro">LEFT</span>
      <span class="summary-value" :style="{ color: isOverBudget ? 'var(--danger)' : '' }">{{ formatPhp(Math.abs(budgetLeft)) }}</span>
    </div>
    <div class="summary-cell">
      <span class="summary-micro">BUDGET</span>
      <span class="summary-value">{{ formatPhp(MONTHLY_BUDGET) }}</span>
    </div>
    <div class="summary-cell">
      <span class="summary-micro">{{ monthLabel }}</span>
      <span class="summary-value summary-value--accent" :style="{ color: ringPercent > 100 ? 'var(--danger)' : '' }">{{ ringPercent }}%</span>
    </div>
  </section>
</template>
