#!/usr/bin/env bash
set -e
cd /mnt/code
export PORT=${PORT:-8888}
export HOST=${HOST:-0.0.0.0}
node build/index.js
