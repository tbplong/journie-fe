"""
Builds the Journie Display typeface (Regular, Bold, Italic) from the pen skeletons in glyphs.py.

    python build.py            # writes ../../src/assets/fonts/journie-display-*.woff2 (+ .ttf in ./out)

Requires: fonttools, brotli, shapely, numpy.
"""
from __future__ import annotations

import math
import sys
import unicodedata
from pathlib import Path

import numpy as np
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable
from shapely import affinity
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from glyphs import CAP, XH, Letters, Spec, marks
from nib import Nib, sweep

HERE = Path(__file__).parent
OUT = HERE / 'out'
FONT_DIR = HERE.parent.parent / 'src' / 'assets' / 'fonts'

UPM = 1000

STYLES = {
    'Regular': dict(nib=Nib(112, 26, 27), weight=400, italic=False, extra=0),
    'Bold': dict(nib=Nib(152, 35, 27), weight=700, italic=False, extra=10),
    'Italic': dict(nib=Nib(112, 26, 27), weight=400, italic=True, extra=0),
}
SLANT = math.tan(math.radians(10))

NAMES = {
    'space': 0x20, 'exclam': 0x21, 'quotedbl': 0x22, 'quotesingle': 0x27, 'parenleft': 0x28, 'parenright': 0x29,
    'plus': 0x2B, 'comma': 0x2C, 'hyphen': 0x2D, 'period': 0x2E, 'slash': 0x2F, 'colon': 0x3A, 'semicolon': 0x3B,
    'equal': 0x3D, 'question': 0x3F, 'ampersand': 0x26, 'percent': 0x25, 'degree': 0xB0, 'multiply': 0xD7,
    'periodcentered': 0xB7, 'endash': 0x2013, 'emdash': 0x2014, 'quoteleft': 0x2018, 'quoteright': 0x2019,
    'quotedblleft': 0x201C, 'quotedblright': 0x201D, 'ellipsis': 0x2026,
    'dcroat': 0x111, 'Dcroat': 0x110, 'ohorn': 0x1A1, 'Ohorn': 0x1A0, 'uhorn': 0x1B0, 'Uhorn': 0x1AF,
    'zero': 0x30, 'one': 0x31, 'two': 0x32, 'three': 0x33, 'four': 0x34, 'five': 0x35, 'six': 0x36, 'seven': 0x37,
    'eight': 0x38, 'nine': 0x39,
}
for c in range(ord('a'), ord('z') + 1):
    NAMES[chr(c)] = c
for c in range(ord('A'), ord('Z') + 1):
    NAMES[chr(c)] = c

MARK_OF = {0x300: 'grave', 0x301: 'acute', 0x303: 'tilde', 0x309: 'hook', 0x323: 'dotbelow', 0x302: 'circumflex', 0x306: 'breve'}
BASE_ALIAS = {'ơ': 'ohorn', 'ư': 'uhorn', 'Ơ': 'Ohorn', 'Ư': 'Uhorn', 'đ': 'dcroat', 'Đ': 'Dcroat'}


def to_pen(geom, pen: TTGlyphPen) -> None:
    polys = [geom] if isinstance(geom, Polygon) else list(getattr(geom, 'geoms', []))
    for poly in polys:
        if poly.is_empty:
            continue
        poly = orient(poly.simplify(0.45, preserve_topology=True), sign=-1.0)
        for ring in [poly.exterior, *poly.interiors]:
            pts = []
            for x, y in ring.coords[:-1]:
                p = (int(round(x)), int(round(y)))
                if not pts or pts[-1] != p:
                    pts.append(p)
            if len(pts) < 3:
                continue
            pen.moveTo(pts[0])
            for p in pts[1:]:
                pen.lineTo(p)
            pen.closePath()


KERN = {
    # (left class, right class): value in font units
    'A': {'V': -80, 'W': -60, 'Y': -90, 'T': -80, 'v': -40, 'w': -40, 'y': -50, 'quoteright': -60},
    'L': {'T': -90, 'V': -90, 'W': -70, 'Y': -100, 'y': -40, 'quoteright': -80},
    'T': {'a': -75, 'e': -75, 'o': -75, 'c': -70, 'r': -50, 'u': -50, 'i': -20, 'y': -50, 's': -60, 'A': -80, 'comma': -70, 'period': -70, 'hyphen': -50},
    'V': {'A': -80, 'a': -50, 'e': -50, 'o': -50, 'u': -30, 'r': -30, 'comma': -70, 'period': -70},
    'W': {'A': -50, 'a': -40, 'e': -40, 'o': -40, 'comma': -50, 'period': -50},
    'Y': {'A': -90, 'a': -70, 'e': -70, 'o': -70, 'u': -50, 'c': -70, 'i': -20, 'comma': -80, 'period': -80},
    'P': {'A': -80, 'a': -20, 'e': -20, 'o': -20, 'comma': -90, 'period': -90},
    'F': {'A': -60, 'a': -30, 'e': -30, 'o': -30, 'comma': -80, 'period': -80},
    'r': {'comma': -60, 'period': -60},
    'y': {'comma': -60, 'period': -60, 'a': -20, 'e': -20, 'o': -20},
    'v': {'comma': -60, 'period': -60, 'a': -20, 'e': -20, 'o': -20},
    'w': {'comma': -50, 'period': -50},
    'quoteleft': {'A': -50},
}


