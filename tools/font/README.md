# Journie Display

The headline typeface of Journie, drawn for the project.

Every glyph is a **skeleton**: a centre-line made of lines, arcs and Béziers (`glyphs.py`). The skeleton is swept with a
tilted elliptical **nib** (`nib.py`), the way a broad pen moves, so verticals come out thick and the strokes that run
along the nib come out thin. Vietnamese letters are composites: a base glyph plus a diacritic mark placed by rule
(`build.py`, side placement for acute and grave on circumflex letters, stacking for hook and tilde).

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install fonttools shapely brotli numpy pillow
python build.py              # Regular, Bold, Italic -> ../../src/assets/fonts/*.woff2 (and ./out/*.ttf)
python build.py Regular      # one style
```

Details worth knowing:

- The dot of `i` and `j` is a small ring, a nod to the map pin in the logo.
- Marks use a lighter nib than the letters so they stay open at small sizes.
- Kerning is class based: every accented form kerns like its base letter (`KERN` in `build.py`).
- Weights are the same skeletons with a wider nib; the italic is the regular sheared by 10°.
- The font has no hinting; `gasp` asks for grayscale smoothing at every size.

Glyphs that are not drawn yet (for example `₫`, `@`, `#`) fall back to the next font in the stack.
