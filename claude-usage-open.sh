#!/bin/bash
# Re-open the Claude Usage widget after it's been closed.
# Usage: bash claude-usage-open.sh
#   or:  claude-usage  (if alias is set up)

WD="$HOME/Library/Application Support/Übersicht/widgets"

if [ -f "$WD/claude-usage.jsx" ]; then
  echo "Widget is already open."
  exit 0
fi

if [ -f "$WD/claude-usage.jsx.off" ]; then
  mv "$WD/claude-usage.jsx.off" "$WD/claude-usage.jsx"
  osascript -e 'tell application "Übersicht" to refresh' 2>/dev/null
  echo "Widget reopened."
else
  echo "Widget not found. Run install.sh first."
  exit 1
fi
