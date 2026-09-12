
let journalEntries = [];

// This object stores the important elements which will update often.
let elements = {};

// Run the app once the page is ready.
document.addEventListener('DOMContentLoaded', startApp);

function startApp() {
  cacheDomElements();
  bindEvents();
  render();
}

// Save references to the elements that already exist in HTML.
function cacheDomElements() {
  elements = {
    activeTablesList: document.getElementById('active-tables-list'),
    journalBody: document.getElementById('journal-body'),
    ledgerGrid: document.getElementById('ledger-grid'),
    ledgerSection: document.getElementById('ledger-section'),
    toast: document.getElementById('toast'),
    clearSandboxButton: document.getElementById('clear-sandbox'),
    postEntryButton: document.getElementById('post-entry'),
    inputDr: document.getElementById('input-dr'),
    inputCr: document.getElementById('input-cr'),
    inputAmount: document.getElementById('input-amount'),
    inputNarration: document.getElementById('input-narration')
  };
}

// Attach the click and hover events only once after the page loads.
function bindEvents() {
  elements.clearSandboxButton.addEventListener('click', clearSandbox);
  elements.postEntryButton.addEventListener('click', handlePostEntry);

  // These two listeners use event delegation.
  // Instead of adding one mouseenter/leave per row, we listen to the whole table container.
  elements.journalBody.addEventListener('mouseover', handleRowHover);
  elements.journalBody.addEventListener('mouseleave', clearHighlights);

  elements.ledgerGrid.addEventListener('mouseover', handleRowHover);
  elements.ledgerGrid.addEventListener('mouseleave', clearHighlights);
}

// Clear all sandbox entries.
function clearSandbox() {
  journalEntries = [];
  showToast('Sandbox Cleared!');
  render();
}

// Convert a number into Indian-style money text.
function formatAmount(value) {
  return Number(value).toLocaleString('en-IN');
}

// Turn journal entries into ledger rows.
// This is the heart of the app:
// every journal entry has a debit account and a credit account,
// so we create two ledger-side entries for the same transaction.
function buildLedgerData(entries) {
  const ledgers = {};

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];

    // Make sure the debit account exists in the ledger object.
    if (!ledgers[entry.particularDr]) {
      ledgers[entry.particularDr] = {
        debitEntries: [],
        creditEntries: []
      };
    }

    // Add the debit side for the debit account.
    ledgers[entry.particularDr].debitEntries.push({
      txnId: entry.id,
      date: entry.date,
      text: 'To ' + entry.particularCr,
      amount: entry.amount
    });

    // Make sure the credit account exists in the ledger object.
    if (!ledgers[entry.particularCr]) {
      ledgers[entry.particularCr] = {
        debitEntries: [],
        creditEntries: []
      };
    }

    // Add the credit side for the credit account.
    ledgers[entry.particularCr].creditEntries.push({
      txnId: entry.id,
      date: entry.date,
      text: 'By ' + entry.particularDr,
      amount: entry.amount
    });
  }

  return ledgers;
}

// Main render function.
// This is where the screen is refreshed after every action.
function render() {
  const ledgers = buildLedgerData(journalEntries);
  const accountNames = Object.keys(ledgers);

  // Send the ledger data to the sidebar so each account can show its count.
  renderSidebar(ledgers, accountNames);
  renderJournalTable(journalEntries);
  renderLedgerTables(ledgers, accountNames);
}

// Build the sidebar list from the data.
function renderSidebar(ledgers, accountNames) {
  const items = [];

  // Journal Book is always the first item in the sidebar.
  items.push(`
    <li class="active" data-target="journal-card">
      Journal Book
      <span class="count-badge">${journalEntries.length}</span>
    </li>
  `);

  // Add each ledger account as a side item.
  for (let i = 0; i < accountNames.length; i += 1) {
    const accountName = accountNames[i];
    const ledger = ledgers[accountName];
    const totalEntries = ledger.debitEntries.length + ledger.creditEntries.length;

    items.push(`
      <li data-target="table-ledger-${cleanId(accountName)}">
        ${accountName}
        <span class="count-badge">${totalEntries}</span>
      </li>
    `);
  }

  elements.activeTablesList.innerHTML = items.join('');

  // Attach click handling after the HTML is inserted.
  elements.activeTablesList.querySelectorAll('li').forEach((item) => {
    item.addEventListener('click', () => {
      const targetId = item.dataset.target;
      scrollTo(targetId);
    });
  });
}

