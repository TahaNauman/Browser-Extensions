const WORKER_BASE = 'https://my-worker-name.workers.dev';
window.dataSource = 'live';

// ── Market cache (all stocks, refreshed every 60s) ────────
let marketCache     = {};
let marketCacheTime = 0;
const CACHE_TTL     = 60000; // 60 seconds

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

// ── Load full market (one request, all stocks) ────────────
async function loadMarket() {
  const now = Date.now();
  if (Object.keys(marketCache).length > 0 && now - marketCacheTime < CACHE_TTL) {
    return marketCache;
  }

  try {
    const result = await fetchWithTimeout(`${WORKER_BASE}/market`);
    if (!result.success) throw new Error(result.error || 'Bad response');

    const list = result.data || [];
    list.forEach(s => { marketCache[s.symbol] = { ...s, source: 'live' }; });
    marketCacheTime = now;

    window.dataSource = 'live';
    console.log(`[PSX Watch] Loaded ${list.length} stocks from ksestocks.com`);
    return marketCache;

  } catch (err) {
    console.warn('[PSX Watch] Market load failed:', err.message);
    window.dataSource = 'mock';
    return null;
  }
}

// ── Public API ────────────────────────────────────────────

async function validateSymbol(symbol) {
  const s     = symbol.toUpperCase();
  const cache = await loadMarket();
  if (cache && Object.keys(cache).length > 0) {
    return { valid: !!cache[s], known: !!cache[s] };
  }
  // Market fetch failed — fall back to mock check
  return { valid: !!MOCK_STOCKS[s], known: !!MOCK_STOCKS[s] };
}

async function fetchStockData(symbol) {
  const s = symbol.toUpperCase();
  try {
    const cache = await loadMarket();
    if (cache && cache[s]) return cache[s];
    throw new Error('Not in market data');
  } catch (err) {
    console.warn(`[PSX Watch] fetchStockData failed for ${s}:`, err.message);
    window.dataSource = 'mock';
    const mock = MOCK_STOCKS[s];
    return mock ? { symbol: s, ...mock, source: 'mock' } : null;
  }
}

async function fetchPayoutData(symbol) {
  const s    = symbol.toUpperCase();
  // Payouts still use mock for now — ksestocks has a separate
  // BookClosures page we can scrape in a future update
  const mock = MOCK_PAYOUTS[s];
  return mock ? { symbol: s, ...mock, source: 'mock' } : null;
}