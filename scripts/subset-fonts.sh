#!/usr/bin/env bash
set -euo pipefail

# Regenerates static/fonts/en/Alegreya.woff2 from the upstream Alegreya variable font.
# Only needs re-running when the character range below changes.
#
#   ./scripts/subset-fonts.sh
#
# Requires python3 (fontTools + brotli are installed into a local venv on first run).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${WORK_DIR:-$REPO_ROOT/.fontwork}"
OUT="$REPO_ROOT/static/fonts/en/Alegreya.woff2"

VENDOR_URL="https://raw.githubusercontent.com/google/fonts/main/ofl/alegreya/Alegreya%5Bwght%5D.ttf"
VENDOR_TTF="$WORK_DIR/Alegreya[wght].ttf"

# Basic Latin + Latin-1 Supplement + General Punctuation + guillemets + arrows.
# Deliberately no CJK: Alegreya has no Chinese glyphs, so jinkaiFont picks those up
# via the per-glyph fallback in --font-family-*.
UNICODES="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2039-203A,U+20AC,U+2190-2193"

# Latin text features. Trimming this to just kern+liga saves ~9 KB but silently
# breaks tnum, which base.css/.date-item relies on for aligned figures.
# Tags with no matching glyphs in the subset are pruned by fontTools automatically.
LAYOUT_FEATURES="ccmp,kern,liga,clig,calt,locl,tnum,lnum,onum,frac,sups,case,cpsp,mark,mkmk"

mkdir -p "$WORK_DIR" "$(dirname "$OUT")"

if [ ! -x "$WORK_DIR/venv/bin/pyftsubset" ]; then
  echo "==> Creating fontTools venv in $WORK_DIR/venv"
  python3 -m venv "$WORK_DIR/venv"
  "$WORK_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$WORK_DIR/venv/bin/pip" install --quiet fonttools brotli
fi

if [ ! -f "$VENDOR_TTF" ]; then
  echo "==> Downloading upstream Alegreya variable font"
  curl -fsSL -o "$VENDOR_TTF" "$VENDOR_URL"
fi

# --no-hinting       : drop grid-fitting bytecode, invisible at screen sizes
# --layout-features  : keep the Latin text features listed above
# flavor=woff2       : Brotli, roughly half the size of woff
# The wght axis is retained on purpose, so this single file covers 400-900.
echo "==> Subsetting"
"$WORK_DIR/venv/bin/pyftsubset" "$VENDOR_TTF" \
  --unicodes="$UNICODES" \
  --flavor=woff2 \
  --no-hinting \
  --layout-features="$LAYOUT_FEATURES" \
  --drop-tables+=DSIG \
  --output-file="$OUT"

"$WORK_DIR/venv/bin/python" - "$OUT" <<'PY'
import sys
from fontTools.ttLib import TTFont

path = sys.argv[1]
font = TTFont(path)
axes = [(a.axisTag, int(a.minValue), int(a.maxValue)) for a in font["fvar"].axes]
import os
print(
    f"==> {os.path.basename(path)}: {os.path.getsize(path) / 1024:.1f} KB, "
    f"{font['maxp'].numGlyphs} glyphs, axes={axes}"
)
PY
