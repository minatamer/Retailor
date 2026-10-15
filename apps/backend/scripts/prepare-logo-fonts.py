"""Offline only: python with fonttools[woff]==4.60.1 and brotli==1.2.0.

Derive static, renamed logo faces from the repository's licensed website fonts.
No download, system font lookup or application runtime dependency.
"""

import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[3]
source = root / "apps/frontend/public/fonts"
target = root / "apps/backend/src/brand/fonts"
target.mkdir(parents=True, exist_ok=True)
faces = [
    ("inter", "inter-latin-wght-normal.woff2", "inter-OFL.txt", "Sans", 600),
    ("editorial", "dm-serif-display-latin-400-normal.woff2", "dm-serif-display-OFL.txt", "Editorial", 400),
    ("modern", "manrope-latin-wght-normal.woff2", "manrope-OFL.txt", "Expressive", 700),
]
manifest = {}
for key, filename, license_file, label, weight in faces:
    font = TTFont(source / filename, recalcTimestamp=False)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": weight}, inplace=True)
    family = f"Retailor Logo {label}"
    for record in font["name"].names:
        values = {1: family, 2: "Regular", 3: f"{family}-1", 4: family,
                  6: family.replace(" ", ""), 16: family, 17: "Regular"}
        if record.nameID in values:
            record.string = values[record.nameID].encode(record.getEncoding())
    font.flavor = None
    font.save(target / f"{key}.ttf", reorderTables=True)
    codepoints = sorted(font.getBestCmap())
    ranges = []
    for codepoint in codepoints:
        if ranges and ranges[-1][1] + 1 == codepoint:
            ranges[-1][1] = codepoint
        else:
            ranges.append([codepoint, codepoint])
    (target / license_file).write_bytes((source / license_file).read_bytes())
    manifest[key] = {
        "family": family, "weight": weight, "file": f"{key}.ttf",
        "license": license_file, "source": f"apps/frontend/public/fonts/{filename}",
        "sourceSha256": hashlib.sha256((source / filename).read_bytes()).hexdigest(),
        "sha256": hashlib.sha256((target / f"{key}.ttf").read_bytes()).hexdigest(),
        "codepoints": ranges,
    }
(target / "provenance.json").write_text(
    json.dumps({"tool": "fonttools 4.60.1; brotli 1.2.0", "faces": manifest}, indent=2) + "\n",
    encoding="utf-8", newline="\n",
)
