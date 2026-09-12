// --- STATE ---
let currentMode = 'example'; // 'example' or 'sandbox'

// Preset Class 11 example data
const exampleJournal = [
  {
    id: 'txn-1',
    date: '2026-04-01',
    particularDr: 'Cash A/c',
    particularCr: 'Capital A/c',
    amount: 100000,
    narration: 'Being business started with cash'
  },
  {
    id: 'txn-2',
    date: '2026-04-05',
    particularDr: 'Purchases A/c',
    particularCr: 'Cash A/c',
    amount: 25000,
    narration: 'Being goods purchased for cash'
  },
  {
    id: 'txn-3',
    date: '2026-04-10',
    particularDr: 'Furniture A/c',
    particularCr: 'Cash A/c',
    amount: 10000,
    narration: 'Being office furniture purchased'
  }
];

let sandboxJournal = [];

// --- APP START ---
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  const modeToggleButton = document.getElementById('mode-toggle');

  if (modeToggleButton) {
    modeToggleButton.addEventListener('click', toggleMode);
  }

  render();
}

// --- MODE SWITCHING ---
function toggleMode() {
  currentMode = currentMode === 'example' ? 'sandbox' : 'example';

  const modeToggleButton = document.getElementById('mode-toggle');

  if (modeToggleButton) {
    modeToggleButton.textContent =
      currentMode === 'example' ? 'Switch to Empty Sandbox' : 'Switch to Example Mode';
  }

  const statusMessage =
    currentMode === 'example'
      ? 'Loaded Class 11 Example Data'
      : 'Switched to Empty Sandbox';

  showToast(statusMessage);
  render();
}

function clearSandbox() {
  sandboxJournal = [];
  showToast('Sandbox Cleared!');
  render();
}

function getCurrentJournalData() {
  return currentMode === 'example' ? exampleJournal : sandboxJournal;
}

function formatAmount(amount) {
  return Number(amount).toLocaleString('en-IN');
}

// --- LEDGER BUILDING ---
function buildLedgerData(journalData) {
  const ledgers = {};

  journalData.forEach((entry) => {
    if (!ledgers[entry.particularDr]) {
      ledgers[entry.particularDr] = { debits: [], credits: [] };
    }

    ledgers[entry.particularDr].debits.push({
      txnId: entry.id,
      date: entry.date,
      oppoAccount: 'To ' + entry.particularCr,
      amount: entry.amount
    });

    if (!ledgers[entry.particularCr]) {
      ledgers[entry.particularCr] = { debits: [], credits: [] };
    }

    ledgers[entry.particularCr].credits.push({
      txnId: entry.id,
      date: entry.date,
      oppoAccount: 'By ' + entry.particularDr,
      amount: entry.amount
    });
  });

  return ledgers;
}

// --- RENDERING ---
function render() {
  const workspace = document.getElementById('workspace');
  const activeList = document.getElementById('active-tables-list');

  if (!workspace || !activeList) {
    return;
  }

  workspace.innerHTML = '';
  activeList.innerHTML = '';

  const journalData = getCurrentJournalData();
  const ledgers = buildLedgerData(journalData);

  addSidebarItem(activeList, 'Journal Book', journalData.length, 'active', () => {
    scrollToElement('table-Journal');
  });

  Object.keys(ledgers).forEach((accountName) => {
    const count = ledgers[accountName].debits.length + ledgers[accountName].credits.length;

    addSidebarItem(activeList, accountName, count, '', () => {
      scrollToElement(`table-ledger-${cleanId(accountName)}`);
    });
  });

  if (currentMode === 'sandbox') {
    renderSandboxForm(workspace);
  }

  renderJournalTable(workspace, journalData);

  if (Object.keys(ledgers).length > 0) {
    const ledgerHeading = document.createElement('h2');
    ledgerHeading.className = 'section-title';
    ledgerHeading.textContent = 'Ledger Entries';
    workspace.appendChild(ledgerHeading);

    const ledgerGrid = document.createElement('div');
    ledgerGrid.className = 'ledger-grid';

    Object.keys(ledgers).forEach((accountName) => {
      renderLedgerTable(ledgerGrid, accountName, ledgers[accountName]);
    });

    workspace.appendChild(ledgerGrid);
  }
}

function addSidebarItem(list, label, count, extraClass, clickHandler) {
  const item = document.createElement('li');

  if (extraClass) {
    item.classList.add(extraClass);
  }

  item.innerHTML = `${label} <span class="count-badge">${count}</span>`;
  item.onclick = clickHandler;

  list.appendChild(item);
}

function renderSandboxForm(container) {
  const card = document.createElement('div');
  card.className = 'table-card';
  card.innerHTML = `
    <div class="sandbox-header">
      <h2>+ Post Journal Entry</h2>
      <button class="clear-btn" onclick="clearSandbox()">Clear Sandbox</button>
    </div>
    <div class="sandbox-inputs">
      <input type="text" id="input-dr" placeholder="Debit A/c (e.g. Rent A/c)">
      <input type="text" id="input-cr" placeholder="Credit A/c (e.g. Cash A/c)">
      <input type="number" id="input-amount" placeholder="Amount (₹)">
      <input type="text" id="input-narration" placeholder="Narration (e.g. Being rent paid)">
      <button class="post-btn" id="add-entry-btn">Post Entry</button>
    </div>
  `;

  container.appendChild(card);

  const addEntryButton = document.getElementById('add-entry-btn');

  if (addEntryButton) {
    addEntryButton.addEventListener('click', handlePostEntry);
  }
}

