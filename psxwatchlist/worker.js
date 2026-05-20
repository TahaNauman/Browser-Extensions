const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer':         'https://www.ksestocks.com/',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url      = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/debug')                        return await handleDebug();
    if (pathname === '/market' || pathname === '/market/') return await handleMarket();

    const m = pathname.match(/^\/stock\/([A-Z0-9]+)$/i);
    if (m) return await handleSingleStock(m[1].toUpperCase());

    return json({ error: 'Use /market, /stock/SYMBOL, or /debug' }, 404);
  }
};

async function fetchHTML() {
  const res = await fetch('https://www.ksestocks.com/MarketSummary', {
    headers: HEADERS,
    cf: { cacheTtl: 60 },
  });
  if (!res.ok) throw new Error('ksestocks returned ' + res.status);
  return await res.text();
}

async function handleDebug() {
  try {
    const html = await fetchHTML();
    // Find the actual HBL symbol cell, not "HBL Growth Fund"
    // Symbol cells contain ONLY the symbol text
    const symIdx = html.search(/>HBL\s*<\/td>/);
    return json({
      htmlLength: html.length,
      symIdx,
      symCtx: html.substring(symIdx - 50, symIdx + 600),
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

async function handleMarket() {
  try {
    const html   = await fetchHTML();
    const stocks = parseMarketSummary(html);
    if (stocks.length === 0) {
      return json({ success: false, error: 'Parsed 0 stocks', htmlLength: html.length }, 502);
    }
    return json({ success: true, count: stocks.length, data: stocks });
  } catch (err) {
    return json({ success: false, error: err.message }, 502);
  }
}

async function handleSingleStock(symbol) {
  try {
    const html   = await fetchHTML();
    const stocks = parseMarketSummary(html);
    const stock  = stocks.find(s => s.symbol === symbol);
    if (!stock) return json({ success: false, error: symbol + ' not found' }, 404);
    return json({ success: true, data: stock });
  } catch (err) {
    return json({ success: false, error: err.message }, 502);
  }
}

function parseMarketSummary(html) {
  const stocks = [];

  const rows = html.split(/<tr[^>]*>/);

  for (const row of rows) {
    const cellRegex = /<td[^>]*class="plain"[^>]*>([\s\S]*?)<\/td>/g;
    const cells = [];
    let m;
    while ((m = cellRegex.exec(row)) !== null) {
      const val = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, '')
        .replace(/&amp;/g, '&')
        .trim();
      cells.push(val);
    }

    if (cells.length !== 8) continue;

    const symbol    = cells[0];
    const name      = cells[1];
    const open      = parseNum(cells[2]);
    const high      = parseNum(cells[3]);
    const low       = parseNum(cells[4]);
    const close     = parseNum(cells[5]);
    const absChange = parseNum(cells[6]); 
    const volume    = parseNum(cells[7]);

    if (!symbol || !/^[A-Z][A-Z0-9]{0,9}$/.test(symbol)) continue;
    if (close === 0) continue;
    if (!name || name === '&nbsp;') continue;
    if (name.includes('Number of traded')) continue;

    const prevClose = close - absChange;
    const pct = prevClose !== 0
      ? parseFloat(((absChange / prevClose) * 100).toFixed(2))
      : 0;

    stocks.push({
      symbol,
      name,
      price:     parseFloat(close.toFixed(2)),
      open:      parseFloat(open.toFixed(2)),
      high:      parseFloat(high.toFixed(2)),
      low:       parseFloat(low.toFixed(2)),
      change:    pct,
      absChange: parseFloat(absChange.toFixed(2)),
      volume:    formatVolume(volume),
    });
  }

  return stocks;
}

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, '')) || 0;
}

function formatVolume(vol) {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000)     return (vol / 1_000).toFixed(1) + 'K';
  return String(Math.round(vol));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}