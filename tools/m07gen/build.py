#!/usr/bin/env python3
"""Generate content/modules/a2-m07-transport-getting-around/module.json."""
from __future__ import annotations

from .common import write_module
from .lessons_01_04 import lesson_l01, lesson_l02, lesson_l03, lesson_l04
from .lessons_05_08 import lesson_l05, lesson_l06, lesson_l07, lesson_l08
from .lessons_09_11 import lesson_l09, lesson_l10, lesson_l11


def main() -> None:
    lessons = [
        lesson_l01(),
        lesson_l02(),
        lesson_l03(),
        lesson_l04(),
        lesson_l05(),
        lesson_l06(),
        lesson_l07(),
        lesson_l08(),
        lesson_l09(),
        lesson_l10(),
        lesson_l11(),
    ]
    write_module(lessons)


if __name__ == "__main__":
    main()
