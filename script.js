// ACCOUNTANCY SIMULATOR
// The transaction list is the single source for every table.

let transactions = [];
let elements = {};
let selectedTxnId = null;

document.addEventListener('DOMContentLoaded', startApp);

function startApp() {
  getHtmlElements();
  connectEvents();
  drawEverything();
}

// All HTML references.
function getHtmlElements() {
  elements = {
    journalBody: document.getElementById('journal-body'),
    ledgerGrid: document.getElementById('ledger-grid'),
    ledgerSection: document.getElementById('ledger-section'),
    trialBalanceBody: document.getElementById('trial-balance-body'),
    trialBalanceSection: document.getElementById('trial-balance-section'),
    activeTablesList: document.getElementById('active-tables-list'),
    toast: document.getElementById('toast'),
    clearSandboxButton: document.getElementById('clear-sandbox'),
    deleteEntryButton: document.getElementById('delete-entry'),
    postEntryButton: document.getElementById('post-entry'),
    menuToggle: document.getElementById('menu-toggle'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    gradeSelect: document.getElementById('grade-select'),
    inputDr: document.getElementById('input-dr'),
    inputCr: document.getElementById('input-cr'),
    inputAmount: document.getElementById('input-amount'),
    inputNarration: document.getElementById('input-narration')
  };
}

// USER INPUT
function connectEvents() {
  elements.postEntryButton.addEventListener('click', postEntry);
  elements.clearSandboxButton.addEventListener('click', clearSandbox);
  elements.deleteEntryButton.addEventListener('click', deleteSelectedEntry);
  elements.menuToggle.addEventListener('click', toggleSidebar);
  elements.sidebarBackdrop.addEventListener('click', closeSidebar);
  elements.gradeSelect.addEventListener('change', keepFoundationsGrade);
  elements.journalBody.addEventListener('mouseover', handleTableHover);
  elements.journalBody.addEventListener('mouseleave', clearHoverHighlights);
  elements.ledgerGrid.addEventListener('mouseover', handleTableHover);
  elements.ledgerGrid.addEventListener('mouseleave', clearHoverHighlights);
  elements.trialBalanceBody.addEventListener('mouseover', handleTableHover);
  elements.trialBalanceBody.addEventListener('mouseleave', clearHoverHighlights);
  
  // Single click handles selection and cross-table highlighting
  document.addEventListener('click', handleDocumentClick);
}

function postEntry() {
  const debitInput = elements.inputDr.value.trim();
  const creditInput = elements.inputCr.value.trim();
  const amount = Number(elements.inputAmount.value);
  const narrationInput = elements.inputNarration.value.trim();

  if (!debitInput || !creditInput || !amount || amount <= 0) {
    showToast('Please fill out Debit, Credit, and Amount correctly!');
    return;
  }

  const transaction = {
    id: 'txn-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    debitAccount: addAccountLabel(debitInput),
    creditAccount: addAccountLabel(creditInput),
    amount: amount,
    narration: addNarrationLabel(narrationInput)
  };

  transactions.push(transaction);
  clearFormInputs();
  showToast('Entry Posted & Ledgers Updated!');
  drawEverything();
}

function clearSandbox() {
  if (!transactions.length) return;

  showConfirmModal(
    'Clear Sandbox?',
    'This will erase all posted journal entries and reset all ledger accounts. Do you want to proceed?',
    function () {
      transactions = [];
      selectedTxnId = null;
      showToast('Sandbox Cleared!');
      drawEverything();
    }
  );
}

function deleteSelectedEntry() {
  if (!selectedTxnId) {
    showToast('Select an entry first.');
    return;
  }

  transactions = transactions.filter((transaction) => transaction.id !== selectedTxnId);
  selectedTxnId = null;
  clearDetailedHighlights();
  showToast('Selected entry deleted.');
  drawEverything();
}

function clearFormInputs() {
  elements.inputDr.value = '';
  elements.inputCr.value = '';
  elements.inputAmount.value = '';
  elements.inputNarration.value = '';
}

function addAccountLabel(accountName) {
  return accountName.endsWith('A/c') ? accountName : accountName + ' A/c';
}

function addNarrationLabel(narration) {
  return narration.startsWith('Being') ? narration : 'Being ' + (narration || 'transaction posted');
}

// JOURNAL BOOK
function renderJournalTable() {
  if (transactions.length === 0) {
    elements.journalBody.innerHTML = `
      <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 25px;">
        No entries posted. Fill the form above to build ledgers.
      </td></tr>`;
    return;
  }

  let rows = '';
  transactions.forEach((transaction) => {
    rows += `
      <tr class="hover-entry" data-txn-id="${transaction.id}">
        <td>${transaction.date}</td>
        <td><span class="debit-text">${transaction.debitAccount}</span><br>
          &nbsp;&nbsp;&nbsp;&nbsp;To <span class="credit-text">${transaction.creditAccount}</span><br>
          <small style="color: var(--text-muted)">(${transaction.narration})</small>
        </td>
        <td>—</td>
        <td class="num-col">${formatAmount(transaction.amount)}</td>
        <td class="num-col">${formatAmount(transaction.amount)}</td>
      </tr>`;
  });
  elements.journalBody.innerHTML = rows;
}

// LEDGER BOOK
function buildLedgerData() {
  const ledgers = {};

  transactions.forEach((transaction) => {
    createLedgerIfNeeded(ledgers, transaction.debitAccount);
    createLedgerIfNeeded(ledgers, transaction.creditAccount);

    ledgers[transaction.debitAccount].debitEntries.push({
      txnId: transaction.id, date: transaction.date,
      text: 'To ' + transaction.creditAccount, amount: transaction.amount
    });
    ledgers[transaction.creditAccount].creditEntries.push({
      txnId: transaction.id, date: transaction.date,
      text: 'By ' + transaction.debitAccount, amount: transaction.amount
    });
  });
  return ledgers;
}

function createLedgerIfNeeded(ledgers, accountName) {
  if (!ledgers[accountName]) {
    ledgers[accountName] = { debitEntries: [], creditEntries: [] };
  }
}

// FEATURE 1 IMPLEMENTATION: Attach transaction data to ALL cells (Date, Particulars, Amount) for full row hover
function renderLedgerTables(ledgers, accountNames) {
  if (accountNames.length === 0) {
    elements.ledgerGrid.innerHTML = '';
    elements.ledgerSection.classList.add('hidden');
    return;
  }

  elements.ledgerSection.classList.remove('hidden');
  let cards = '';

  accountNames.forEach((accountName) => {
    const ledger = ledgers[accountName];
    const debitTotal = getTotal(ledger.debitEntries);
    const creditTotal = getTotal(ledger.creditEntries);
    const balance = Math.abs(debitTotal - creditTotal);
    const balanceOnDebitSide = creditTotal > debitTotal;
    const rowCount = Math.max(ledger.debitEntries.length, ledger.creditEntries.length) + 1;
    let rows = '';

    for (let row = 0; row < rowCount; row++) {
      const debit = ledger.debitEntries[row] || {};
      const credit = ledger.creditEntries[row] || {};
      const lastRow = row === rowCount - 1;
      const debitBalance = lastRow && balanceOnDebitSide ? balance : 0;
      const creditBalance = lastRow && !balanceOnDebitSide ? balance : 0;

      const drAttr = debit.txnId ? `data-txn-id="${debit.txnId}" class="hover-entry"` : '';
      const crAttr = credit.txnId ? `data-txn-id="${credit.txnId}" class="hover-entry"` : '';

      rows += `
        <tr>
          <td ${drAttr}>${debit.date || ''}</td>
          <td ${drAttr}>${debit.text || (debitBalance ? 'Balance c/d' : '')}</td>
          <td ${drAttr} class="num-col ${debit.txnId ? 'hover-entry' : ''}">${debit.amount || debitBalance ? formatAmount(debit.amount || debitBalance) : ''}</td>
          <td ${crAttr}>${credit.date || ''}</td>
          <td ${crAttr}>${credit.text || (creditBalance ? 'Balance c/d' : '')}</td>
          <td ${crAttr} class="num-col ${credit.txnId ? 'hover-entry' : ''}">${credit.amount || creditBalance ? formatAmount(credit.amount || creditBalance) : ''}</td>
        </tr>`;
    }

    const equalTotal = Math.max(debitTotal, creditTotal);
    cards += `
      <div class="table-card" id="table-ledger-${cleanId(accountName)}">
        <div class="table-card-header"><h2>${accountName}</h2></div>
        <table>
          <thead>
            <tr><th colspan="3" style="text-align:center; background: rgba(56, 189, 248, 0.08);">Dr.</th>
              <th colspan="3" style="text-align:center; background: rgba(244, 63, 94, 0.08);">Cr.</th></tr>
            <tr><th>Date</th><th>Particulars</th><th class="num-col">Amt</th>
              <th>Date</th><th>Particulars</th><th class="num-col">Amt</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot><tr class="ledger-total"><th colspan="2">Total</th><th class="num-col">${formatAmount(equalTotal)}</th>
            <th colspan="2">Total</th><th class="num-col">${formatAmount(equalTotal)}</th></tr></tfoot>
        </table>
      </div>`;
  });
  elements.ledgerGrid.innerHTML = cards;
}

// TRIAL BALANCE
function renderTrialBalance(ledgers, accountNames) {
  if (accountNames.length === 0) {
    elements.trialBalanceSection.classList.add('hidden');
    elements.trialBalanceBody.innerHTML = '';
    return;
  }

  elements.trialBalanceSection.classList.remove('hidden');
  let rows = '';
  let debitGrandTotal = 0;
  let creditGrandTotal = 0;

  accountNames.forEach((accountName) => {
    const ledger = ledgers[accountName];
    const debitTotal = getTotal(ledger.debitEntries);
    const creditTotal = getTotal(ledger.creditEntries);
    const balance = Math.abs(debitTotal - creditTotal);
    const debitBalance = debitTotal > creditTotal ? balance : 0;
    const creditBalance = creditTotal > debitTotal ? balance : 0;

    debitGrandTotal += debitBalance;
    creditGrandTotal += creditBalance;
    const transactionIds = [...ledger.debitEntries, ...ledger.creditEntries].map((entry) => entry.txnId).join(' ');
    rows += `<tr class="hover-entry" data-txn-id="${transactionIds.split(' ')[0]}" data-txn-ids="${transactionIds}"><td>${accountName}</td><td class="num-col">${debitBalance ? formatAmount(debitBalance) : ''}</td>
      <td class="num-col">${creditBalance ? formatAmount(creditBalance) : ''}</td></tr>`;
  });

  elements.trialBalanceBody.innerHTML = rows + `<tr class="ledger-total"><th>Total</th>
    <th class="num-col">${formatAmount(debitGrandTotal)}</th><th class="num-col">${formatAmount(creditGrandTotal)}</th></tr>`;
}

// FEATURE 3 IMPLEMENTATION: Sidebar with Journal Book, Ledger Accounts dropdown, and Trial Balance
function renderSidebar(ledgers, accountNames) {
  let sidebarHTML = `
    <li class="nav-item" data-target="journal-card">
      <span class="nav-label">Journal Book</span>
      <span class="count-badge">${transactions.length}</span>
    </li>
    
    <li class="nav-item has-dropdown open" id="ledger-dropdown-header">
      <div class="dropdown-header">
        <span class="nav-label">Ledger Accounts</span>
        <div class="dropdown-meta">
          <span class="count-badge">${accountNames.length}</span>
          <span class="chevron-icon">▼</span>
        </div>
      </div>
      <ul class="submenu" id="ledger-submenu">`;

  accountNames.forEach((accountName) => {
    const ledger = ledgers[accountName];
    const count = ledger.debitEntries.length + ledger.creditEntries.length;
    sidebarHTML += `
      <li class="subnav-item" data-target="table-ledger-${cleanId(accountName)}">
        <span class="subnav-label">${accountName}</span>
        <span class="count-badge">${count}</span>
      </li>`;
  });

  sidebarHTML += `
      </ul>
    </li>
    
    <li class="nav-item" data-target="trial-balance-card">
      <span class="nav-label">Trial Balance</span>
      <span class="count-badge">${accountNames.length}</span>
    </li>`;

  elements.activeTablesList.innerHTML = sidebarHTML;

  // Toggle Ledger Dropdown
  const ledgerHeader = document.getElementById('ledger-dropdown-header');
  if (ledgerHeader) {
    const dropdownHeader = ledgerHeader.querySelector('.dropdown-header');
    dropdownHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      ledgerHeader.classList.toggle('open');
    });
  }

  // Click Navigation & Smooth Scroll
  elements.activeTablesList.querySelectorAll('[data-target]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = item.dataset.target;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.remove('nav-flash');
        requestAnimationFrame(() => target.classList.add('nav-flash'));
        setTimeout(() => target.classList.remove('nav-flash'), 2400);
      }
      closeSidebar();
    });
  });
}

