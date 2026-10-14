"""Outline the approved local Inter800 R; no app dependency or font install.

Usage: python outline.py path/to/temporary-fonttools-directory
The temporary fontTools4.60.1 exporter can live in ignored local artifacts.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

root = Path(__file__).resolve().parents[4]
font = TTFont(root / "apps/frontend/public/fonts/inter-latin-wght-normal.woff2")
instance = instantiateVariableFont(font, {"wght": 800})
glyphs = instance.getGlyphSet()
pen = SVGPathPen(glyphs)
glyphs[instance.getBestCmap()[ord("R")]].draw(pen)
output = {"family": "Inter", "weight": 800,
          "unitsPerEm": instance["head"].unitsPerEm, "path": pen.getCommands()}
Path(__file__).with_name("r-outline.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
print(f"Outlined Inter800 R at {output['unitsPerEm']} units/em")
