# PRD: Claude Usage Widget for Ubersicht

## Overview

A lightweight macOS desktop widget that displays real-time Claude AI usage statistics. Built on [Ubersicht](https://tracesof.net/uebersicht/) — no Xcode required.

## Problem

Claude Pro/Team/Max/Enterprise users have usage limits (5-hour session window + 7-day rolling window) but no easy way to monitor them at a glance. The official Claude web UI shows usage only when you hit a limit. Users need a persistent, always-visible indicator to manage their usage proactively.

## Target Users

- Claude Pro / Team / Max / Enterprise subscribers
- macOS users (15.0+)
- Developers who use Claude Code or the Claude desktop app

## Goals

1. **Always visible** — usage data on the desktop, no need to open a browser
2. **Zero friction install** — one `bash install.sh` command, no Xcode
3. **Secure by default** — hardened credential storage, minimal network surface
4. **Lightweight** — no Electron, no native build, just a JSX widget + shell script

## Non-Goals

- Linux / Windows support (Ubersicht is macOS only)
- Editing Claude settings from the widget
- Push notifications when limits are near (potential future feature)

## Features

### P0 (MVP) — Shipped

| Feature | Description |
|---------|-------------|
| 5-hour session usage | Progress bar + percentage + reset countdown |
| Weekly usage | Progress bar + percentage + reset countdown |
| Per-model breakdown | Sonnet / Opus weekly usage (when API returns data) |
| Color-coded status | Green → Yellow → Orange → Red based on utilization |
| Status labels | Low / Normal / High / Heavy / Limit! |
| Auto-refresh | Every 5 minutes |
| Manual refresh | Click button to fetch immediately |
| Draggable | Click and drag to reposition; position persists |
| Collapsible | Minimize to title bar only; state persists |
| Cache fallback | Shows last successful data during API rate limits |
| One-line install | `bash install.sh` handles everything |
| Credential hardening | chmod 700/600, cloud sync detection |

### P1 (Future)

| Feature | Description |
|---------|-------------|
| Auto token refresh | Use refresh_token to renew expired OAuth tokens |
| Desktop notification | Alert when usage exceeds configurable threshold |
| Multiple accounts | Support switching between different Claude accounts |
| Theme customization | Light mode, accent color options |
| Homebrew tap | `brew install --cask claude-usage-widget` |

### P2 (Nice to have)

| Feature | Description |
|---------|-------------|
| Usage history graph | Sparkline showing usage trend over time |
| Cost estimation | Estimated spend for Team/Enterprise plans |
| Linux port | Use Conky or similar for Linux desktop widgets |

## Technical Architecture

```
┌──────────────────────────────────────────────┐
│  Ubersicht (macOS desktop widget engine)      │
│                                               │
│  claude-usage.jsx                             │
│  ├─ Renders React/JSX UI                      │
│  ├─ Manages drag, collapse, refresh state     │
│  └─ Calls shell command every 5 min           │
│         │                                     │
│         ▼                                     │
│  claude-usage-fetch.sh                        │
│  ├─ Reads ~/.claude/claude-usage-widget.json  │
│  ├─ Calls Anthropic OAuth usage API           │
│  ├─ Caches successful responses               │
│  └─ Falls back to cache on failure            │
└──────────────────────────────────────────────┘
         │
         ▼
   api.anthropic.com/api/oauth/usage
```

### API

- **Endpoint:** `GET https://api.anthropic.com/api/oauth/usage`
- **Auth:** `Authorization: Bearer {oauthToken}`
- **Headers:** `anthropic-version: 2023-06-01`, `anthropic-beta: oauth-2025-04-20`
- **Response:**
  ```json
  {
    "five_hour":      { "utilization": 56.0, "resets_at": "ISO8601" },
    "seven_day":      { "utilization": 82.0, "resets_at": "ISO8601" },
    "seven_day_sonnet": { "utilization": 15.0, "resets_at": "ISO8601" },
    "seven_day_opus": null
  }
  ```

### Files

| File | Location | Purpose |
|------|----------|---------|
| `claude-usage.jsx` | `~/Library/Application Support/Ubersicht/widgets/` | Widget UI |
| `claude-usage-fetch.sh` | `~/.claude/` | API fetch + caching |
| `claude-usage-widget.json` | `~/.claude/` | OAuth token config |
| Cache | `/tmp/.claude-usage-cache.json` | Last successful API response |

## Security

- OAuth token stored with `chmod 600` in `~/.claude/`
- `~/.claude/` directory set to `chmod 700`
- Only network call: `api.anthropic.com` (HTTPS)
- `.gitignore` excludes `*.json` to prevent token commits
- Installer warns if `~/.claude/` is inside cloud-synced folders
- README recommends LuLu/Little Snitch firewall verification
- OAuth preferred over session key (smaller blast radius)

## Constraints

- Ubersicht runs widgets in a WebView — no Node.js APIs, limited React
- `export const render` is a plain function, not a React component (hooks must be in sub-components)
- Shell `$HOME` expansion must happen at shell level, not JS level (`process.env.HOME` is unreliable in Ubersicht)
- The usage API has strict rate limits — cache fallback is essential
