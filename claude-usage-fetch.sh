#!/bin/bash
# Claude Usage Fetch Script
# Called by the Ubersicht widget to retrieve usage data from the Anthropic API.
# Caches the last successful response so the widget still shows data during rate limits.

set -e

CONFIG="$HOME/.claude/claude-usage-widget.json"
CACHE="/tmp/.claude-usage-cache.json"

if [ ! -f "$CONFIG" ]; then
  echo '{"error":"no_config"}'
  exit 0
fi

OAUTH=$(/usr/bin/python3 -c "import sys,json; d=json.load(open(sys.argv[1])); print(d.get('oauthToken',''))" "$CONFIG" 2>/dev/null || echo "")

fetch_usage() {
  local token="$1"
  [ -z "$token" ] && return 1
  HTTP_CODE=$(curl -s --max-time 10 -o /tmp/.claude-usage-resp -w "%{http_code}" \
    -H "Authorization: Bearer $token" \
    -H "Accept: application/json" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: oauth-2025-04-20" \
    "https://api.anthropic.com/api/oauth/usage" 2>/dev/null) || HTTP_CODE="000"
  if [ "$HTTP_CODE" = "200" ]; then
    cp /tmp/.claude-usage-resp "$CACHE"
    cat /tmp/.claude-usage-resp
    rm -f /tmp/.claude-usage-resp
    return 0
  fi
  rm -f /tmp/.claude-usage-resp
  return 1
}

# Try with current token
if fetch_usage "$OAUTH"; then
  exit 0
fi

# Token failed — auto-refresh from Keychain on any failure
NEW_TOKEN=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null \
  | /usr/bin/python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])" 2>/dev/null) || true
if [ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "$OAUTH" ]; then
  # Update config with new token
  /usr/bin/python3 -c "
import json, sys
with open('$CONFIG') as f:
    d = json.load(f)
d['oauthToken'] = sys.argv[1]
with open('$CONFIG', 'w') as f:
    json.dump(d, f, indent=2)
" "$NEW_TOKEN" 2>/dev/null
  # Retry with new token
  if fetch_usage "$NEW_TOKEN"; then
    exit 0
  fi
fi

# API failed (rate limit, network error, etc.) — serve cached data
if [ -f "$CACHE" ]; then
  /usr/bin/python3 -c "
import json, os, time
with open('$CACHE') as f:
    d = json.load(f)
age = int(time.time() - os.path.getmtime('$CACHE'))
d['_cached'] = True
d['_cache_age_sec'] = age
print(json.dumps(d))
"
  exit 0
fi

echo '{"error":"fetch_failed"}'
