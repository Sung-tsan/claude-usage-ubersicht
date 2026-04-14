#!/bin/bash
# Claude Usage Widget — Installer
# Usage: bash install.sh

set -euo pipefail

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

WIDGET_DIR="$HOME/Library/Application Support/Übersicht/widgets"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$HOME/.claude"
CONFIG_FILE="$CONFIG_DIR/claude-usage-widget.json"

# ── 1. Check Ubersicht ──
bold "1. Checking Ubersicht..."
if [ -d "/Applications/Übersicht.app" ]; then
  green "   Ubersicht is installed."
else
  yellow "   Ubersicht not found. Installing via Homebrew..."
  if ! command -v brew &>/dev/null; then
    red "   Homebrew not found. Please install Ubersicht manually:"
    red "   https://tracesof.net/uebersicht/"
    exit 1
  fi
  brew install --cask ubersicht
  green "   Ubersicht installed."
fi

# ── 2. Install widget files ──
bold "2. Installing widget..."
mkdir -p "$WIDGET_DIR"
cp "$SCRIPT_DIR/claude-usage.jsx" "$WIDGET_DIR/claude-usage.jsx"
green "   Widget → $WIDGET_DIR/claude-usage.jsx"

mkdir -p "$CONFIG_DIR"
cp "$SCRIPT_DIR/claude-usage-fetch.sh" "$CONFIG_DIR/claude-usage-fetch.sh"
chmod 700 "$CONFIG_DIR/claude-usage-fetch.sh"
green "   Fetch script → $CONFIG_DIR/claude-usage-fetch.sh"

cp "$SCRIPT_DIR/claude-usage-open.sh" "$CONFIG_DIR/claude-usage-open.sh"
chmod 700 "$CONFIG_DIR/claude-usage-open.sh"
green "   Reopen script → $CONFIG_DIR/claude-usage-open.sh"

# ── 3. Config file ──
bold "3. Setting up config..."
if [ -f "$CONFIG_FILE" ]; then
  green "   Existing config preserved: $CONFIG_FILE"
else
  cat > "$CONFIG_FILE" <<'EOF'
{
  "oauthToken": "PASTE_YOUR_OAUTH_TOKEN_HERE"
}
EOF
  yellow "   Created template config: $CONFIG_FILE"
  yellow "   Edit it and paste your OAuth token (see README for how to get it)."
fi

# ── 4. Harden permissions ──
bold "4. Hardening permissions..."
chmod 700 "$CONFIG_DIR"
chmod 600 "$CONFIG_FILE"
green "   ~/.claude/ → 700 (owner only)"
green "   config     → 600 (owner read/write only)"

# Warn about cloud sync
REAL=$(cd "$CONFIG_DIR" && pwd -P)
for sync in "iCloud" "Dropbox" "Google Drive" "OneDrive"; do
  if [[ "$REAL" == *"$sync"* ]]; then
    red "   WARNING: ~/.claude is inside '$sync' — your token may be syncing to the cloud!"
  fi
done

# ── 5. Shell alias ──
bold "5. Setting up shell alias..."
SHELL_RC="$HOME/.zshrc"
[ -f "$HOME/.bashrc" ] && [ ! -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.bashrc"
ALIAS_LINE='alias claude-usage="bash \$HOME/.claude/claude-usage-open.sh"'
if grep -qF "claude-usage-open.sh" "$SHELL_RC" 2>/dev/null; then
  green "   Alias already exists in $SHELL_RC"
else
  echo "" >> "$SHELL_RC"
  echo "# Claude Usage Widget — reopen with: claude-usage" >> "$SHELL_RC"
  echo "$ALIAS_LINE" >> "$SHELL_RC"
  green "   Added alias 'claude-usage' to $SHELL_RC"
fi

# ── 6. Launch ──
bold "6. Launching..."
# Add Ubersicht to login items (so widget survives reboot)
osascript -e 'tell application "System Events"
  if not (exists login item "Übersicht") then
    make login item at end with properties {path:"/Applications/Übersicht.app", hidden:false}
  end if
end tell' 2>/dev/null && green "   Ubersicht added to login items (auto-start on boot)" || true
open "/Applications/Übersicht.app"
green "   Done!"

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Next steps:

  1. Get your OAuth token from Claude Code:
     Open a terminal and run:
       security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null \\
         | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])"

     Or from the Claude desktop app (see README).

  2. Paste it into the config:
       nano ~/.claude/claude-usage-widget.json

  3. Click the refresh button on the widget,
     or wait up to 5 minutes.

  Widget controls:
    ▾  Collapse / expand
    ↻  Refresh
    ✕  Close widget

  Reopen after closing:
    claude-usage          (shell alias, restart terminal first)
    bash ~/.claude/claude-usage-open.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
