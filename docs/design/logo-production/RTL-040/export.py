"""Export the complete approved logo as paths, independent of browser fonts.

Usage: python export.py <fonttools-directory> <uharfbuzz-directory>
Tools live only in ignored local artifacts, never application dependencies.
"""

import hashlib
import io
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path[:0] = sys.argv[1:3]
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

directory = Path(__file__).resolve().parent
root = directory.parents[3]
public = root / "apps/frontend/public"
font_path = public / "fonts/inter-latin-wght-normal.woff2"
font = instantiateVariableFont(TTFont(font_path), {"wght": 800})
font.flavor = None
buffer = io.BytesIO()
font.save(buffer)
hb_font = hb.Font(hb.Face(buffer.getvalue()))
text = hb.Buffer()
text.add_str("retailor")
text.guess_segment_properties()
hb.shape(hb_font, text)
glyphs = font.getGlyphSet()
order = font.getGlyphOrder()
# Match the old live logo: cart1.25em, gap.25em, type1em with -.045em tracking.
# SVG coordinates128px =1.25em, so the type is102.4px and starts at153.6px.
font_size = 102.4
scale = font_size / font["head"].unitsPerEm
x = 153.6
paths = []
for glyph, position in zip(text.glyph_infos, text.glyph_positions):
    pen = SVGPathPen(glyphs)
    transform = TransformPen(pen, (scale, 0, 0, -scale,
                                  x + position.x_offset * scale,
                                  101.2 - position.y_offset * scale))
    glyphs[order[glyph.codepoint]].draw(transform)
    paths.append(f'<path d="{pen.getCommands()}"/>')
    x += position.x_advance * scale - .045 * font_size

cart_path = public / "brand/retailor-cart.svg"
cart = cart_path.read_text(encoding="utf-8")
cart_geometry = cart[cart.index(">") + 1:cart.rindex("</svg>")]
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{x:.4f}" height="128" '
       f'viewBox="0 0 {x:.4f} 128">{cart_geometry}'
       '<g fill="#242b60">' + "".join(paths) + '</g></svg>\n')
destination = public / "brand/retailor-lockup.svg"
destination.write_text(svg, encoding="utf-8", newline="\n")
# Fail rather than silently ship any font-dependent/external/active SVG content.
tree = ET.fromstring(svg)
assert all(node.tag.rsplit("}", 1)[-1] in {"svg", "g", "path", "circle"}
           for node in tree.iter())
assert not any(name in node.attrib for node in tree.iter()
               for name in ("href", "style", "font-family"))
record = {"approved": "RTL-037 draft03 A; same cart as RTL-039",
          "wordmark": "Existing Inter800, HarfBuzz shaping, -.045em tracking; paths only",
          "fontSha256": hashlib.sha256(font_path.read_bytes()).hexdigest(),
          "cartSha256": hashlib.sha256(cart_path.read_bytes()).hexdigest(),
          "lockupSha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
          "width": round(x, 4), "height": 128,
          "widthEm": round(x / 102.4, 8),
          "tools": {"fontTools": "4.60.1", "uharfbuzz": "0.53.0"}}
directory.joinpath("provenance.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8", newline="\n")
directory.joinpath("FONT-LICENSE.txt").write_bytes((public / "fonts/inter-OFL.txt").read_bytes())
print(json.dumps(record))
