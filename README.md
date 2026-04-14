# Claude Usage Widget for Ubersicht

A macOS desktop widget that displays your real-time Claude AI usage — built on [Ubersicht](https://tracesof.net/uebersicht/). No Xcode required.

![screenshot](screenshot.png)

## Features

- **5-hour session** and **weekly** usage with progress bars
- **Per-model breakdown** (Sonnet, Opus) when available
- Color-coded status: green → yellow → orange → red
- Countdown timers for when limits reset
- **Draggable** — place it anywhere on your desktop
- **Collapsible** — minimize to just the title bar
- **Manual refresh** button
- **Auto-refresh** every 5 minutes
- **Cache fallback** — still shows data during API rate limits
- Hardened credential storage (chmod 700/600)

## Requirements

- macOS 15.0+
- [Ubersicht](https://tracesof.net/uebersicht/) (installed automatically if you have Homebrew)
- Claude Pro, Team, Max, or Enterprise subscription
- Python 3 (pre-installed on macOS)

## Install

```bash
git clone https://github.com/anthropics/claude-usage-ubersicht.git
cd claude-usage-ubersicht
bash install.sh
```

The installer will:
1. Install Ubersicht via Homebrew (if not present)
2. Copy the widget to `~/Library/Application Support/Ubersicht/widgets/`
3. Copy the fetch script to `~/.claude/`
4. Create a config template at `~/.claude/claude-usage-widget.json`
5. Set restrictive file permissions (700/600)
6. Launch Ubersicht

## Getting your OAuth token

### From Claude Code (recommended)

If you use [Claude Code](https://claude.ai/claude-code), your token is already in the macOS Keychain:

```bash
security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])"
```

### From the Claude desktop app

1. Open the Claude desktop app
2. Open DevTools: `Cmd + Option + I`
3. Go to **Application** → **Local Storage** → `https://claude.ai`
4. Look for a key containing your OAuth token (starts with `sk-ant-oat01-`)

### Paste it into the config

```bash
nano ~/.claude/claude-usage-widget.json
```

Replace `PASTE_YOUR_OAUTH_TOKEN_HERE` with your token:

```json
{
  "oauthToken": "sk-ant-oat01-..."
}
```

## Usage

| Action | How |
|--------|-----|
| **Move** | Click and drag anywhere on the widget |
| **Collapse/Expand** | Click the **▾** button |
| **Refresh** | Click the **↻** button |
| **Close** | Click the **✕** button (hides the widget) |
| **Reopen** | Run `claude-usage` in terminal, or `bash ~/.claude/claude-usage-open.sh` |
| **Auto-refresh** | Happens every 5 minutes |
| **Auto-start** | Ubersicht is added to login items on install — widget survives reboot |

## Security

- Config file is set to `chmod 600` (owner read/write only)
- `~/.claude/` directory is set to `chmod 700` (owner only)
- The widget only connects to `api.anthropic.com` — no other network calls
- OAuth tokens have smaller blast radius than session keys
- The installer warns if `~/.claude` is inside a cloud-synced folder (iCloud, Dropbox, etc.)

### Recommended: network firewall

Install [LuLu](https://objective-see.org/products/lulu.html) or [Little Snitch](https://www.obdev.at/products/littlesnitch/) and verify Ubersicht only connects to:
- `api.anthropic.com`

Block everything else.

## Uninstall

```bash
bash uninstall.sh
```

Or manually:

```bash
rm ~/Library/Application\ Support/Übersicht/widgets/claude-usage.jsx
rm ~/.claude/claude-usage-fetch.sh
rm ~/.claude/claude-usage-widget.json  # removes your token
```

## How it works

```
Ubersicht (every 5 min)
  → runs claude-usage-fetch.sh
    → reads ~/.claude/claude-usage-widget.json for OAuth token
    → calls GET https://api.anthropic.com/api/oauth/usage
    → returns JSON with utilization percentages
  → claude-usage.jsx renders the data as a desktop widget
```

On API failure (rate limit, network error), the fetch script serves the last cached response with a "cached X min ago" indicator.

## API response format

```json
{
  "five_hour": { "utilization": 56.0, "resets_at": "2025-04-14T06:00:00Z" },
  "seven_day": { "utilization": 82.0, "resets_at": "2025-04-21T00:00:00Z" },
  "seven_day_sonnet": { "utilization": 15.0, "resets_at": "2025-04-15T09:00:00Z" },
  "seven_day_opus": null
}
```

## License

MIT