// Fill the Journal Book table body.
// This part is simple: it only replaces the table rows inside the existing HTML table.
function renderJournalTable(entries) {
  if (entries.length === 0) {
    elements.journalBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color: var(--text-muted); padding: 25px;">
          No entries posted. Fill the form above to build ledgers.
        </td>
      </tr>
    `;
    return;
  }

  const rows = entries.map((entry) => {
    return `
      <tr class="hover-entry" data-txn-id="${entry.id}">
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
  }).join('');

  elements.journalBody.innerHTML = rows;
}

// Fill the ledger section with one card for each account.
// Each account gets its own card, and the rows are arranged in Dr./Cr. columns.
function renderLedgerTables(ledgers, accountNames) {
  if (accountNames.length === 0) {
    elements.ledgerGrid.innerHTML = '';
    elements.ledgerSection.classList.add('hidden');
    return;
  }

  elements.ledgerSection.classList.remove('hidden');

  elements.ledgerGrid.innerHTML = accountNames.map((accountName) => {
    const ledgerData = ledgers[accountName];
    const rows = [];
    const maxRows = Math.max(ledgerData.debitEntries.length, ledgerData.creditEntries.length);

    for (let i = 0; i < maxRows; i += 1) {
      const debit = ledgerData.debitEntries[i] || {};
      const credit = ledgerData.creditEntries[i] || {};

      rows.push(`
        <tr>
          <td>${debit.date || ''}</td>
          <td class="hover-entry" ${debit.txnId ? `data-txn-id="${debit.txnId}"` : ''}>
            ${debit.text || ''}
          </td>
          <td class="num-col">${debit.amount ? formatAmount(debit.amount) : ''}</td>

          <td>${credit.date || ''}</td>
          <td class="hover-entry" ${credit.txnId ? `data-txn-id="${credit.txnId}"` : ''}>
            ${credit.text || ''}
          </td>
          <td class="num-col">${credit.amount ? formatAmount(credit.amount) : ''}</td>
        </tr>
      `);
    }

    const emptyState = rows.length === 0
      ? '<tr><td colspan="6" style="text-align:center; color: var(--text-muted)">No entries</td></tr>'
      : rows.join('');

    return `
      <div class="table-card" id="table-ledger-${cleanId(accountName)}">
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
            ${emptyState}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

// Read values from the form and add a new journal entry.
function handlePostEntry() {
  const debitAccount = elements.inputDr.value.trim();
  const creditAccount = elements.inputCr.value.trim();
  const amount = parseFloat(elements.inputAmount.value);
  const narrationText = elements.inputNarration.value.trim() || 'Transaction posted in sandbox';

  // Basic validation before saving anything.
  if (!debitAccount || !creditAccount || isNaN(amount) || amount <= 0) {
    showToast('Please fill out Debit, Credit, and Amount correctly!');
    return;
  }

  // Normalise the account names so the app uses a consistent style.
  const cleanDebit = debitAccount.endsWith('A/c') ? debitAccount : debitAccount + ' A/c';
  const cleanCredit = creditAccount.endsWith('A/c') ? creditAccount : creditAccount + ' A/c';
  const cleanNarration = narrationText.startsWith('Being') ? narrationText : 'Being ' + narrationText;

  journalEntries.push({
    id: 'txn-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    particularDr: cleanDebit,
    particularCr: cleanCredit,
    amount: amount,
    narration: cleanNarration
  });

  // Reset the form after posting.
  elements.inputDr.value = '';
  elements.inputCr.value = '';
  elements.inputAmount.value = '';
  elements.inputNarration.value = '';

  showToast('Entry Posted & Ledgers Updated!');
  render();
}

// This is used by the event delegation on the journal and ledger tables.
// We only need the clicked row's txn id, then we highlight every element with the same id.
function handleRowHover(event) {
  const row = event.target.closest('[data-txn-id]');

  if (!row) {
    return;
  }

  highlightEntry(row.dataset.txnId);
}

// Highlight all matching rows and their parent cards.
function highlightEntry(txnId) {
  clearHighlights();

  const matchingRows = document.querySelectorAll('[data-txn-id="' + txnId + '"]');

  for (let i = 0; i < matchingRows.length; i += 1) {
    const row = matchingRows[i];
    row.classList.add('highlighted');

    const parentCard = row.closest('.table-card');

    if (parentCard) {
      parentCard.classList.add('highlighted');
    }
  }
}

// Remove every highlight that was added during hover.
function clearHighlights() {
  const highlightedItems = document.querySelectorAll('.highlighted');

  for (let i = 0; i < highlightedItems.length; i += 1) {
    highlightedItems[i].classList.remove('highlighted');
  }
}

// Show the toast message at the bottom right.
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
}

// Scroll smoothly to a section when the sidebar item is clicked.
function scrollTo(id) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Make a safe id from account names so the sidebar links can target cards.
function cleanId(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '');
}