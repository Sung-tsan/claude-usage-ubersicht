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

if [ -n "$OAUTH" ]; then
  HTTP_CODE=$(curl -s --max-time 10 -o /tmp/.claude-usage-resp -w "%{http_code}" \
    -H "Authorization: Bearer $OAUTH" \
    -H "Accept: application/json" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: oauth-2025-04-20" \
    "https://api.anthropic.com/api/oauth/usage" 2>/dev/null) || true
  if [ "$HTTP_CODE" = "200" ]; then
    cp /tmp/.claude-usage-resp "$CACHE"
    cat /tmp/.claude-usage-resp
    rm -f /tmp/.claude-usage-resp
    exit 0
  fi
  rm -f /tmp/.claude-usage-resp
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
