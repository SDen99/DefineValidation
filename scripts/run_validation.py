#!/usr/bin/env python3
"""
Thin wrapper around the CDISC Rules Engine CLI.

Accepts dataset paths, rule paths, standard/version, and outputs
structured JSON to stdout. Designed to be called by Node.js subprocess
in Phase 2.

Usage:
    python run_validation.py \
        --datasets /path/to/ae.xpt /path/to/dm.xpt \
        --rules /path/to/rules_dir \
        --standard sdtmig \
        --version 3-4

    python run_validation.py \
        --datasets /path/to/ae.xpt \
        --rules /path/to/CG0272.yml \
        --standard sdtmig \
        --version 3-4 \
        --raw
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

def find_engine_dir():
    """Locate the cdisc-rules-engine directory.

    Search order:
      1. /mnt/code/cdisc/cdisc-rules-engine  (Domino deployment)
      2. ../../cdisc-rules-engine              (local dev — sibling directory)
    """
    # Domino deployment location
    domino_dir = "/mnt/code/cdisc/cdisc-rules-engine"
    if os.path.isdir(domino_dir):
        return domino_dir

    # Local dev — sibling of the project root
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(scripts_dir)
    engine_dir = os.path.join(os.path.dirname(project_dir), "cdisc-rules-engine")
    if os.path.isdir(engine_dir):
        return engine_dir
    return None


def find_cache_dir(engine_dir):
    """Return the cache directory path if it exists with .pkl files."""
    cache_dir = os.path.join(engine_dir, "resources", "cache")
    if not os.path.isdir(cache_dir):
        return None
    pkl_files = [f for f in os.listdir(cache_dir) if f.endswith(".pkl")]
    if not pkl_files:
        return None
    return cache_dir


def find_python():
    """Find the venv Python, falling back to system python3."""
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(scripts_dir, ".venv", "bin", "python")
    if os.path.isfile(venv_python):
        return venv_python
    return sys.executable


def error_json(message):
    """Print a structured error to stdout and exit."""
    print(json.dumps({"status": "error", "error": message}))
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Run CDISC Rules Engine validation and output JSON results."
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        required=True,
        help="Paths to dataset files (.xpt, .json, .ndjson, .xlsx)",
    )
    parser.add_argument(
        "--rules",
        nargs="+",
        required=False,
        default=None,
        help="Paths to local rule files or directories (YAML/JSON). If omitted, uses cached rules only.",
    )
    parser.add_argument(
        "--standard",
        required=True,
        help="CDISC standard to validate against (e.g. sdtmig, adamig)",
    )
    parser.add_argument(
        "--version",
        required=True,
        help="Standard version (e.g. 3-4)",
    )
    parser.add_argument(
        "--cache",
        default=None,
        help="Path to cache directory (defaults to engine's resources/cache/)",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        default=False,
        help="Use raw report format (engine's internal JSON structure)",
    )
    parser.add_argument(
        "--pool-size",
        type=int,
        default=int(os.environ.get("CDISC_POOL_SIZE", "2")),
        help="Number of parallel processes for validation (default: 2, or CDISC_POOL_SIZE env var)",
    )

    args = parser.parse_args()

    # --- Validate engine location ---
    engine_dir = find_engine_dir()
    if not engine_dir:
        error_json(
            "cdisc-rules-engine not found. "
            "Searched: /mnt/code/cdisc/cdisc-rules-engine (Domino), "
            "../../cdisc-rules-engine (local dev)"
        )

    core_py = os.path.join(engine_dir, "core.py")
    if not os.path.isfile(core_py):
        error_json(f"core.py not found at {core_py}")

    # Shim patches pyreadstat.read_xport to handle non-UTF-8 XPT files
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    engine_shim = os.path.join(scripts_dir, "engine_shim.py")

    # --- Validate cache ---
    if args.cache:
        cache_dir = args.cache
        if not os.path.isdir(cache_dir):
            error_json(f"Cache directory not found: {cache_dir}")
    else:
        cache_dir = find_cache_dir(engine_dir)
        if not cache_dir:
            error_json(
                "Cache not found. Run scripts/setup.sh first, "
                "or provide --cache /path/to/cache"
            )

    # --- Validate dataset files exist ---
    for ds in args.datasets:
        if not os.path.isfile(ds):
            error_json(f"Dataset file not found: {ds}")

    # --- Validate rule paths exist ---
    if args.rules:
        for rule_path in args.rules:
            if not os.path.exists(rule_path):
                error_json(f"Rule path not found: {rule_path}")

    # --- Find Python executable ---
    python_exe = find_python()

    # --- Build the command ---
    # Note: the engine appends the format extension to the output path,
    # so we use "results" and expect "results.json" to be created.
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_base = os.path.join(tmp_dir, "results")
        output_file = output_base + ".json"

        cmd = [
            python_exe,
            engine_shim,
            core_py,
            "validate",
            "-s", args.standard,
            "-v", args.version,
            "-ca", cache_dir,
            "-of", "JSON",
            "-o", output_base,
            "-p", "disabled",
            "-l", "disabled",
            "-ps", str(args.pool_size),
        ]

        if args.raw:
            cmd.append("-rr")

        # Add dataset paths
        for ds in args.datasets:
            cmd.extend(["-dp", ds])

        # Add local rule paths (if any)
        if args.rules:
            for rule_path in args.rules:
                cmd.extend(["-lr", rule_path])

        # --- Run the engine ---
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=engine_dir,
                timeout=600,
            )
        except subprocess.TimeoutExpired:
            error_json("Validation timed out after 600 seconds")
        except FileNotFoundError:
            error_json(
                f"Python executable not found: {python_exe}. "
                "Run scripts/setup.sh to create the venv."
            )

        # --- Read output ---
        if os.path.isfile(output_file):
            with open(output_file, "r") as f:
                try:
                    results = json.load(f)
                except json.JSONDecodeError as e:
                    error_json(f"Failed to parse engine output JSON: {e}")

            output = {
                "status": "success",
                "results": results,
            }
            # Include stderr if there were warnings
            if result.stderr and result.stderr.strip():
                output["warnings"] = result.stderr.strip()

            print(json.dumps(output))
        else:
            # No output file — engine failed
            stderr = result.stderr.strip() if result.stderr else ""
            stdout = result.stdout.strip() if result.stdout else ""
            detail = stderr or stdout or "Unknown error (no output produced)"
            error_json(f"Engine failed (exit code {result.returncode}): {detail}")


if __name__ == "__main__":
    main()
