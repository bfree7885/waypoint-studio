#!/usr/bin/env python3
"""Decode an image to RGBA at a target long edge; write raw bytes to stdout."""
import sys
from PIL import Image

path = sys.argv[1]
long_edge = int(sys.argv[2]) if len(sys.argv) > 2 else 320
im = Image.open(path).convert("RGBA")
w, h = im.size
scale = min(1.0, long_edge / max(w, h))
nw = max(8, int(round(w * scale)))
nh = max(8, int(round(h * scale)))
im = im.resize((nw, nh), Image.Resampling.BILINEAR)
sys.stdout.buffer.write(f"{nw} {nh}\n".encode("ascii"))
sys.stdout.buffer.write(im.tobytes())
