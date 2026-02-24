const MONTHLY_BUDGET = 15000;

const CATEGORY_THEME = {
  'food & dining': { color: '#FF6B4A', icon: '🍜' },
  food: { color: '#FF6B4A', icon: '🍜' },
  transportation: { color: '#4AADFF', icon: '🚌' },
  shopping: { color: '#C77DFF', icon: '🛍' },
  utilities: { color: '#FFD93D', icon: '⚡' },
  entertainment: { color: '#6BCB77', icon: '🎮' },
  groceries: { color: '#FF8FA3', icon: '🛒' },
  health: { color: '#8DD3C7', icon: '💊' },
  travel: { color: '#7EC8E3', icon: '✈️' },
  'bills & fees': { color: '#FFC857', icon: '🧾' },
  'personal care': { color: '#F4A7B9', icon: '🧴' },
  income: { color: '#6BCB77', icon: '💸' },
  transfer: { color: '#9BA3AF', icon: '↔️' },
  miscellaneous: { color: '#9BA3AF', icon: '📝' },
};

const state = {
  categories: [],
  transactions: [],
  categoryBreakdown: [],
  currentMonthTotal: 0,
  summaryMonth: null,
  lastQuick: null,
};

/* ── DOM refs ── */
const heroDateEl = document.getElementById('hero-date');
const monthLabelEl = document.getElementById('month-label');
const budgetStateEl = document.getElementById('budget-state');
const budgetLeftEl = document.getElementById('budget-left');
const monthTotalEl = document.getElementById('month-total');
const ringPercentEl = document.getElementById('ring-percent');
const txCountEl = document.getElementById('tx-count');

const quickAddForm = document.getElementById('quick-add-form');
const quickInput = document.getElementById('quick-add-input');
const quickSubmit = document.getElementById('quick-submit');
const quickUndo = document.getElementById('quick-undo');
const heroFeedback = document.getElementById('hero-feedback');
const quickProcessing = document.getElementById('quick-processing');
const quickProcessingText = document.getElementById('quick-processing-text');
const quickResult = document.getElementById('quick-result');

const transactionsList = document.getElementById('transactions-list');
const breakdownList = document.getElementById('category-breakdown');

const manualShell = document.getElementById('manual-shell');
const manualForm = document.getElementById('manual-form');
const manualTitle = document.getElementById('manual-form-title');
const manualSubmit = document.getElementById('manual-submit');
const manualCancel = document.getElementById('manual-cancel');

const sheetLink = document.getElementById('sheet-link');
const statusEl = document.getElementById('status');

boot();

async function boot() {
  try {
    setHeroDate();
    state.categories = await fetchCategories();
    hydrateCategorySelects();
    resetManualForm();

    quickAddForm.addEventListener('submit', onQuickAddSubmit);
    quickUndo.addEventListener('click', onQuickUndo);

    manualForm.addEventListener('submit', onManualSubmit);
    manualCancel.addEventListener('click', resetManualForm);

    await Promise.all([refreshData(), loadSheetUrl()]);
    setStatus('Ready');
  } catch (error) {
    setStatus(error.message, true);
  }
}

function setHeroDate() {
  const now = new Date();
  heroDateEl.textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(now);
}

async function loadSheetUrl() {
  try {
    const res = await fetch('/api/sheet-url');
    if (!res.ok) return;
    const body = await res.json();
    if (body.url) {
      sheetLink.href = body.url;
      sheetLink.classList.remove('hidden');
    }
  } catch (_e) {
    /* ignore — link stays hidden */
  }
}

async function refreshData() {
  await Promise.all([loadTransactions(), loadSummary()]);
}

async function fetchCategories() {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to load categories');
  const body = await response.json();
  return body.categories || [];
}

function hydrateCategorySelects() {
  const selects = document.querySelectorAll('select[name="category"]');
  selects.forEach((select) => {
    select.innerHTML = '';
    state.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  });
}

async function loadTransactions() {
  const response = await fetch('/api/transactions');
  if (!response.ok) throw new Error('Failed to load transactions');

  const body = await response.json();
  state.transactions = body.transactions || [];
  renderTransactions();
}