function handlePostEntry() {
  const drInput = document.getElementById('input-dr');
  const crInput = document.getElementById('input-cr');
  const amountInput = document.getElementById('input-amount');
  const narrationInput = document.getElementById('input-narration');

  if (!drInput || !crInput || !amountInput || !narrationInput) {
    return;
  }

  const debitAccount = drInput.value.trim();
  const creditAccount = crInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const narrationText = narrationInput.value.trim() || 'Transaction posted in sandbox';

  if (!debitAccount || !creditAccount || Number.isNaN(amount) || amount <= 0) {
    showToast('Please fill out Debit, Credit, and Amount correctly!');
    return;
  }

  sandboxJournal.push({
    id: 'txn-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    particularDr: debitAccount.endsWith('A/c') ? debitAccount : debitAccount + ' A/c',
    particularCr: creditAccount.endsWith('A/c') ? creditAccount : creditAccount + ' A/c',
    amount: amount,
    narration: narrationText.startsWith('Being') ? narrationText : 'Being ' + narrationText
  });

  showToast('Entry Posted & Ledgers Updated!');
  render();
}

function renderJournalTable(container, journalData) {
  const card = document.createElement('div');
  card.className = 'table-card';
  card.id = 'table-Journal';

  let rowsHtml = '';

  if (journalData.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="5" style="text-align:center; color: var(--text-muted); padding: 25px;">
          No entries posted. Fill the form above to build ledgers.
        </td>
      </tr>
    `;
  } else {
    journalData.forEach((entry) => {
      rowsHtml += `
        <tr class="hover-entry" data-txn-id="${entry.id}" onmouseenter="highlightTxn('${entry.id}')" onmouseleave="clearHighlight()">
          <td>${entry.date}</td>
          <td>
            <span class="debit-text">${entry.particularDr}</span><br>
            &nbsp;&nbsp;&nbsp;&nbsp;To <span class="credit-text">${entry.particularCr}</span><br>
            <small style="color: var(--text-muted)">(${entry.narration})</small>
          </td>
          <td>—</td>
          <td class="num-col">${formatAmount(entry.amount)}</td>
          <td class="num-col">${formatAmount(entry.amount)}</td>
        </tr>
      `;
    });
  }

  card.innerHTML = `
    <div class="table-card-header">
      <h2>Journal Book</h2>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 100px;">Date</th>
          <th>Particulars</th>
          <th style="width: 50px;">L.F.</th>
          <th style="width: 120px;" class="num-col">Debit (₹)</th>
          <th style="width: 120px;" class="num-col">Credit (₹)</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  container.appendChild(card);
}

function renderLedgerTable(container, accountName, ledgerData) {
  const card = document.createElement('div');
  card.className = 'table-card';
  card.id = `table-ledger-${cleanId(accountName)}`;

  const maxRows = Math.max(ledgerData.debits.length, ledgerData.credits.length);
  let rowsHtml = '';

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const debitEntry = ledgerData.debits[rowIndex] || {};
    const creditEntry = ledgerData.credits[rowIndex] || {};

    rowsHtml += `
      <tr>
        <td>${debitEntry.date || ''}</td>
        <td class="hover-entry" ${debitEntry.txnId ? `data-txn-id="${debitEntry.txnId}" onmouseenter="highlightTxn('${debitEntry.txnId}')" onmouseleave="clearHighlight()"` : ''}>
          ${debitEntry.oppoAccount || ''}
        </td>
        <td class="num-col">${debitEntry.amount ? formatAmount(debitEntry.amount) : ''}</td>

        <td>${creditEntry.date || ''}</td>
        <td class="hover-entry" ${creditEntry.txnId ? `data-txn-id="${creditEntry.txnId}" onmouseenter="highlightTxn('${creditEntry.txnId}')" onmouseleave="clearHighlight()"` : ''}>
          ${creditEntry.oppoAccount || ''}
        </td>
        <td class="num-col">${creditEntry.amount ? formatAmount(creditEntry.amount) : ''}</td>
      </tr>
    `;
  }

  card.innerHTML = `
    <div class="table-card-header">
      <h2>${accountName}</h2>
    </div>

    <table>
      <thead>
        <tr>
          <th colspan="3" style="text-align:center; background: rgba(56, 189, 248, 0.08);">Dr.</th>
          <th colspan="3" style="text-align:center; background: rgba(244, 63, 94, 0.08);">Cr.</th>
        </tr>
        <tr>
          <th>Date</th>
          <th>Particulars</th>
          <th class="num-col">Amt</th>
          <th>Date</th>
          <th>Particulars</th>
          <th class="num-col">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align:center; color: var(--text-muted)">No entries</td></tr>'}
      </tbody>
    </table>
  `;

  container.appendChild(card);
}

// --- INTERACTIONS ---
function highlightTxn(txnId) {
  clearHighlight();

  const matchingElements = document.querySelectorAll(`[data-txn-id="${txnId}"]`);

  matchingElements.forEach((element) => {
    element.classList.add('highlighted');

    const parentCard = element.closest('.table-card');

    if (parentCard) {
      parentCard.classList.add('highlighted');
    }
  });
}

function clearHighlight() {
  document.querySelectorAll('.highlighted').forEach((element) => {
    element.classList.remove('highlighted');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function scrollToElement(id) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function cleanId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}
