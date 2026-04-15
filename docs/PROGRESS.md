# Progress Report

## 2026-04-14 — Initial Release

### Completed

- [x] **Project setup** — Ubersicht widget architecture (JSX + shell script)
- [x] **API integration** — OAuth token auth against `api.anthropic.com/api/oauth/usage`
- [x] **Usage display** — 5-hour session, weekly, per-model (Sonnet/Opus) with progress bars
- [x] **Color coding** — 6-tier color scale (green → red) based on utilization percentage
- [x] **Status labels** — Low / Normal / High / Heavy / Limit!
- [x] **Reset countdown** — Human-readable time until limit resets (e.g., "resets in 2h 41m")
- [x] **Drag to reposition** — Click and drag anywhere on widget; position saved to localStorage
- [x] **Collapse/expand** — Toggle button minimizes to title bar; state saved to localStorage
- [x] **Manual refresh** — Refresh button with spin animation
- [x] **Auto-refresh** — Every 5 minutes via Ubersicht's `refreshFrequency`
- [x] **Cache fallback** — On API failure (429 rate limit, network error), serves last cached response with age indicator
- [x] **Install script** — One-command setup: installs Ubersicht, copies files, creates config, hardens permissions
- [x] **Uninstall script** — Clean removal of widget files (preserves config by default)
- [x] **Credential hardening** — chmod 700/600, cloud sync folder detection
- [x] **GitHub repo** — Private repo at `Sung-tsan/claude-usage-ubersicht`
- [x] **Documentation** — README with install guide, token extraction instructions, security notes

### Issues Encountered & Resolved

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `Can't find variable: React` | Ubersicht doesn't expose global `React` | `import { React } from "uebersicht"` |
| `Invalid hook call` | `useState` used directly in `export const render` (not a component) | Wrapped in `Widget` component, render delegates via `<Widget {...props} />` |
| `$HOME` not expanding | JS template literal `${process.env.HOME}` — `process.env.HOME` undefined in Ubersicht | Use single-quoted shell string: `'/bin/bash "$HOME/.claude/..."'` |
| Persistent 429 rate limit | Usage API rate limits are account-level, not per-call | Added cache fallback with age indicator |
| Session key method blocked | `claude.ai` API protected by Cloudflare JS challenge | Stick with OAuth token method |
| Widget missing after reinstall | `process.env.HOME` bug in repo version | Fixed path resolution (see above) |

### Architecture Decisions

1. **Ubersicht over native WidgetKit** — No Xcode required, ~30MB install vs ~12GB for Xcode
2. **Shell script for API calls** — Avoids JS fetch limitations in Ubersicht's sandboxed WebView
3. **OAuth over session key** — Smaller blast radius, not blocked by Cloudflare
4. **File-based cache** — Simple `/tmp/` cache survives widget refreshes; cleared on reboot (acceptable)
5. **localStorage for UI state** — Drag position + collapse state persist across refreshes without external storage

## 2026-04-15 — Auto Token Refresh

### Completed

- [x] **Auto token refresh** — When API returns 401 (expired token) or cache is stale (>60min), fetch script automatically extracts a fresh OAuth token from macOS Keychain (`Claude Code-credentials`), updates config, and retries — no manual intervention needed

### Issues Encountered & Resolved

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Widget showing 26-hour stale cache | OAuth token in config had expired, API returning 401 | Added auto-refresh logic: on 401 or stale cache, extract fresh token from Keychain via `security find-generic-password` |

### Next Steps

- [ ] Add screenshot to repo for README
- [ ] Test install script on a clean macOS machine
- [ ] Consider desktop notifications when usage > 80%
- [ ] Make repo public when ready
