#!/usr/bin/env bash
# scripts/check-edge-functions.sh
# Verifies that all Supabase Edge Functions compile and that critical
# Database types (e.g. email_send_log, move_to_dlq) still exist.
# Exit code != 0 blocks the build.

set -euo pipefail

FUNCTIONS_DIR="supabase/functions"
TYPES_FILE="src/integrations/supabase/types.ts"
ERRORS=0

echo "🔍 Checking Supabase Edge Function types..."

# 1. Required Database types must exist in types.ts
REQUIRED_TYPES=(
  "email_send_log"
  "email_send_state"
  "suppressed_emails"
  "email_unsubscribe_tokens"
)
REQUIRED_RPCS=(
  "move_to_dlq"
  "enqueue_email"
  "read_email_batch"
  "delete_email"
)

for t in "${REQUIRED_TYPES[@]}"; do
  if ! grep -q "\"$t\":" "$TYPES_FILE"; then
    echo "❌ Missing required table type: $t"
    ERRORS=$((ERRORS+1))
  fi
done

for r in "${REQUIRED_RPCS[@]}"; do
  if ! grep -q "$r" "$TYPES_FILE"; then
    echo "❌ Missing required RPC type: $r"
    ERRORS=$((ERRORS+1))
  fi
done

# 2. Type-check each Edge Function with Deno (if available)
if command -v deno >/dev/null 2>&1; then
  for fn in "$FUNCTIONS_DIR"/*/index.ts; do
    [ -f "$fn" ] || continue
    echo "  → deno check $fn"
    if ! deno check --quiet "$fn" 2>&1 | tee /tmp/deno-check.log; then
      if grep -qE "TS[0-9]+|error:" /tmp/deno-check.log; then
        echo "❌ Type error in $fn"
        ERRORS=$((ERRORS+1))
      fi
    fi
  done
else
  echo "ℹ️  Deno not installed — skipping per-function type-check (CI should install Deno)."
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "❌ Edge function type-check FAILED with $ERRORS error(s)."
  exit 1
fi

echo "✅ All Edge Function types match the Supabase schema."
