# QuickTask

A minimal, keyboard-friendly task manager that lives in your browser toolbar.

## Features

- **Add tasks** — type and press Enter (or click the + button)
- **Complete tasks** — click the label or checkbox to toggle
- **Inline edit** — double-click or click the pencil icon on any task
- **Delete tasks** — hover and click the × button
- **Drag & drop reorder** — drag tasks to rearrange; cross-group drag (completed ↔ active) is visually blocked
- **Progress bar** — shows completion percentage at a glance
- **Hide/show completed** — toggle completed tasks out of view
- **Keyboard shortcuts**

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+K` (Win/Linux) / `Cmd+Shift+K` (Mac) | Open QuickTask |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Focus the task input |

## Storage

Tasks are saved locally using `chrome.storage.local`.

## Future Plans

- **Firebase SDK integration** — sync tasks across browsers and devices via a Firebase backend, so your task list follows you everywhere.
- **Per-browser shortcuts** — the keyboard shortcut to open the popup (`Ctrl+Shift+K`) will be configurable per browser (Chrome, Firefox, Edge, etc.) since different browsers have different reserved keybindings.

## Development

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

