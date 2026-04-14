#!/usr/bin/env bash
# AgentBill HSK — live demo script
# Runs on HashKey Chain Testnet (chain 133)
# Usage: ./demo.sh

set -euo pipefail

BOLD="\033[1m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
DIM="\033[2m"
RESET="\033[0m"

SERVER_URL="http://localhost:3000"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

banner() {
  echo
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo
}

step() {
  echo -e "${YELLOW}▶ $1${RESET}"
}

ok() {
  echo -e "${GREEN}✓ $1${RESET}"
}

# ──────────────────────────────────────────────────────────────
banner "AgentBill HSK — x402 payments on HashKey Chain"

echo -e "${DIM}  AI agents pay for API access autonomously via USDC on HashKey Chain."
echo -e "  No wallets. No popups. No humans in the loop.${RESET}"
echo

# ──────────────────────────────────────────────────────────────
banner "Step 1 — Start the merchant API server"

step "Launching Express server with one free and one paid route..."
npm run example:server &> /tmp/agentbill-server.log &
SERVER_PID=$!

# wait for server to be ready
for i in $(seq 1 20); do
  if curl -sf "$SERVER_URL" > /dev/null 2>&1; then break; fi
  sleep 0.5
done

ok "Server running at $SERVER_URL"
echo
echo -e "${DIM}  Routes:"
echo -e "    GET /            → free"
echo -e "    GET /api/weather → \$0.01 USDC  (x402 + Permit2)${RESET}"
echo

# ──────────────────────────────────────────────────────────────
banner "Step 2 — Call the paid endpoint without payment"

step "curl $SERVER_URL/api/weather (no payment header)"
echo
HTTP_CODE=$(curl -s -o /tmp/agentbill-402.json -w "%{http_code}" "$SERVER_URL/api/weather")
echo -e "  HTTP status: ${BOLD}$HTTP_CODE${RESET}"

if [[ "$HTTP_CODE" == "402" ]]; then
  # decode the payment challenge
  PAYMENT_HDR=$(curl -sI "$SERVER_URL/api/weather" | grep -i "^payment-required:" | tr -d '\r' | sed 's/payment-required: //i')
  if [[ -n "$PAYMENT_HDR" ]]; then
    echo
    echo -e "${DIM}  Payment challenge (decoded):${RESET}"
    echo "$PAYMENT_HDR" | base64 -d 2>/dev/null | python3 -m json.tool --indent 2 2>/dev/null \
      | sed 's/^/    /' || echo "    (see raw header)"
  fi
fi

echo
ok "Server correctly rejected the request — 402 Payment Required"
echo

# ──────────────────────────────────────────────────────────────
banner "Step 3 — AI agent pays autonomously and retries"

step "Running agent client..."
echo -e "${DIM}  The agent will:"
echo -e "    1. Detect the 402 and parse the payment challenge"
echo -e "    2. Sign a Permit2 EIP-712 authorization (no on-chain tx)"
echo -e "    3. Send the signed payment in the X-PAYMENT header"
echo -e "    4. Receive the 200 response${RESET}"
echo

npm run example:agent 2>&1 | sed 's/^/  /'

echo
ok "Payment settled on HashKey Chain. Agent received the data."

# ──────────────────────────────────────────────────────────────
banner "Done"

echo -e "  ${BOLD}AgentBill HSK${RESET} — gate any Express endpoint behind a USDC micropayment."
echo -e "  One middleware line. No custody. No checkout. Just code."
echo
echo -e "  ${DIM}Chain:    HashKey Chain Testnet (133)"
echo -e "  Token:    USDC (ERC-20 + Permit2)"
echo -e "  Protocol: x402 — open standard for machine payments${RESET}"
echo
