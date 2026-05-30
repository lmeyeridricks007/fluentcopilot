#!/usr/bin/env python3
"""Regenerate content/modules/a2-m07-transport-getting-around/module.json (Stage 6 depth)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.m07gen.build import main

if __name__ == "__main__":
    main()
