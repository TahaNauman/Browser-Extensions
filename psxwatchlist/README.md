# PSX Watch

A Chrome extension for tracking your personal Pakistan Stock Exchange watchlist.

## Features

- **Watchlist** — Add/remove PSX symbols and view prices, changes, volume, and day high/low.
- **Payouts tab** — See upcoming cash dividends and bonus share announcements for your tracked stocks.
- **Market status** — Automatically detects whether the PSX is open (Mon–Fri, 9:30 AM – 3:30 PM PKT) and shows a Live/Closed badge.
- **Data source badge** — Footer shows whether data is coming from the live API or mock fallback.

## Data Source

Fetches live stock data from **ksestocks.com** via a Cloudflare Worker, with automatic fallback to built-in mock data if the live source is unreachable. To use mock-only mode, swap the script tag in `popup.html`:

```html
<script src="api-mock.js"></script>
```

## Worker Deployment

The `worker.js` file is deployed as a Cloudflare Worker. Update the `WORKER_BASE` URL in `api.js` to point to your deployed worker.


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
| `popup.js` | UI logic, state management, rendering |
| `api.js` | Live data layer with mock fallback |
| `api-mock.js` | Offline-only mock data layer |
| `worker.js` | Cloudflare Worker that scrapes ksestocks.com |
| `style.css` | Light theme with green/red price indicators |

