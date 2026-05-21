import config from './worker_url.js';

const WORKER_BASE = config.url;


window.dataSource = 'live';

// ── Cache ─────────────────────────────────────────────────
const stockCache = {};     // { HBL: { price, change, ... } }
const CACHE_TTL  = 60000;  // 60 seconds

// ── Fallback mock data ────────────────────────────────────
const MOCK_STOCKS = {
  MARI:  { price: 842.50,  change: +2.14, volume: '1.2M',  high: 851.00, low: 820.00 },
  HBL:   { price: 125.30,  change: -0.83, volume: '3.4M',  high: 128.50, low: 123.00 },
  LUCK:  { price: 1490.00, change: +1.22, volume: '0.4M',  high: 1502.00,low: 1475.00 },
  ENGRO: { price: 285.75,  change: +0.55, volume: '0.9M',  high: 289.00, low: 282.00 },
  PPL:   { price: 96.40,   change: -1.45, volume: '2.1M',  high: 98.50,  low: 94.00  },
  FFC:   { price: 134.20,  change: +3.10, volume: '1.8M',  high: 136.00, low: 130.00 },
  PSO:   { price: 312.00,  change: -0.32, volume: '0.7M',  high: 315.00, low: 308.00 },
  OGDC:  { price: 178.50,  change: +1.88, volume: '2.5M',  high: 181.00, low: 175.00 },
  MCB:   { price: 198.75,  change: -2.10, volume: '1.1M',  high: 203.00, low: 196.00 },
  UBL:   { price: 145.60,  change: +0.90, volume: '0.8M',  high: 147.00, low: 143.00 },
  NESTLE:{ price: 6820.00, change: +0.44, volume: '0.05M', high: 6850.00,low: 6790.00 },
  SYS:   { price: 412.30,  change: +2.75, volume: '0.6M',  high: 418.00, low: 405.00 },
};

const MOCK_PAYOUTS = {
  HBL:   { type: 'cash',  amount: 4.00,  exDate: 'May 24, 2025', announced: 'May 10' },
  FFC:   { type: 'bonus', amount: 10,    exDate: 'Jun 5, 2025',  announced: 'Apr 28' },
  ENGRO: { type: 'cash',  amount: 7.50,  exDate: 'Jun 18, 2025', announced: 'May 15' },
  OGDC:  { type: 'cash',  amount: 3.25,  exDate: 'Jul 2, 2025',  announced: 'May 20' },
  MCB:   { type: 'both',  cashAmt: 5.00, bonusAmt: 5, exDate: 'Jun 30, 2025', announced: 'May 12' },
};

// ── Helpers ───────────────────────────────────────────────
async function fetchWithTimeout(url, ms = 8000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ── Public API ────────────────────────────────────────────

// Validate by trying to fetch — if it returns data it's valid
async function validateSymbol(symbol) {
  const s = symbol.toUpperCase();
  try {
    const result = await fetchWithTimeout(`${WORKER_BASE}/stock/${s}`);
    return { valid: result.success, known: result.success };
  } catch (e) {
    // Worker down — allow it, mock will handle
    return { valid: true, known: !!MOCK_STOCKS[s] };
  }
}

// Fetch single stock — uses per-symbol PSX page
async function fetchStockData(symbol) {
  const s   = symbol.toUpperCase();
  const now = Date.now();

  // Return cached if fresh
  if (stockCache[s] && now - stockCache[s]._ts < CACHE_TTL) {
    return stockCache[s];
  }

  try {
    const result = await fetchWithTimeout(`${WORKER_BASE}/stock/${s}`);
    if (!result.success) throw new Error(result.error || 'Failed');

    const data = { ...result.data, source: 'live', _ts: now };
    stockCache[s] = data;
    window.dataSource = 'live';
    return data;

  } catch (err) {
    console.warn(`[PSX Watch] Live fetch failed for ${s}:`, err.message);
    window.dataSource = 'mock';
    const mock = MOCK_STOCKS[s];
    return mock ? { symbol: s, ...mock, source: 'mock', _ts: now } : null;
  }
}

// Payouts still use mock — dps.psx.com.pk/payouts page is JS rendered
async function fetchPayoutData(symbol) {
  const s    = symbol.toUpperCase();
  const mock = MOCK_PAYOUTS[s];
  return mock ? { symbol: s, ...mock, source: 'mock' } : null;
}

export { validateSymbol, fetchStockData, fetchPayoutData };