async function loadSummary() {
  const response = await fetch('/api/summary');
  if (!response.ok) throw new Error('Failed to load summary');

  const body = await response.json();
  state.currentMonthTotal = Number(body.currentMonthTotal) || 0;
  state.categoryBreakdown = body.categoryBreakdown || [];
  state.summaryMonth = body.month || null;

  monthTotalEl.textContent = formatPhp(state.currentMonthTotal);
  monthLabelEl.textContent = formatMonthLabel(state.summaryMonth).toUpperCase();

  const left = MONTHLY_BUDGET - state.currentMonthTotal;
  budgetLeftEl.textContent = formatPhp(Math.abs(left));
  if (left < 0) budgetLeftEl.style.color = 'var(--danger)';
  else budgetLeftEl.style.color = '';

  budgetStateEl.textContent = formatPhp(MONTHLY_BUDGET);

  renderRing(state.currentMonthTotal, MONTHLY_BUDGET);
  renderBreakdown(state.categoryBreakdown);
}

function renderRing(spent, budget) {
  const ratio = budget > 0 ? spent / budget : 0;
  const percent = Math.round(ratio * 100);
  ringPercentEl.textContent = `${percent}%`;
  if (ratio > 1) ringPercentEl.style.color = 'var(--danger)';
  else ringPercentEl.style.color = '';
}

function renderTransactions() {
  transactionsList.innerHTML = '';
  txCountEl.textContent = state.transactions.length;

  if (!state.transactions.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No transactions yet';
    transactionsList.appendChild(li);
    return;
  }

  state.transactions.forEach((tx) => {
    const theme = themeForCategory(tx.category);

    const li = document.createElement('li');
    li.className = 'tx-item';

    li.innerHTML = `
      <div class="tx-icon" style="background:${theme.color}18">${theme.icon}</div>
      <div class="tx-main">
        <p class="tx-merchant">${escapeHtml(tx.merchant || 'Unknown')}</p>
        <div class="tx-meta">
          <span class="tx-time">${escapeHtml(formatRelativeTime(tx))}</span>
          <span class="tx-category-tag" style="color:${theme.color}; background:${theme.color}14">${escapeHtml(tx.category || 'Miscellaneous')}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount">-${formatMoney(tx.amount, tx.currency)}</span>
        <div class="tx-actions">
          <button type="button" data-action="edit" data-id="${tx.id}">Edit</button>
          <button type="button" data-action="delete" data-id="${tx.id}">Del</button>
        </div>
      </div>
    `;

    transactionsList.appendChild(li);
  });

  transactionsList.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => startEdit(button.dataset.id));
  });

  transactionsList.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => deleteTransaction(button.dataset.id));
  });
}

