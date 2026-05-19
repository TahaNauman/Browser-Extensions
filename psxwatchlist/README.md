# PSX Watch

A Chrome extension for tracking your personal Pakistan Stock Exchange watchlist using mock data.

## Features

- **Watchlist** — Add/remove PSX symbols and view simulated prices, changes, volume, and day high/low.
- **Payouts tab** — See upcoming cash dividends and bonus share announcements for your tracked stocks.
- **Market status** — Automatically detects whether the PSX is open (Mon–Fri, 9:30 AM – 3:30 PM PKT) and shows a Live/Closed badge.
- **Mock data** — Ships with a built-in dataset for 12 popular PSX stocks with simulated price drift.

## Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `psxwatchlist/` folder.

## Usage

1. Click the extension icon or press `Ctrl+Shift+T` (`Cmd+Shift+T` on Mac) to open.
2. Type a symbol (e.g. `MARI`, `HBL`) in the input field and press Enter or click **+**.
3. View price data on the **Watchlist** tab and dividends on the **Payouts** tab.
4. Hover over a stock card and click **×** to remove it.

## Symbols

`MARI` · `HBL` · `LUCK` · `ENGRO` · `PPL` · `FFC` · `PSO` · `OGDC` · `MCB` · `UBL` · `NESTLE` · `SYS`

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest (v3) |
| `popup.html` | Popup layout with watchlist & payouts tabs |
| `popup.js` | UI logic, state management, rendering |
| `api.js` | Mock data layer (stock prices & dividends) |
| `style.css` | Light theme with green/red price indicators |

## License

MIT
