<p align="center">
  <img src="build/oneloglogo.png" alt="OneLog" width="80" />
</p>

<h1 align="center">OneLog</h1>

<p align="center">
  A lightweight, offline-first daily diary for working professionals.<br/>
  Built with Electron, React, and SQLite. Your data never leaves your machine.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#keyboard-shortcuts">Shortcuts</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Why OneLog?

Most journaling and productivity apps require accounts, send data to the cloud, or lock your notes behind a subscription. OneLog is different:

- **100% offline** - no accounts, no cloud sync, no telemetry
- **Your data, your machine** - everything lives in a local SQLite file
- **Single-purpose** - daily log, tasks, time tracking, and standup prep in one place
- **Fast and lightweight** - launches in under 2 seconds

---

## Features

### Writing & Organization

- **Rich Text Editor** - TipTap-powered editor with headings, lists, code blocks, images, and inline formatting
- **Entry Backlinks** - Cross-reference any day with `[[YYYY-MM-DD]]` syntax
- **Full-Text Search** - Instantly search across all your entries
- **Tags & Projects** - Color-coded categorization for tasks and entries

### Task Management

- **Daily Tasks** - Add, complete, reorder, and organize tasks per day
- **Project Tagging** - Assign tasks to color-coded projects
- **Task Carry-Over** - Automatically offers to bring incomplete tasks forward (weekend and holiday aware)
- **Kanban Board** - Drag-and-drop board with To Do / In Progress / Done columns
- **Task Templates** - Save and reuse task sets, with optional recurring auto-apply

### Productivity

- **Time Tracking** - Start/stop timers or set time manually, with overnight auto-cap protection
- **Tomorrow's Plan** - Plan ahead; yesterday's plan items convert to today's tasks
- **Blockers** - Track impediments, auto-included in standup generation
- **Standup Generator** - One-click formatted standup message copied to clipboard

### Insights

- **Statistics Dashboard** - Completion rates, streaks, time-per-project charts, weekly trends
- **Calendar Heatmap** - Visual workload overview with holiday management

### Quality of Life

- **Dark Mode** - Light, dark, and system-matched themes
- **Command Palette** - `Alt+K` for quick access to any action
- **Import/Export** - JSON, CSV, Markdown, and PDF export; JSON import
- **Guided Tour** - First-launch onboarding walkthrough

---

## Screenshots

> _Coming soon_

---

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Framework | Electron 40                     |
| Frontend  | React 19, TypeScript, Tailwind CSS v4 |
| Editor    | TipTap (ProseMirror)            |
| Database  | better-sqlite3 (SQLite)         |
| Bundler   | Vite 7                          |
| Testing   | Vitest                          |
| Packaging | electron-builder                |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Install & Run

```bash
# Clone the repository
git clone https://github.com/grvlab/OneLog.git
cd OneLog

# Install dependencies
npm install

# Start in development mode
npm run dev
```

This launches the Vite dev server and Electron concurrently with hot-reload.

### Build for Production

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

Packaged installers are output to the `release/` directory.

### Run Tests

```bash
npm test
```

---

## Keyboard Shortcuts

| Shortcut          | Action                    |
| ----------------- | ------------------------- |
| `Alt + K`         | Command Palette           |
| `Alt + S`         | Force save                |
| `Alt + ←` / `→`  | Previous / Next day       |
| `Alt + T`         | Focus task input          |
| `Alt + 1 / 2 / 3`| Focus Log / Tasks / Plan  |
| `Ctrl + B`        | Bold                      |
| `Ctrl + I`        | Italic                    |
| `Ctrl + U`        | Underline                 |

---

## Project Structure

```
src/
  main/             # Electron main process
    main.js          #   App window, IPC handlers, menus
    preload.js       #   Context bridge (renderer ↔ main)
    database.js      #   SQLite schema, queries, migrations
    seed.js          #   Sample data for first launch
  renderer/          # React frontend
    App.tsx           #   Root component, routing, state
    components/       #   UI components (Sidebar, Editor, Kanban, Stats, ...)
    hooks/            #   Custom React hooks
    extensions/       #   TipTap editor extensions (Backlink, ResizableImage)
    utils.ts          #   Helpers (standup generator, formatters)
tests/               # Unit tests (Vitest)
scripts/             # Build helper scripts
```

---

## Data & Privacy

All data is stored in a local SQLite database file on your machine. OneLog makes **zero network requests** - no analytics, no crash reporting, no update checks. The app works fully offline from the moment you install it.

**Database location:**

| OS      | Path                                      |
| ------- | ----------------------------------------- |
| Windows | `%APPDATA%/onelog/mydailydiary.db`        |
| macOS   | `~/Library/Application Support/onelog/`   |
| Linux   | `~/.config/onelog/`                       |

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an [issue](https://github.com/grvlab/OneLog/issues) with steps to reproduce
2. **Suggest features** - Describe your use case in a new issue
3. **Submit a PR** - Fork the repo, create a branch, and open a pull request

Please keep PRs focused and include a clear description of the change.

---

## License

[MIT](LICENSE)
