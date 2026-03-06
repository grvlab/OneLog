# OneLog

A lightweight, offline-first daily diary desktop app for working professionals. Built with Electron, React, and SQLite.

Your data stays on your machine  - no cloud, no accounts, no tracking.

## Features

- **Daily Log**  - Rich text editor (TipTap) with headings, lists, code blocks, images, and backlinks
- **Task Management**  - Add, complete, reorder, and organize tasks per day with project tagging
- **Time Tracking**  - Start/stop timers or set time manually, with overnight auto-cap protection
- **Tomorrow's Plan**  - Plan ahead; yesterday's plan items can be converted to today's tasks
- **Blockers**  - Track impediments, auto-included in standup generation
- **Task Carry-Over**  - Automatically offers to bring incomplete tasks forward (weekend/holiday aware)
- **Project & Tag Management**  - Color-coded projects and tags for categorization
- **Kanban Board**  - Drag-and-drop task board with To Do / In Progress / Done columns
- **Statistics Dashboard**  - Completion rates, streaks, time-per-project charts, weekly trends
- **Calendar Navigation**  - Date picker with workload heatmap, holiday management
- **Standup Generator**  - One-click formatted standup message copied to clipboard
- **Entry Backlinks**  - Cross-reference entries with `[[YYYY-MM-DD]]` syntax
- **Task Templates**  - Save and reuse task sets, with optional recurring auto-apply
- **Search**  - Full-text search across all entries
- **Import/Export**  - JSON, CSV, Markdown, and PDF export; JSON import
- **Dark Mode**  - Light, dark, and system-matched themes
- **Command Palette**  - `Alt+K` for quick access to any action
- **Guided Tour**  - First-launch onboarding walkthrough

## Tech Stack

| Layer     | Technology                        |
| --------- | --------------------------------- |
| Framework | Electron                          |
| Frontend  | React, TypeScript, Tailwind CSS   |
| Editor    | TipTap                            |
| Database  | better-sqlite3 (SQLite)           |
| Bundler   | Vite                              |
| Testing   | Vitest                            |
| Packaging | electron-builder                  |

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server and launches Electron concurrently.

### Build

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

### Test

```bash
npm test
```

## Keyboard Shortcuts

| Shortcut        | Action                   |
| --------------- | ------------------------ |
| `Alt + K`       | Command Palette          |
| `Alt + S`       | Force save               |
| `Alt + ←` / `→` | Previous / Next day     |
| `Alt + T`       | Focus task input         |
| `Alt + 1/2/3`  | Focus Log / Tasks / Plan |
| `Ctrl + B/I/U` | Bold / Italic / Underline |

## Project Structure

```
src/
  main/         # Electron main process (main.js, preload.js, database.js)
  renderer/     # React frontend (App.tsx, components/, hooks/, extensions/)
tests/          # Unit tests
scripts/        # Build helper scripts
```

## Data & Privacy

All data is stored locally in a SQLite database. No data is sent to any server. The app works 100% offline.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE)
