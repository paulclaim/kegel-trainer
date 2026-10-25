#!/usr/bin/env python3
"""Generate PWA PNG icons from the brand gradient (no third-party deps).

Renders the same mark as the inline SVG favicon: a diagonal gradient
circle (emerald -> indigo) with a translucent white inner circle.

Usage: python3 scripts/generate_icons.py
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON_DIR = ROOT / 'icons'

# 品牌渐变色（与 index.html 内联 SVG favicon 保持一致）
GRAD_START = (16, 185, 129)    # #10b981 emerald
GRAD_END = (99, 102, 241)      # #6366f1 indigo
INNER_WHITE = (255, 255, 255, 242)  # 约 0.95 不透明度


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def render(size: int, outer_ratio: float) -> bytearray:
    """Draw the icon into an RGBA pixel buffer."""
    pixels = bytearray(size * size * 4)
    center = (size - 1) / 2
    r_out = outer_ratio * size
    r_in = r_out * 0.56

    for y in range(size):
        for x in range(size):
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5

            alpha_out = clamp(r_out - dist + 0.5)  # 1px 抗锯齿边缘
            if alpha_out <= 0:
                continue

            t = clamp((dx + dy) / (2 * r_out) + 0.5)
            rgb = lerp(GRAD_START, GRAD_END, t)

            # 内圈白色圆叠加
            alpha_in = clamp(r_in - dist + 0.5) * (INNER_WHITE[3] / 255)
            if alpha_in > 0:
                rgb = tuple(
                    round(INNER_WHITE[i] * alpha_in + rgb[i] * (1 - alpha_in))
                    for i in range(3)
                )

            offset = (y * size + x) * 4
            pixels[offset:offset + 4] = bytes(rgb) + bytes([round(alpha_out * 255)])

    return pixels


def write_png(path: Path, size: int, pixels: bytearray) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack('>I', len(data))
            + tag
            + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    stride = size * 4
    raw = b''.join(b'\x00' + bytes(pixels[y * stride:(y + 1) * stride]) for y in range(size))
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    path.write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def main() -> None:
    ICON_DIR.mkdir(exist_ok=True)
    # 常规图标：圆形占满画布；maskable：收缩到 80% 安全区内
    for name, size, ratio in [
        ('icon-192.png', 192, 0.48),
        ('icon-512.png', 512, 0.48),
        ('icon-192-maskable.png', 192, 0.38),
        ('icon-512-maskable.png', 512, 0.38),
    ]:
        write_png(ICON_DIR / name, size, render(size, ratio))
        print(f'✓ {ICON_DIR / name}')


if __name__ == '__main__':
    main()
