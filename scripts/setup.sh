#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
ENGINE_DIR="$(cd "$SCRIPT_DIR/../../cdisc-rules-engine" && pwd)"
CACHE_DIR="$ENGINE_DIR/resources/cache"

echo "=== CDISC Rules Engine - Setup ==="
echo ""

# Check engine repo exists
if [ ! -d "$ENGINE_DIR" ]; then
    echo "ERROR: cdisc-rules-engine repo not found at $ENGINE_DIR"
    echo "Expected sibling directory: ../cdisc-rules-engine"
    exit 1
fi

# Create venv
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python venv at $VENV_DIR ..."
    python3 -m venv "$VENV_DIR"
else
    echo "Venv already exists at $VENV_DIR"
fi

# Activate and install
echo "Installing cdisc-rules-engine (editable) ..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -e "$ENGINE_DIR" --quiet

# Verify cache
if [ ! -d "$CACHE_DIR" ] || [ -z "$(ls "$CACHE_DIR"/*.pkl 2>/dev/null)" ]; then
    echo ""
    echo "WARNING: Cache not found at $CACHE_DIR"
    echo "You may need to run: cd $ENGINE_DIR && python core.py update-cache"
    echo "(Requires CDISC_LIBRARY_API_KEY env var)"
else
    PKL_COUNT=$(ls "$CACHE_DIR"/*.pkl 2>/dev/null | wc -l | tr -d ' ')
    echo "Cache OK: $PKL_COUNT .pkl files in $CACHE_DIR"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Example usage:"
echo "  $VENV_DIR/bin/python $SCRIPT_DIR/run_validation.py \\"
echo "    --datasets $ENGINE_DIR/tests/resources/datasets/ae.xpt \\"
echo "    --rules $ENGINE_DIR/tests/resources/rules/CG0272.yml \\"
echo "    --standard sdtmig \\"
echo "    --version 3-4"
