# PSX Watch

A Chrome extension for tracking your personal Pakistan Stock Exchange watchlist.

## Features

- **Watchlist** — Add/remove PSX symbols and view prices, changes, volume, and day high/low.
- **Payouts tab** — See upcoming cash dividends and bonus share announcements for your tracked stocks.
- **Market status** — Automatically detects whether the PSX is open (Mon–Fri, 9:30 AM – 3:30 PM PKT) and shows a Live/Closed badge.
- **Data source badge** — Footer shows whether data is coming from the live API or mock fallback.

## Data Source

Fetches live stock data from **dps.psx.com.pk** (the official PSX data portal) via a Cloudflare Worker, with automatic fallback to built-in mock data if the live source is unreachable. To use mock-only mode, swap the script tag in `popup.html`:

```html
<script src="api-mock.js"></script>
```

## Architecture

The extension uses ES modules:

- `worker_url.js` — Exports the deployed worker URL
- `api.js` — Imports the URL from `worker_url.js`, fetches live data, falls back to mock
- `popup.js` — Imports `validateSymbol`, `fetchStockData`, `fetchPayoutData` from `api.js`

## Worker Deployment

The `worker.js` file scrapes `https://dps.psx.com.pk/company/{SYMBOL}` and returns parsed stock data.

### Setup

After deploying, create `worker_url.js` in the extension folder with your worker URL:

```js
export default {
    url: "https://your-worker.your-subdomain.workers.dev/"
}
```

This file is imported by `api.js` and **must not** be committed to version control (add it to `.gitignore`).

### Worker Routes

| Route | Description |
|-------|-------------|
| `GET /stock/HBL` | Single stock data |
| `GET /market?symbols=HBL,MARI,SYS` | Multiple stocks in parallel |
| `GET /debug/HBL` | Raw HTML snippet for debugging |

### Parsed Fields

For each symbol the worker returns: `symbol`, `name`, `price`, `open`, `high`, `low`, `change`, `absChange`, `volume`, `ldcp`, `source`.

## Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `psxwatchlist/` folder.

## Usage

1. Click the extension icon or press `Ctrl+Shift+P`.
2. Type a symbol (e.g. `MARI`, `HBL`) in the input field and press Enter or click **+**.
3. View price data on the **Watchlist** tab and dividends on the **Payouts** tab.
4. Hover over a stock card and click **×** to remove it.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest (v3) |
| `popup.html` | Popup layout with watchlist & payouts tabs |
| `popup.js` | UI logic, state management, rendering (ES module) |
| `api.js` | Live data layer with mock fallback (ES module) |
| `api-mock.js` | Offline-only mock data layer |
| `worker_url.js` | Worker URL config (imported by api.js, not committed) |
| `worker.js` | Cloudflare Worker that scrapes dps.psx.com.pk |
| `style.css` | Light theme with green/red price indicators |
