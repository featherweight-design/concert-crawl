#!/usr/bin/env bash
# Fires on every UserPromptSubmit.
# Counts assistant turns in the session transcript as a proxy for session depth,
# then injects a warning into Claude's context at thresholds.

PAYLOAD=$(cat)
TRANSCRIPT_PATH=$(echo "$PAYLOAD" | jq -r '.transcript_path // empty')

if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# Count assistant turns as a proxy for token consumption
TURN_COUNT=$(grep -c '"role":"assistant"' "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)

if [ "$TURN_COUNT" -ge 35 ]; then
  echo "[SESSION BUDGET CRITICAL] ~${TURN_COUNT} assistant turns logged. The session context is very large. You MUST suggest the user run /compact immediately before proceeding, or recommend starting a fresh session if switching to a new task."
elif [ "$TURN_COUNT" -ge 20 ]; then
  echo "[SESSION BUDGET WARNING] ~${TURN_COUNT} assistant turns logged. Proactively suggest /compact if the user is switching tasks or if recent work involved heavy debugging. Remind them that CLAUDE.md and committed code preserve all context across sessions."
fi
