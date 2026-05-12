#!/usr/bin/env bash
set -e

# Build on main, deploy artifacts to orphan 'deploy' branch.
# Usage:
#   ./deploy.sh          # build + update local deploy branch
#   ./deploy.sh --push   # build + update + push to remote

PUSH=false
if [[ "$1" == "--push" ]]; then
  PUSH=true
fi

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

# --- Guard: must be on main, working tree clean ---
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: Must be on 'main' branch (currently on '$BRANCH')" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

COMMIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# --- Build ---
echo "==> Building on main ($COMMIT_SHA)..."
pnpm run build

BUILD_DIR="$REPO_ROOT/packages/app/build"
if [[ ! -f "$BUILD_DIR/index.js" ]]; then
  echo "ERROR: Build output not found at $BUILD_DIR/index.js" >&2
  exit 1
fi

# --- Copy artifacts to temp dir ---
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp -r "$BUILD_DIR" "$TMPDIR/build"
cp "$REPO_ROOT/app.sh" "$TMPDIR/app.sh"

# Copy scripts directory (Python engine wrapper)
if [[ -d "$REPO_ROOT/scripts" ]]; then
  mkdir -p "$TMPDIR/scripts"
  cp "$REPO_ROOT/scripts/run_validation.py" "$TMPDIR/scripts/"
  cp "$REPO_ROOT/scripts/engine_shim.py" "$TMPDIR/scripts/"
  cp "$REPO_ROOT/scripts/requirements.txt" "$TMPDIR/scripts/" 2>/dev/null || true
  cp "$REPO_ROOT/scripts/setup.sh" "$TMPDIR/scripts/" 2>/dev/null || true
  echo "==> Copied scripts/ directory"
fi

# Copy engine cache (.pkl files) for Domino deployment
# On Domino this ends up at /mnt/code/cdisc/cdisc-rules-engine/resources/cache/
ENGINE_CACHE="$REPO_ROOT/../cdisc-rules-engine/resources/cache"
if [[ -d "$ENGINE_CACHE" ]]; then
  mkdir -p "$TMPDIR/cdisc/cdisc-rules-engine/resources/cache"
  cp "$ENGINE_CACHE"/*.pkl "$TMPDIR/cdisc/cdisc-rules-engine/resources/cache/"
  PKL_COUNT=$(ls "$TMPDIR/cdisc/cdisc-rules-engine/resources/cache/"*.pkl | wc -l | tr -d ' ')
  echo "==> Copied engine cache ($PKL_COUNT .pkl files)"
else
  echo "WARNING: Engine cache not found at $ENGINE_CACHE — skipping"
fi

# Minimal package.json for deploy branch
cat > "$TMPDIR/package.json" <<'PKGJSON'
{
  "name": "define-validation-deploy",
  "version": "0.0.1",
  "private": true,
  "type": "module"
}
PKGJSON

# .nvmrc pinned to Node 18 for Domino runtime
echo "18.16.0" > "$TMPDIR/.nvmrc"

# .gitignore — ignore everything except deploy artifacts
cat > "$TMPDIR/.gitignore" <<'GITIGNORE'
# Ignore everything
*

# Except deploy artifacts
!build/
!build/**
!app.sh
!package.json
!.nvmrc
!.gitignore
!scripts/
!scripts/**
!cdisc/
!cdisc/**
GITIGNORE

# --- Switch to deploy branch ---
echo "==> Switching to deploy branch..."
DEPLOY_EXISTS=$(git branch --list deploy)

if [[ -z "$DEPLOY_EXISTS" ]]; then
  # Create orphan branch
  git checkout --orphan deploy
  git rm -rf . > /dev/null 2>&1 || true
else
  git checkout deploy
  # Remove everything except .git
  git rm -rf . > /dev/null 2>&1 || true
fi

# --- Copy artifacts in ---
cp -r "$TMPDIR/build" .
cp "$TMPDIR/app.sh" .
cp "$TMPDIR/package.json" .
cp "$TMPDIR/.nvmrc" .
cp "$TMPDIR/.gitignore" .
if [[ -d "$TMPDIR/scripts" ]]; then
  cp -r "$TMPDIR/scripts" .
fi
if [[ -d "$TMPDIR/cdisc" ]]; then
  cp -r "$TMPDIR/cdisc" .
fi

# --- Commit only deploy artifacts ---
git add build/ app.sh package.json .nvmrc .gitignore
if [[ -d scripts ]]; then
  git add scripts/
fi
if [[ -d cdisc ]]; then
  git add cdisc/
fi
git commit -m "Deploy $COMMIT_SHA — $TIMESTAMP"

echo "==> Deploy branch updated (from main $COMMIT_SHA)"

# --- Optionally push ---
if [[ "$PUSH" == true ]]; then
  echo "==> Pushing deploy branch to domino repo..."
  git push -u domino deploy:main
fi

# --- Return to main ---
git checkout main
echo "==> Done. Back on main."
