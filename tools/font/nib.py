"""
Broad-nib pen model for the Journie Display typeface.

Every glyph is drawn as one or more centre-lines (a "skeleton") and then swept with an elliptical nib,
the way a pen with a tilted, flat-ish tip would move. Strokes that run across the nib come out thick,
strokes that run along it come out thin, which gives the letters their warm hand-lettered contrast.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from shapely import affinity
from shapely.geometry import MultiPoint, Point, Polygon
from shapely.ops import unary_union


@dataclass(frozen=True)
class Nib:
    width: float  # long axis of the ellipse
    thickness: float  # short axis
    angle: float  # degrees, rising to the right

    @property
    def hh(self) -> float:
        """Half of the horizontal extent: half the width of a vertical stem."""
        a, b, t = self.width / 2, self.thickness / 2, math.radians(self.angle)
        return math.hypot(a * math.cos(t), b * math.sin(t))

    @property
    def hv(self) -> float:
        """Half of the vertical extent: half the thickness of a horizontal stroke."""
        a, b, t = self.width / 2, self.thickness / 2, math.radians(self.angle)
        return math.hypot(a * math.sin(t), b * math.cos(t))

    def footprint(self, n: int = 40) -> np.ndarray:
        a, b, t = self.width / 2, self.thickness / 2, math.radians(self.angle)
        ang = np.linspace(0, 2 * math.pi, n, endpoint=False)
        x, y = a * np.cos(ang), b * np.sin(ang)
        c, s = math.cos(t), math.sin(t)
        return np.stack([x * c - y * s, x * s + y * c], axis=1)


def sweep(nib: Nib, path: np.ndarray) -> Polygon:
    """Minkowski-style sweep of the nib along a sampled path."""
    foot = nib.footprint()
    pts = np.asarray(path, dtype=float)
    if len(pts) == 1:
        return Polygon(foot + pts[0])
    hulls = []
    for i in range(len(pts) - 1):
        cloud = np.vstack([foot + pts[i], foot + pts[i + 1]])
        hulls.append(MultiPoint(cloud).convex_hull)
    return unary_union(hulls)


# ───────── path helpers (all return N×2 arrays) ─────────

def _densify(pts: np.ndarray, step: float = 5.0) -> np.ndarray:
    out = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        d = float(np.hypot(*(b - a)))
        k = max(1, int(d // step))
        for j in range(1, k + 1):
            out.append(a + (b - a) * j / k)
    return np.array(out)


def line(*pts) -> np.ndarray:
    return _densify(np.array(pts, dtype=float))


def bez(p0, p1, p2, p3, n: int = 36) -> np.ndarray:
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = (np.array(p, dtype=float) for p in (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def arc(cx, cy, rx, ry, a0, a1, n: int | None = None) -> np.ndarray:
    n = n or max(8, int(abs(a1 - a0) / 5))
    a = np.radians(np.linspace(a0, a1, n))
    return np.stack([cx + rx * np.cos(a), cy + ry * np.sin(a)], axis=1)


def join(*parts: np.ndarray) -> np.ndarray:
    out = [parts[0]]
    for p in parts[1:]:
        out.append(p[1:] if np.allclose(out[-1][-1], p[0]) else p)
    return np.vstack(out)
