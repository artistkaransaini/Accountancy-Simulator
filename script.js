
// ACCOUNTANCY SIMULATOR

// The transaction list is the single source for every table.


let transactions = [];
let elements = {};

document.addEventListener('DOMContentLoaded', startApp);

function startApp() {
  getHtmlElements();
  connectEvents();
  drawEverything();
}

//  All HTML references.

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
    postEntryButton: document.getElementById('post-entry'),
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
  elements.journalBody.addEventListener('mouseover', handleTableHover);
  elements.journalBody.addEventListener('mouseleave', clearHighlights);
  elements.ledgerGrid.addEventListener('mouseover', handleTableHover);
  elements.ledgerGrid.addEventListener('mouseleave', clearHighlights);
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

  // All user input is stored in this one simple object.

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
  transactions = [];
  showToast('Sandbox Cleared!');
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


// Turn the transaction list into debit and credit entries per account.

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

      rows += `
        <tr>
          <td>${debit.date || ''}</td>
          <td class="hover-entry" ${debit.txnId ? `data-txn-id="${debit.txnId}"` : ''}>${debit.text || (debitBalance ? 'Balance c/d' : '')}</td>
          <td class="num-col">${debit.amount || debitBalance ? formatAmount(debit.amount || debitBalance) : ''}</td>
          <td>${credit.date || ''}</td>
          <td class="hover-entry" ${credit.txnId ? `data-txn-id="${credit.txnId}"` : ''}>${credit.text || (creditBalance ? 'Balance c/d' : '')}</td>
          <td class="num-col">${credit.amount || creditBalance ? formatAmount(credit.amount || creditBalance) : ''}</td>
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
    rows += `<tr><td>${accountName}</td><td class="num-col">${debitBalance ? formatAmount(debitBalance) : ''}</td>
      <td class="num-col">${creditBalance ? formatAmount(creditBalance) : ''}</td></tr>`;
  });

  elements.trialBalanceBody.innerHTML = rows + `<tr class="ledger-total"><th>Total</th>
    <th class="num-col">${formatAmount(debitGrandTotal)}</th><th class="num-col">${formatAmount(creditGrandTotal)}</th></tr>`;
}


// NAVIGATION AND DISPLAY HELPERS


function renderSidebar(ledgers, accountNames) {
  let sidebarHTML = `<li class="active" data-target="journal-card">Journal Book <span class="count-badge">${transactions.length}</span></li>`;
  accountNames.forEach((accountName) => {
    const ledger = ledgers[accountName];
    const count = ledger.debitEntries.length + ledger.creditEntries.length;
    sidebarHTML += `<li data-target="table-ledger-${cleanId(accountName)}">${accountName} <span class="count-badge">${count}</span></li>`;
  });
  elements.activeTablesList.innerHTML = sidebarHTML;
  elements.activeTablesList.querySelectorAll('li').forEach((item) => {
    item.addEventListener('click', () => {
      const target = document.getElementById(item.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function handleTableHover(event) {
  const row = event.target.closest('[data-txn-id]');
  if (!row) return;
  clearHighlights();
  document.querySelectorAll(`[data-txn-id="${row.dataset.txnId}"]`).forEach((item) => {
    item.classList.add('highlighted');
    const parentCard = item.closest('.table-card');
    if (parentCard) parentCard.classList.add('highlighted');
  });
}

function clearHighlights() {
  document.querySelectorAll('.highlighted').forEach((item) => item.classList.remove('highlighted'));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2500);
}

function drawEverything() {
  const ledgers = buildLedgerData();
  const accountNames = Object.keys(ledgers);
  renderJournalTable();
  renderLedgerTables(ledgers, accountNames);
  renderTrialBalance(ledgers, accountNames);
  renderSidebar(ledgers, accountNames);
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
