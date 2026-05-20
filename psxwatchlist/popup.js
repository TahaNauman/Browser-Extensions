let watchlist  = [];   // ['MARI', 'HBL', ...]
let stockData  = {};   // { MARI: { price, change, ... }, ... }
let payoutData = {};   // { HBL: { type, amount, exDate }, ... }
let isLoading  = false;

const symbolInput        = document.getElementById('symbol-input');
const addBtn             = document.getElementById('add-btn');
const watchlistContainer = document.getElementById('watchlist-container');
const payoutsContainer   = document.getElementById('payouts-container');
const emptyWatchlist     = document.getElementById('empty-watchlist');
const emptyPayouts       = document.getElementById('empty-payouts');
const lastUpdated        = document.getElementById('last-updated');
const stockCount         = document.getElementById('stock-count');
const refreshBtn         = document.getElementById('refresh-btn');
const marketStatus       = document.getElementById('market-status');

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('tab-' + this.dataset.tab).classList.add('active');
  });
});

loadWatchlist();
setMarketStatus();

addBtn.addEventListener('click', addStock);
symbolInput.addEventListener('keydown', e => { if (e.key === 'Enter') addStock(); });
refreshBtn.addEventListener('click', () => fetchAllData());

symbolInput.addEventListener('input', function() {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

function setMarketStatus() {
  // PSX hours: Mon-Fri 9:30am - 3:30pm PKT (UTC+5)
  const now = new Date();
  const pkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const day = pkt.getDay(); // 0=Sun, 6=Sat
  const h   = pkt.getHours();
  const m   = pkt.getMinutes();
  const mins = h * 60 + m;
  const open  = 9 * 60 + 30;   // 9:30
  const close = 15 * 60 + 30;  // 15:30

  const isWeekday = day >= 1 && day <= 5;
  const isOpen    = isWeekday && mins >= open && mins < close;

  marketStatus.textContent = isOpen ? 'Live' : 'Closed';
  marketStatus.className   = 'market-status ' + (isOpen ? 'open' : 'closed');
}

function loadWatchlist() {
  chrome.storage.local.get(['psx_watchlist'], result => {
    watchlist = result.psx_watchlist || [];
    if (watchlist.length > 0) {
      renderWatchlist();
      fetchAllData();
    } else {
      renderWatchlist();
    }
  });
}

function saveWatchlist() {
  chrome.storage.local.set({ psx_watchlist: watchlist });
}

async function addStock() {
  const symbol = symbolInput.value.trim().toUpperCase();
  if (!symbol) { symbolInput.focus(); return; }

  if (watchlist.includes(symbol)) {
    showToast(symbol + ' is already in your watchlist');
    symbolInput.value = '';
    return;
  }

  const addBtnEl = addBtn;
  addBtnEl.textContent = '…';
  addBtnEl.disabled = true;

  try {
    const { valid, known } = await validateSymbol(symbol);
    if (!valid) {
      showToast(symbol + ' not found in mock data — add real API first');
      symbolInput.select();
      return;
    }

    watchlist.push(symbol);
    saveWatchlist();
    symbolInput.value = '';

    renderWatchlist();
    const [sd, pd] = await Promise.all([
      fetchStockData(symbol),
      fetchPayoutData(symbol),
    ]);

    if (sd) stockData[symbol]  = sd;
    if (pd) payoutData[symbol] = pd;

    renderWatchlist();
    renderPayouts();
    updateFooter();
  } finally {
    addBtnEl.textContent = '+';
    addBtnEl.disabled = false;
    symbolInput.focus();
  }
}

function removeStock(symbol) {
  watchlist = watchlist.filter(s => s !== symbol);
  delete stockData[symbol];
  delete payoutData[symbol];
  saveWatchlist();
  renderWatchlist();
  renderPayouts();
  updateFooter();
}

async function fetchAllData() {
  if (watchlist.length === 0) return;
  isLoading = true;
  renderWatchlist();

  try {
    const results = await Promise.all(
      watchlist.map(async symbol => {
        const [sd, pd] = await Promise.all([
          fetchStockData(symbol),
          fetchPayoutData(symbol),
        ]);
        return { symbol, sd, pd };
      })
    );

    results.forEach(({ symbol, sd, pd }) => {
      if (sd) stockData[symbol]  = sd;
      if (pd) payoutData[symbol] = pd;
    });

    const now = new Date();
    lastUpdated.textContent = 'Updated ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  } finally {
    isLoading = false;
    renderWatchlist();
    renderPayouts();
    updateFooter();
  }
}

function renderWatchlist() {
  watchlistContainer.innerHTML = '';

  if (watchlist.length === 0) {
    emptyWatchlist.style.display = 'flex';
    watchlistContainer.style.display = 'none';
    return;
  }

  emptyWatchlist.style.display = 'none';
  watchlistContainer.style.display = 'flex';

  watchlist.forEach(symbol => {
    const data = stockData[symbol];

    if (!isLoading && !data) return;

    const card = document.createElement('div');
    card.className = 'stock-card';
    card.dataset.symbol = symbol;

    if (isLoading || !data) {
      card.classList.add('skeleton');
      card.innerHTML = `
        <div class="stock-main">
          <div class="skel-line skel-symbol"></div>
          <div class="skel-line skel-price"></div>
        </div>
        <div class="stock-right">
          <div class="skel-line skel-change"></div>
        </div>
      `;
    } else {
      const up      = data.change >= 0;
      const sign    = up ? '+' : '';
      const arrow   = up ? '▲' : '▼';
      const cls     = up ? 'up' : 'down';

      card.classList.add(cls);
      card.innerHTML = `
        <div class="stock-main">
          <div class="stock-symbol">${symbol}</div>
          <div class="stock-meta">Vol: ${data.volume} · H: ${data.high} · L: ${data.low}</div>
        </div>
        <div class="stock-right">
          <div class="stock-price">Rs ${formatPrice(data.price)}</div>
          <div class="stock-change ${cls}">
            <span class="arrow">${arrow}</span>${sign}${data.change}%
          </div>
        </div>
        <button class="remove-btn" data-symbol="${symbol}" title="Remove">×</button>
      `;
    }

    watchlistContainer.appendChild(card);
  });

  watchlistContainer.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      removeStock(this.dataset.symbol);
    });
  });
}