def add_kerning(font, cmap: dict[int, str]) -> None:
    """Class kerning: every accented form of a letter kerns like its base letter."""
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

    members: dict[str, list[str]] = {}
    for code, name in cmap.items():
        base = name
        if name.startswith('uni'):
            nfd = unicodedata.normalize('NFD', chr(code))
            base = BASE_ALIAS.get(unicodedata.normalize('NFC', nfd[0] + nfd[1]), nfd[0]) if len(nfd) > 1 and ord(nfd[1]) == 0x31B else BASE_ALIAS.get(nfd[0], nfd[0])
        members.setdefault(base, []).append(name)
    lines = []
    for base, names in members.items():
        lines.append(f'@K_{base} = [{" ".join(sorted(set(names)))}];')
    pairs = []
    for left, rights in KERN.items():
        for right, value in rights.items():
            if left in members and right in members:
                pairs.append(f'    pos @K_{left} @K_{right} {value};')
    fea = '\n'.join(lines) + '\nfeature kern {\n' + '\n'.join(pairs) + '\n} kern;\n'
    addOpenTypeFeaturesFromString(font, fea)


def build_style(style: str) -> Path:
    cfg = STYLES[style]
    nib: Nib = cfg['nib']
    k = SLANT if cfg['italic'] else 0.0
    letters = Letters(nib)
    specs: dict[str, Spec] = {}
    for part in (letters.lower(), letters.upper(), letters.figures(), letters.punct()):
        specs.update(part)

    geoms: dict[str, object] = {}
    adv: dict[str, int] = {}
    anchors: dict[str, float] = {}

    def shear(geom):
        return affinity.affine_transform(geom, [1, k, 0, 1, 0, 0]) if k else geom

    for name, spec in specs.items():
        parts = [sweep(nib, s) for s in spec.strokes] + list(spec.extra)
        if not parts:
            geoms[name] = Polygon()
            adv[name] = 250
            continue
        g = unary_union(parts)
        minx, miny, maxx, maxy = g.bounds
        lsb = spec.lsb + cfg['extra']
        rsb = spec.rsb + cfg['extra']
        shift = lsb - minx
        g = affinity.translate(g, shift, 0)
        anchor = (spec.anchor + shift) if spec.anchor is not None else (lsb + (maxx - minx) / 2)
        adv[name] = int(round(maxx - minx + lsb + rsb))
        anchors[name] = anchor
        geoms[name] = shear(g)

    # diacritic marks, normalised so each sits with its ink bottom at y=0, centred on x=0
    mark_geom: dict[str, object] = {}
    mark_h: dict[str, float] = {}
    mark_nib = Nib(nib.width * 0.62, nib.thickness * 0.8, nib.angle)
    for mname, strokes in marks(nib).items():
        g = unary_union([sweep(mark_nib, s) for s in strokes])
        minx, miny, maxx, maxy = g.bounds
        g = affinity.translate(g, -(minx + maxx) / 2, -miny)
        mark_h[mname] = maxy - miny
        mark_geom[mname] = shear(g)

    glyph_order = ['.notdef'] + [n for n in specs if n != 'dotlessi'] + ['dotlessi']
    glyph_order += [f'_{m}' for m in mark_geom]
    cmap = {code: name for name, code in NAMES.items() if name in specs}

    # Vietnamese precomposed letters as components: base + marks
    composites: dict[str, list[tuple[str, float, float]]] = {}
    ranges = list(range(0xC0, 0x180)) + list(range(0x1A0, 0x1B1)) + list(range(0x1EA0, 0x1EFA))
    for code in ranges:
        ch = chr(code)
        if code in cmap:
            continue
        nfd = unicodedata.normalize('NFD', ch)
        base, rest = nfd[0], list(nfd[1:])
        if rest and ord(rest[0]) == 0x31B:  # horn becomes part of the base glyph
            base = BASE_ALIAS.get(unicodedata.normalize('NFC', base + rest[0]))
            rest = rest[1:]
            if base is None:
                continue
        elif ch in BASE_ALIAS:
            continue
        else:
            base = BASE_ALIAS.get(base, base)
        if base == 'i':
            base = 'dotlessi' if rest else 'i'
        if base not in specs or any(ord(r) not in MARK_OF for r in rest):
            continue
        upper = base[0].isupper()
        top = (CAP if upper else XH) + (56 if upper else 54)
        horn = base in ('ohorn', 'uhorn', 'Ohorn', 'Uhorn')
        ax = anchors[base] - (12 if horn else 0)
        shapes = [MARK_OF[ord(r)] for r in rest if MARK_OF[ord(r)] in ('circumflex', 'breve')]
        tones = [MARK_OF[ord(r)] for r in rest if MARK_OF[ord(r)] in ('acute', 'grave', 'hook', 'tilde')]
        below = [MARK_OF[ord(r)] for r in rest if MARK_OF[ord(r)] == 'dotbelow']
        parts: list[tuple[str, float, float]] = [(base, 0, 0)]
        y = top
        if shapes:
            parts.append((f'_{shapes[0]}', ax, y))
        for tone in tones:
            if shapes and shapes[0] == 'circumflex' and tone in ('acute', 'grave'):
                parts.append((f'_{tone}', ax + (84 if tone == 'acute' else -84), y + 72))
            elif shapes:
                parts.append((f'_{tone}', ax + (6 if shapes[0] == 'circumflex' else 0), y + (134 if shapes[0] == 'circumflex' else 108)))
            else:
                parts.append((f'_{tone}', ax, y))
        for _ in below:
            parts.append(('_dotbelow', ax - (6 if horn else 0), -(mark_h['dotbelow'] + 34)))
        glyph_name = f'uni{code:04X}'
        composites[glyph_name] = [(n, dx + (dy * k), dy) for n, dx, dy in parts]
        cmap[code] = glyph_name
        glyph_order.append(glyph_name)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)

    glyphs = {}
    metrics = {}
    notdef = TTGlyphPen(None)
    notdef.moveTo((60, 0)); notdef.lineTo((60, 700)); notdef.lineTo((460, 700)); notdef.lineTo((460, 0)); notdef.closePath()
    notdef.moveTo((110, 50)); notdef.lineTo((410, 50)); notdef.lineTo((410, 650)); notdef.lineTo((110, 650)); notdef.closePath()
    glyphs['.notdef'] = notdef.glyph()
    metrics['.notdef'] = 520
    for name, g in geoms.items():
        pen = TTGlyphPen(None)
        to_pen(g, pen)
        glyphs[name] = pen.glyph()
        metrics[name] = adv[name]
    for mname, g in mark_geom.items():
        pen = TTGlyphPen(None)
        to_pen(g, pen)
        glyphs[f'_{mname}'] = pen.glyph()
        metrics[f'_{mname}'] = 0
    for gname, parts in composites.items():
        pen = TTGlyphPen(glyphs)
        for comp, dx, dy in parts:
            pen.addComponent(comp, (1, 0, 0, 1, int(round(dx)), int(round(dy))))
        glyphs[gname] = pen.glyph()
        base = parts[0][0]
        metrics[gname] = metrics[base]

    fb.setupGlyf(glyphs)
    glyf = fb.font['glyf']
    hmtx = {}
    for name in glyph_order:
        gl = glyf[name]
        gl.recalcBounds(glyf)
        hmtx[name] = (metrics[name], getattr(gl, 'xMin', 0) if gl.numberOfContours != 0 else 0)
    fb.setupHorizontalMetrics(hmtx)
    fb.setupHorizontalHeader(ascent=960, descent=-300, lineGap=0)

    family = 'Journie Display'
    bold = cfg['weight'] >= 700
    ital = cfg['italic']
    sub = 'Bold' if bold else ('Italic' if ital else 'Regular')
    fb.setupNameTable(
        {
            'familyName': family,
            'styleName': sub,
            'uniqueFontIdentifier': f'JournieDisplay-{sub}-1.0',
            'fullName': f'{family} {sub}',
            'psName': f'JournieDisplay-{sub}',
            'version': 'Version 1.000',
            'copyright': 'Drawn for the Journie project.',
        }
    )
    fb.setupOS2(
        version=4, sTypoAscender=900, sTypoDescender=-260, sTypoLineGap=0, usWinAscent=1040, usWinDescent=320,
        sxHeight=XH, sCapHeight=CAP, usWeightClass=cfg['weight'], fsType=0,
        fsSelection=(1 << 7) | (1 if ital else 0) << 0 | ((1 << 5) if bold else 0) | ((1 << 6) if not (bold or ital) else 0),
        xAvgCharWidth=int(np.mean([v for v in adv.values() if v > 0])),
    )
    add_kerning(fb.font, cmap)
    fb.setupPost(keepGlyphNames=False, italicAngle=-10 if ital else 0)
    head = fb.font['head']
    head.macStyle = (1 if bold else 0) | (2 if ital else 0)
    gasp = newTable('gasp')
    gasp.version = 1
    gasp.gaspRange = {65535: 0x000F}
    fb.font['gasp'] = gasp

    OUT.mkdir(exist_ok=True)
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    ttf = OUT / f'journie-display-{sub.lower()}.ttf'
    fb.save(ttf)
    from fontTools.ttLib import TTFont

    font = TTFont(ttf)
    font.flavor = 'woff2'
    font.save(FONT_DIR / f'journie-display-{sub.lower()}.woff2')
    return ttf


if __name__ == '__main__':
    for style in sys.argv[1:] or STYLES:
        path = build_style(style)
        print('built', path, path.stat().st_size // 1024, 'KB')
