#!/bin/bash
# Claude Usage Widget — Uninstaller

set -euo pipefail

green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }

WIDGET="$HOME/Library/Application Support/Übersicht/widgets/claude-usage.jsx"
WIDGET_OFF="$HOME/Library/Application Support/Übersicht/widgets/claude-usage.jsx.off"
FETCH="$HOME/.claude/claude-usage-fetch.sh"
CACHE="/tmp/.claude-usage-cache.json"

rm -f "$WIDGET" "$WIDGET_OFF" "$FETCH" "$CACHE"
green "Removed widget files."

yellow "Config preserved: ~/.claude/claude-usage-widget.json"
yellow "Delete it manually if you want to remove your token:"
yellow "  rm ~/.claude/claude-usage-widget.json"

osascript -e 'tell application "Übersicht" to refresh' 2>/dev/null || true
green "Done."
