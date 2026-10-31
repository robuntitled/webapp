#!/usr/bin/env python3
"""Rimappa verde/corallo del logo ai token brand senza alterare le sfumature."""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "public/assets/logoFlygetr.png"
DST = SRC

GREEN = (0x0F, 0x76, 0x6E)
CORAL = (0xF9, 0x73, 0x16)


def rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)


def hsl_to_rgb(h: float, l: float, s: float) -> tuple[int, int, int]:
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return int(round(r * 255)), int(round(g * 255)), int(round(b * 255))


def target_hue(rgb: tuple[int, int, int]) -> float:
    return rgb_to_hsl(*rgb)[0]


GREEN_H = target_hue(GREEN)
CORAL_H = target_hue(CORAL)


def classify(h: float, s: float, r: int, g: int, b: int) -> str | None:
    deg = h * 360
    if s < 0.12:
        return None
    if 135 <= deg <= 205 and g >= r - 8:
        return "green"
    if (deg <= 45 or deg >= 330) and r >= g + 5:
        return "coral"
    return None


def recolor_pixel(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 8:
        return r, g, b, a
    h, l, s = rgb_to_hsl(r, g, b)
    bucket = classify(h, s, r, g, b)
    if bucket == "green":
        nr, ng, nb = hsl_to_rgb(GREEN_H, l, s)
        return nr, ng, nb, a
    if bucket == "coral":
        nr, ng, nb = hsl_to_rgb(CORAL_H, l, s)
        return nr, ng, nb, a
    return r, g, b, a


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    out = Image.new("RGBA", img.size)
    px_in = img.load()
    px_out = out.load()
    for y in range(img.height):
        for x in range(img.width):
            px_out[x, y] = recolor_pixel(*px_in[x, y])
    out.save(DST, optimize=True)
    print(f"Updated {DST}")


if __name__ == "__main__":
    main()
