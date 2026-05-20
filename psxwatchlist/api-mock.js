// ── Mock database ──────────────────────────────────────────
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
  NESTLE:{ price: 6820.00, change: +0.44, volume: '0.05M', high: 6850.00,low: 6790.00},
  SYS:   { price: 412.30,  change: +2.75, volume: '0.6M',  high: 418.00, low: 405.00 },
};

const MOCK_PAYOUTS = {
  HBL:   { type: 'cash',  amount: 4.00,  exDate: 'May 24, 2025',  announced: 'May 10' },
  FFC:   { type: 'bonus', amount: 10,    exDate: 'Jun 5, 2025',   announced: 'Apr 28' },
  ENGRO: { type: 'cash',  amount: 7.50,  exDate: 'Jun 18, 2025',  announced: 'May 15' },
  OGDC:  { type: 'cash',  amount: 3.25,  exDate: 'Jul 2, 2025',   announced: 'May 20' },
  MCB:   { type: 'both',  cashAmt: 5.00, bonusAmt: 5, exDate: 'Jun 30, 2025', announced: 'May 12' },
};

// ── Simulate network delay ─────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Always mock ──────────────────────────────────────────
window.dataSource = 'mock';

// ── Add slight random price drift so data feels live ───────
function driftPrice(base) {
  const drift = (Math.random() - 0.5) * 0.4;
  return parseFloat((base + drift).toFixed(2));
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch stock data for a given symbol.
 * Returns null if symbol not found (unknown stock).
 * @param {string} symbol - e.g. "MARI"
 * @returns {Promise<Object|null>}
 */
async function fetchStockData(symbol) {
  await delay(300 + Math.random() * 400); // simulate latency

  const s = symbol.toUpperCase();
  const mock = MOCK_STOCKS[s];

  if (!mock) return null; // unknown symbol

  return {
    symbol:  s,
    price:   driftPrice(mock.price),
    change:  parseFloat((mock.change + (Math.random() - 0.5) * 0.2).toFixed(2)),
    volume:  mock.volume,
    high:    mock.high,
    low:     mock.low,
    source:  'mock',
  };
}

/**
 * Fetch upcoming payout info for a symbol.
 * Returns null if no upcoming payout.
 * @param {string} symbol
 * @returns {Promise<Object|null>}
 */
async function fetchPayoutData(symbol) {
  await delay(200);

  const s = symbol.toUpperCase();
  const mock = MOCK_PAYOUTS[s];
  if (!mock) return null;

  return { symbol: s, ...mock, source: 'mock' };
}

/**
 * Validate whether a symbol looks plausible before adding.
 * Real implementation could hit an API endpoint.
 * @param {string} symbol
 * @returns {Promise<boolean>}
 */
async function validateSymbol(symbol) {
  await delay(150);
  const s = symbol.toUpperCase();
  const known = !!MOCK_STOCKS[s];
  // Only allow symbols that exist in mock data
  return { valid: known, known };
}