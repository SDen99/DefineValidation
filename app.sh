#!/usr/bin/env bash
set -e
cd /mnt/code
export PORT=${PORT:-8888}
export HOST=${HOST:-0.0.0.0}

# Set up Python venv for CDISC engine (if scripts/ exists and venv doesn't)
if [[ -d scripts && ! -d scripts/.venv ]]; then
  echo "[app.sh] Setting up Python venv for CDISC engine..."
  if [[ -f scripts/setup.sh ]]; then
    bash scripts/setup.sh || echo "[app.sh] WARNING: venv setup failed — engine validation will be unavailable"
  fi
fi

node build/index.js