function handleTableHover(event) {
  const row = event.target.closest('[data-txn-id]');
  if (!row) return;
  clearHoverHighlights();
  highlightAccounts(row.dataset.txnId);
}

// Single click selection & highlighting
function handleDocumentClick(event) {
  const entry = event.target.closest('[data-txn-id], [data-txn-ids]');
  
  if (entry) {
    selectedTxnId = entry.dataset.txnId;
    elements.deleteEntryButton.disabled = false;
    
    clearHoverHighlights();
    clearDetailedHighlights();

    const transactionIds = (entry.dataset.txnIds || entry.dataset.txnId).split(' ');
    const linkedElements = new Set(transactionIds.flatMap((txnId) => getEntryElements(txnId)));
    
    linkedElements.forEach((item) => {
      item.classList.add('highlighted');
      const parentCard = item.closest('.table-card');
      if (parentCard) parentCard.classList.add('highlighted');
    });
    return;
  }

  if (!event.target.closest('#delete-entry') && !event.target.closest('.modal-card')) {
    selectedTxnId = null;
    elements.deleteEntryButton.disabled = true;
    clearDetailedHighlights();
  }
}

function getEntryElements(txnId) {
  return [...document.querySelectorAll(`[data-txn-id="${txnId}"], [data-txn-ids~="${txnId}"]`)];
}