function renderBreakdown(items) {
  breakdownList.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No category data';
    breakdownList.appendChild(empty);
    return;
  }

  const max = items.reduce((highest, item) => Math.max(highest, Number(item.total) || 0), 0) || 1;

  items.forEach((item) => {
    const total = Number(item.total) || 0;
    const theme = themeForCategory(item.category);

    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <div class="breakdown-icon" style="background:${theme.color}18">${theme.icon}</div>
      <div class="breakdown-content">
        <div class="breakdown-head">
          <span>${escapeHtml(item.category || 'Miscellaneous')}</span>
          <span>${formatPhp(total)}</span>
        </div>
        <div class="breakdown-track">
          <div class="breakdown-fill" style="background:${theme.color}; width:${(total / max) * 100}%"></div>
        </div>
      </div>
    `;

    breakdownList.appendChild(row);
  });
}

async function onQuickAddSubmit(event) {
  event.preventDefault();
  const text = quickInput.value.trim();
  if (!text) return;

  quickSubmit.disabled = true;
  setQuickResult('', false, true);
  setProcessing(true, text);

  try {
    const parsed = await api('/api/nl/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    const payload = {
      ...(parsed.transaction || {}),
      source: 'nl',
      rawInput: text,
      quickAddMeta: {
        ...(parsed.meta || {}),
        originalText: text,
        merchant: parsed.transaction?.merchant,
      },
    };

    const createdRes = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const created = createdRes.transaction;
    state.lastQuick = {
      id: created?.id,
      summary: `${formatMoney(created?.amount, created?.currency)} · ${created?.merchant || 'Unknown'}`,
    };

    quickInput.value = '';
    quickUndo.classList.remove('hidden');
    setQuickResult(`Logged ${formatMoney(created?.amount, created?.currency)} · ${created?.merchant || 'Unknown'}`);
    await refreshData();
  } catch (error) {
    setQuickResult(error.message, true);
    setStatus(error.message, true);
  } finally {
    setProcessing(false);
    quickSubmit.disabled = false;
  }
}

async function onQuickUndo() {
  if (!state.lastQuick?.id) return;

  quickUndo.disabled = true;
  try {
    await api(`/api/transactions/${state.lastQuick.id}`, { method: 'DELETE' });
    setQuickResult(`Undid ${state.lastQuick.summary}`);
    state.lastQuick = null;
    quickUndo.classList.add('hidden');
    await refreshData();
  } catch (error) {
    setQuickResult(error.message, true);
  } finally {
    quickUndo.disabled = false;
  }
}

function setProcessing(enabled, text = '') {
  heroFeedback.classList.toggle('hidden', !enabled);
  quickProcessing.classList.toggle('hidden', !enabled);
  quickProcessingText.textContent = enabled ? `Classifying "${text}"...` : '';
}

function setQuickResult(message, isError = false, hidden = false) {
  heroFeedback.classList.toggle('hidden', hidden || !message);
  quickResult.classList.toggle('hidden', hidden || !message);
  quickResult.classList.toggle('error', isError);
  quickResult.textContent = message;
}

async function onManualSubmit(event) {
  event.preventDefault();
  const payload = formToPayload(manualForm);
  payload.source = 'manual';

  try {
    if (payload.id) {
      const id = payload.id;
      delete payload.id;

      await api(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setStatus('Transaction updated');
    } else {
      await api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStatus('Transaction saved');
    }

    resetManualForm();
    await refreshData();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function startEdit(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;

  manualShell.open = true;
  manualTitle.textContent = 'Edit transaction';
  manualSubmit.textContent = 'Update';
  manualCancel.classList.remove('hidden');

  manualForm.elements.id.value = tx.id;
  manualForm.elements.date.value = tx.date;
  manualForm.elements.amount.value = tx.amount;
  manualForm.elements.currency.value = tx.currency || 'PHP';
  manualForm.elements.category.value = tx.category;
  manualForm.elements.account.value = tx.account || 'General';
  manualForm.elements.merchant.value = tx.merchant;
  manualForm.elements.note.value = tx.note || '';
}

function resetManualForm() {
  manualForm.reset();
  manualTitle.textContent = 'Add transaction';
  manualSubmit.textContent = 'Save';
  manualCancel.classList.add('hidden');

  manualForm.elements.id.value = '';
  manualForm.elements.date.value = formatDateForManila();
  manualForm.elements.currency.value = 'PHP';
  manualForm.elements.account.value = 'General';
}

async function deleteTransaction(id) {
  const confirmed = window.confirm('Delete this transaction?');
  if (!confirmed) return;

  try {
    await api(`/api/transactions/${id}`, { method: 'DELETE' });
    setStatus('Transaction deleted');
    await refreshData();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function formToPayload(form) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  if (payload.amount !== undefined) {
    payload.amount = Number(payload.amount);
  }

  return payload;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = Array.isArray(body.details) ? `: ${body.details.join(', ')}` : '';
    throw new Error(`${body.error || 'Request failed'}${details}`);
  }

  return body;
}

function themeForCategory(category) {
  const key = String(category || 'miscellaneous').toLowerCase();
  return CATEGORY_THEME[key] || CATEGORY_THEME.miscellaneous;
}

function formatMonthLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return 'This month';

  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNum - 1, 1));
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(date);
}

function formatRelativeTime(tx) {
  const source = tx.createdAt || tx.updatedAt || tx.date;
  if (!source) return '';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(source))) {
      return formatShortDate(source);
    }
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatShortDate(date);
}

function formatShortDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(date);
}

function formatDateForManila() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date());
}

function formatPhp(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMoney(amount, currency = 'PHP') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency || 'PHP',
      minimumFractionDigits: 2,
    }).format(value);
  } catch (_error) {
    return `${currency || 'PHP'} ${value.toFixed(2)}`;
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
