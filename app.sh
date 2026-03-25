#!/usr/bin/env bash
set -e

cd /mnt/code

npm install

export PORT={PORT:-8888}

npm run start
