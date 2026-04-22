#!/usr/bin/env bash
# Generate the 4 local Unplugged wallets via solana-keygen.
# Decisions: see .planning/phases/01-foundation/01-CONTEXT.md (D-01 .. D-05).
# Runs idempotently — re-running skips existing keypairs.

set -euo pipefail

OUT_DIR="${HOME}/.config/solana"
WALLETS=(treasury operations deploy kc-call)

if ! command -v solana-keygen >/dev/null 2>&1; then
  cat <<'EOF' >&2
ERROR: solana-keygen not found in PATH.

Install the Solana CLI first:
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

Then add it to PATH (restart shell or):
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

Then re-run this script.
EOF
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "=== Unplugged wallet generation ==="
echo "Output dir: ${OUT_DIR}"
echo

printf '%-12s %-60s %s\n' "NAME" "PATH" "PUBKEY"
printf '%-12s %-60s %s\n' "----" "----" "------"

for NAME in "${WALLETS[@]}"; do
  FILE="${OUT_DIR}/unplugged-${NAME}.json"
  if [ -f "${FILE}" ]; then
    PUBKEY=$(solana-keygen pubkey "${FILE}")
    printf '%-12s %-60s %s  (existing)\n' "${NAME}" "${FILE}" "${PUBKEY}"
    continue
  fi

  solana-keygen new \
    --no-bip39-passphrase \
    --silent \
    --outfile "${FILE}" >/dev/null

  chmod 600 "${FILE}"

  PUBKEY=$(solana-keygen pubkey "${FILE}")
  printf '%-12s %-60s %s  (new)\n' "${NAME}" "${FILE}" "${PUBKEY}"
done

echo
echo "=== Next steps ==="
echo "1. Record pubkeys in .planning/ops/wallets.md (create dir if missing)."
echo "2. Run scripts/generate-server-keypair.sh (or Task 4 in 01-01-PLAN.md)"
echo "   to generate the Vercel server keypair. Paste into Vercel env var"
echo "   SOLANA_SERVER_KEYPAIR. Do NOT save that one to disk."
echo "3. Run scripts/backup-wallets.sh to create an encrypted offline backup."
echo "4. Verify file perms:  stat -c %a ${OUT_DIR}/unplugged-*.json  (should all be 600)"
