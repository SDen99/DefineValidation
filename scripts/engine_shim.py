#!/usr/bin/env python3
"""
Shim that patches pyreadstat.read_xport to handle non-UTF-8 XPT files,
then delegates to the CDISC Rules Engine core.py.

Usage: python engine_shim.py /path/to/core.py [core.py args...]
"""
import os
import sys
import pyreadstat

# Monkey-patch read_xport to retry with latin1 on UnicodeDecodeError
_original_read_xport = pyreadstat.read_xport


def _read_xport_with_fallback(*args, **kwargs):
    try:
        return _original_read_xport(*args, **kwargs)
    except UnicodeDecodeError:
        if "encoding" not in kwargs:
            kwargs["encoding"] = "latin1"
            return _original_read_xport(*args, **kwargs)
        raise


pyreadstat.read_xport = _read_xport_with_fallback

# Only exec core.py in the main process — multiprocessing spawn
# re-imports this module in child processes (as __mp_main__),
# where we only need the patch above, not the delegation.
if __name__ == "__main__":
    core_py = sys.argv[1]
    sys.argv = sys.argv[1:]  # [core.py, "validate", ...]

    # Ensure the engine directory is on sys.path so its modules resolve
    engine_dir = os.path.dirname(os.path.abspath(core_py))
    if engine_dir not in sys.path:
        sys.path.insert(0, engine_dir)

    with open(core_py) as f:
        code = compile(f.read(), core_py, "exec")
        exec(code, {"__name__": "__main__", "__file__": core_py})