function renderPayouts() {
  payoutsContainer.innerHTML = '';

  const payouts = watchlist
    .map(s => payoutData[s])
    .filter(Boolean);

  if (payouts.length === 0) {
    emptyPayouts.style.display = 'flex';
    payoutsContainer.style.display = 'none';
    return;
  }

  emptyPayouts.style.display = 'none';
  payoutsContainer.style.display = 'flex';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = 'Upcoming Payouts';
  payoutsContainer.appendChild(header);

  payouts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'payout-card';

    let details = '';
    if (p.type === 'cash') {
      details = `<span class="payout-tag cash">Cash Dividend</span> Rs ${p.amount}/share`;
    } else if (p.type === 'bonus') {
      details = `<span class="payout-tag bonus">Bonus Shares</span> ${p.amount}%`;
    } else if (p.type === 'both') {
      details = `
        <span class="payout-tag cash">Cash</span> Rs ${p.cashAmt}/share &nbsp;
        <span class="payout-tag bonus">Bonus</span> ${p.bonusAmt}%
      `;
    }

    card.innerHTML = `
      <div class="payout-top">
        <span class="payout-symbol">${p.symbol}</span>
        <span class="payout-exdate">Ex-date: ${p.exDate}</span>
      </div>
      <div class="payout-details">${details}</div>
      <div class="payout-announced">Announced: ${p.announced}</div>
    `;

    payoutsContainer.appendChild(card);
  });
}

function updateFooter() {
  const n = watchlist.filter(s => !!stockData[s]).length;
  stockCount.textContent = n + ' stock' + (n !== 1 ? 's' : '');

  const badge = document.getElementById('data-source-badge');
  if (badge) {
    const src = window.dataSource || 'mock';
    badge.textContent = src === 'live' ? 'Live' : 'Mock';
    badge.className   = 'source-badge ' + (src === 'live' ? 'live' : 'mock');
  }
}

function formatPrice(price) {
  return price.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}