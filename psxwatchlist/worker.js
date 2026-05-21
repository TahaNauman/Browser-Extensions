/* ═══════════════════════════════════════════════════════════
   PSX Watch — Cloudflare Worker
   Source: dps.psx.com.pk (official PSX data portal)

   ROUTES:
   GET /stock/HBL   → single stock data
   GET /market      → all stocks in watchlist (pass ?symbols=HBL,MARI,SYS)
   GET /debug/HBL   → raw debug for a symbol
   ═══════════════════════════════════════════════════════════ */

const PSX_BASE = 'https://dps.psx.com.pk';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://dps.psx.com.pk/',
  'Origin':          'https://dps.psx.com.pk',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url      = new URL(request.url);
    const pathname = url.pathname;

    // GET /stock/HBL
    const stockMatch = pathname.match(/^\/stock\/([A-Z0-9]+)$/i);
    if (stockMatch) return await handleStock(stockMatch[1].toUpperCase());

    // GET /market?symbols=HBL,MARI,SYS
    if (pathname === '/market' || pathname === '/market/') {
      const symbols = (url.searchParams.get('symbols') || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      return await handleMarket(symbols);
    }

    // GET /debug/HBL
    const debugMatch = pathname.match(/^\/debug\/([A-Z0-9]+)$/i);
    if (debugMatch) return await handleDebug(debugMatch[1].toUpperCase());

    return json({ error: 'Use /stock/SYMBOL, /market?symbols=HBL,MARI or /debug/SYMBOL' }, 404);
  }
};

// ── Fetch single stock from dps.psx.com.pk/company/SYMBOL ─
async function handleStock(symbol) {
  try {
    const data = await fetchStockFromPSX(symbol);
    return json({ success: true, data });
  } catch (err) {
    return json({ success: false, error: err.message }, 502);
  }
}

// ── Fetch multiple stocks in parallel ─────────────────────
async function handleMarket(symbols) {
  if (symbols.length === 0) {
    return json({ success: false, error: 'No symbols provided. Use ?symbols=HBL,MARI' }, 400);
  }

  const results = await Promise.allSettled(
    symbols.map(s => fetchStockFromPSX(s))
  );

  const data   = [];
  const errors = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      errors.push({ symbol: symbols[i], error: result.reason?.message });
    }
  });

  return json({ success: true, count: data.length, data, errors });
}

// ── Debug: return raw HTML snippet for a symbol ───────────
async function handleDebug(symbol) {
  try {
    const html = await fetchHTML(symbol);

    // Find where price/change data likely is
    const rsIdx  = html.indexOf('Rs.');
    const pctIdx = html.indexOf('%');

    return json({
      symbol,
      htmlLength: html.length,
      // Context around first Rs. occurrence
      rsCtx:  html.substring(rsIdx - 50, rsIdx + 300),
      // Context around first % occurrence
      pctCtx: html.substring(pctIdx - 100, pctIdx + 200),
      // Middle section of page where data usually lives
      middle: html.substring(Math.floor(html.length / 3), Math.floor(html.length / 3) + 2000),
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}

// ── Core: fetch and parse dps.psx.com.pk/company/SYMBOL ──
async function fetchStockFromPSX(symbol) {
  const html = await fetchHTML(symbol);
  return parseStockPage(symbol, html);
}

async function fetchHTML(symbol) {
  const url = `${PSX_BASE}/company/${symbol}`;
  const res = await fetch(url, {
    headers: HEADERS,
    cf: { cacheTtl: 60 },
  });
  if (!res.ok) throw new Error(`PSX returned ${res.status} for ${symbol}`);
  return await res.text();
}

// ── Parse dps.psx.com.pk/company/SYMBOL page ─────────────
// The page contains structured data like:
// Rs.18.94  -0.77  (-3.91%)
// Open: 19.70  High: 19.70  Low: 18.80  Volume: 334,634
function parseStockPage(symbol, html) {
  // ── Company name from <title> ─────────────────────────
  // Format: "HBL - Stock quote for Habib Bank Limited - Pakistan Stock Exchange (PSX)"
  const nameMatch = html.match(/<title>[^-]+-\s*Stock quote for ([^-]+)-/i);
  const name = nameMatch ? nameMatch[1].trim() : symbol;

  // ── Price from class="quote__close" ───────────────────
  // <div class="quote__close">Rs.279.00</div>
  const priceMatch = html.match(/class="quote__close">Rs\.([\d,]+\.?\d*)<\/div>/);
  const price = priceMatch ? parseNum(priceMatch[1]) : 0;

  // ── Absolute change from class="change__value" ────────
  // <div class="change__value">10.32</div>
  const absMatch = html.match(/class="change__value">([\d,]+\.?\d*)<\/div>/);
  const absChange = absMatch ? parseNum(absMatch[1]) : 0;

  // ── % change from class="change__percent" ────────────
  // <div class="change__percent">  (3.84%)</div>
  const pctMatch = html.match(/class="change__percent">\s*\(([+-]?[\d.]+)%\)\s*<\/div>/);
  const changePct = pctMatch ? parseFloat(pctMatch[1]) : 0;

  // ── Direction: check icon inside change__direction ───────
  // <i class="icon-up-dir"></i>   = positive
  // <i class="icon-down-dir"></i> = negative
  const dirMatch = html.match(/class="change__direction"><i class="icon-(up|down)-dir"/);
  const isNeg = dirMatch ? dirMatch[1] === 'down' : html.includes('change__text--neg');
  const finalChange    = isNeg ? -Math.abs(changePct)   : Math.abs(changePct);
  const finalAbsChange = isNeg ? -Math.abs(absChange)   : Math.abs(absChange);

  // ── OHLV from stats_label/stats_value pairs ───────────
  // <div class="stats_label">Open</div><div class="stats_value">274.49</div>
  const open   = extractStatField(html, 'Open');
  const high   = extractStatField(html, 'High');
  const low    = extractStatField(html, 'Low');
  const volume = extractStatField(html, 'Volume');
  const ldcp   = extractStatField(html, 'LDCP');

  if (price === 0) throw new Error(`Could not parse price for ${symbol}`);

  return {
    symbol,
    name,
    price:     parseFloat(price.toFixed(2)),
    open:      parseFloat(open.toFixed(2)),
    high:      parseFloat(high.toFixed(2)),
    low:       parseFloat(low.toFixed(2)),
    change:    finalChange,
    absChange: parseFloat(finalAbsChange.toFixed(2)),
    volume:    formatVolume(volume),
    ldcp:      parseFloat(ldcp.toFixed(2)),
    source:    'live',
  };
}

// Extract stats field from pattern:
// <div class="stats_label">Open</div><div class="stats_value">274.49</div>
function extractStatField(html, label) {
  const regex = new RegExp(
    'class="stats_label">' + label + '<\\/div>\\s*<div[^>]*class="stats_value[^"]*">([\\d,]+\\.?\\d*)',
    'i'
  );
  const match = html.match(regex);
  return match ? parseNum(match[1]) : 0;
}

// Clean up company name
function cleanName(raw, symbol) {
  return raw
    .replace(new RegExp(symbol, 'gi'), '')
    .replace(/Stock quote for/gi, '')
    .replace(/Pakistan Stock Exchange/gi, '')
    .replace(/PSX/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || symbol;
}

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/,/g, '')) || 0;
}

function formatVolume(vol) {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000)     return (vol / 1_000).toFixed(1) + 'K';
  return String(Math.round(vol));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}