function highlightAccounts(txnId) {
  getEntryElements(txnId).forEach((item) => {
    item.classList.add('hover-highlighted');
    const parentCard = item.closest('.table-card');
    if (parentCard) parentCard.classList.add('account-highlighted');
  });
}

function clearHoverHighlights() {
  document.querySelectorAll('.account-highlighted').forEach((item) => item.classList.remove('account-highlighted'));
  document.querySelectorAll('.hover-highlighted').forEach((item) => item.classList.remove('hover-highlighted'));
}

function clearDetailedHighlights() {
  document.querySelectorAll('.highlighted').forEach((item) => item.classList.remove('highlighted'));
}

function toggleSidebar() {
  const isOpen = document.body.classList.toggle('sidebar-open');
  elements.menuToggle.setAttribute('aria-expanded', String(isOpen));
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  elements.menuToggle.setAttribute('aria-expanded', 'false');
}

function keepFoundationsGrade() {
  elements.gradeSelect.selectedIndex = 0;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2500);
}

// Custom Warning Modal
function showConfirmModal(title, message, onConfirm) {
  let modalOverlay = document.getElementById('custom-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal';
    modalOverlay.className = 'modal-backdrop';
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-icon">⚠️</span>
        <h3>${title}</h3>
      </div>
      <p class="modal-body">${message}</p>
      <div class="modal-actions">
        <button class="modal-btn cancel-btn" id="modal-cancel">Cancel</button>
        <button class="modal-btn confirm-btn" id="modal-confirm">Clear All</button>
      </div>
    </div>
  `;

  modalOverlay.classList.add('show');

  const cancelBtn = modalOverlay.querySelector('#modal-cancel');
  const confirmBtn = modalOverlay.querySelector('#modal-confirm');

  function closeModal() {
    modalOverlay.classList.remove('show');
  }

  cancelBtn.onclick = closeModal;
  confirmBtn.onclick = function () {
    closeModal();
    onConfirm();
  };
}

function drawEverything() {
  const ledgers = buildLedgerData();
  const accountNames = Object.keys(ledgers);
  renderJournalTable();
  renderLedgerTables(ledgers, accountNames);
  renderTrialBalance(ledgers, accountNames);
  renderSidebar(ledgers, accountNames);
  elements.deleteEntryButton.disabled = !selectedTxnId || !transactions.some((transaction) => transaction.id === selectedTxnId);
}

function getTotal(entries) {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function cleanId(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '');
}

function formatAmount(value) {
  return Number(value).toLocaleString('en-IN');
}