#!/usr/bin/env bash
# Encrypted offline backup of the 4 local Unplugged wallets.
# Decisions: see .planning/phases/01-foundation/01-CONTEXT.md (D-04).
# Decrypt with:  age -d -o restored.tar backup.tar.age && tar xzf restored.tar

set -euo pipefail

SRC_DIR="${HOME}/.config/solana"
OUT_FILE="${BACKUP_OUT:-./unplugged-keys-backup-$(date +%Y%m%d).tar.age}"

if ! command -v age >/dev/null 2>&1; then
  cat <<'EOF' >&2
ERROR: age not found in PATH.

Install age (modern encryption tool):
  macOS:  brew install age
  Debian/Ubuntu:  sudo apt install age
  Other:  https://github.com/FiloSottile/age

Then re-run this script.
EOF
  exit 1
fi

for NAME in treasury operations deploy kc-call; do
  if [ ! -f "${SRC_DIR}/unplugged-${NAME}.json" ]; then
    echo "ERROR: Missing keypair file: ${SRC_DIR}/unplugged-${NAME}.json" >&2
    echo "Run scripts/generate-wallets.sh first." >&2
    exit 1
  fi
done

echo "Packing wallets from ${SRC_DIR} ..."
tar czf - \
  -C "${SRC_DIR}" \
  unplugged-treasury.json \
  unplugged-operations.json \
  unplugged-deploy.json \
  unplugged-kc-call.json \
  | age -p -o "${OUT_FILE}"

echo
echo "=== Backup complete ==="
echo "File: ${OUT_FILE}"
echo
echo "NEXT STEPS (manual):"
echo "1. MOVE this file to a USB drive or encrypted offline volume."
echo "2. DELETE the local copy after moving:  rm \"${OUT_FILE}\""
echo "3. Record the storage location in .planning/ops/wallets.md Backup section."
echo
echo "To restore later:  age -d -o restored.tar \"${OUT_FILE}\" && tar xzf restored.tar"
