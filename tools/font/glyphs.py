"""
Skeletons (centre-lines) for the Journie Display letterforms.

Coordinates are font units (1000 per em). Vertical metrics refer to the *outer ink edge*, so each
skeleton is inset by the nib's half-extent (hv for horizontals, hh for stems): that way a flat-topped
letter really reaches the x-height and the baseline regardless of how heavy the nib is.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from shapely import affinity
from shapely.geometry import Point, Polygon

from nib import Nib, arc, bez, join, line, sweep

XH = 500  # x-height
CAP = 700  # cap height
ASC = 748  # ascender
DESC = -215  # descender
OS = 12  # overshoot of round shapes


@dataclass
class Spec:
    strokes: list = field(default_factory=list)
    extra: list = field(default_factory=list)  # ready-made polygons (dots, bars)
    lsb: float = 48
    rsb: float = 48
    anchor: float | None = None  # x for diacritics; defaults to the ink centre


def pin_dot(nib: Nib, x: float, y: float) -> Polygon:
    """The tittle of i and j is a small ring, a nod to the map pin in the Journie logo."""
    thin = Nib(nib.width * 0.36, nib.thickness * 0.5, nib.angle)
    ring = sweep(thin, arc(x, y, 30, 30, 0, 360, 36))
    return ring


def dot(nib: Nib, x: float, y: float, r: float = 50) -> Polygon:
    """A round-ish tittle that leans with the pen."""
    e = affinity.scale(Point(0, 0).buffer(1, 24), r * 1.08, r * 0.92)
    e = affinity.rotate(e, nib.angle, origin=(0, 0))
    return affinity.translate(e, x, y)


class Letters:
    def __init__(self, nib: Nib):
        self.nib = nib
        self.hh = nib.hh
        self.hv = nib.hv
        hv = self.hv
        self.yb = hv  # skeleton height of the baseline
        self.yx = XH - hv
        self.yc = CAP - hv
        self.ya = ASC - hv
        self.yd = DESC + hv
        self.ybo = hv - OS  # round shapes overshoot
        self.yxo = XH - hv + OS
        self.ydo = DESC + hv

    # ---- helpers -------------------------------------------------------------------------

    def bowl(self, cx: float, rx: float, a0: float = 90, a1: float = 450) -> np.ndarray:
        cy = XH / 2
        ry = XH / 2 - self.hv + OS
        return arc(cx, cy, rx, ry, a0, a1)

    def arch(self, x0: float, x1: float, ymid: float = 300) -> np.ndarray:
        """Shoulder of n/h/m: half-ellipse rising from the left stem to the right."""
        cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
        return arc(cx, ymid, rx, self.yx + 6 - ymid, 180, 0)

    # ---- lower case ----------------------------------------------------------------------

    def lower(self) -> dict[str, Spec]:
        hh, hv = self.hh, self.hv
        yb, yx, ya, yd = self.yb, self.yx, self.ya, self.yd
        x0 = hh
        g: dict[str, Spec] = {}

        # round letters
        rx_o = 232 - hh
        g['o'] = Spec([self.bowl(x0 + rx_o, rx_o)], lsb=40, rsb=40)
        g['c'] = Spec([self.bowl(x0 + rx_o, rx_o, 46, 314)], lsb=40, rsb=22)
        rx_e = 220 - hh
        cxe = x0 + rx_e
        g['e'] = Spec(
            [line((cxe - rx_e, 250), (cxe + rx_e, 250)), self.bowl(cxe, rx_e, 0, 322)],
            lsb=40, rsb=30,
        )
        rx_a = 205 - hh
        xa = x0 + 2 * rx_a
        g['a'] = Spec([self.bowl(x0 + rx_a, rx_a), line((xa, yx + 4), (xa, yb))], lsb=40, rsb=48)
        g['d'] = Spec([self.bowl(x0 + rx_a, rx_a), line((xa, ya), (xa, yb))], lsb=40, rsb=48)
        g['b'] = Spec([line((x0, ya), (x0, yb)), self.bowl(x0 + rx_a, rx_a)], lsb=48, rsb=40)
        g['p'] = Spec([line((x0, yx), (x0, yd)), self.bowl(x0 + rx_a, rx_a)], lsb=48, rsb=40)
        g['q'] = Spec([self.bowl(x0 + rx_a, rx_a), line((xa, yx), (xa, yd))], lsb=40, rsb=48)
        # single-storey g with an open tail
        g['g'] = Spec(
            [
                self.bowl(x0 + rx_a, rx_a),
                join(
                    line((xa, yx), (xa, -40)),
                    bez((xa, -40), (xa, yd - 30), (xa - 130, yd - 10), (xa - 236, -64)),
                ),
            ],
            lsb=40, rsb=48,
        )

        # n h m r u
        xr = x0 + 330
        g['n'] = Spec([line((x0, yb), (x0, yx)), self.arch(x0, xr), line((xr, 300), (xr, yb))], lsb=48, rsb=50)
        g['h'] = Spec([line((x0, yb), (x0, ya)), self.arch(x0, xr), line((xr, 300), (xr, yb))], lsb=48, rsb=50)
        x1, x2 = x0 + 290, x0 + 580
        g['m'] = Spec(
            [line((x0, yb), (x0, yx)), self.arch(x0, x1), line((x1, 300), (x1, yb)), self.arch(x1, x2), line((x2, 300), (x2, yb))],
            lsb=48, rsb=50,
        )
        g['r'] = Spec([line((x0, yb), (x0, yx)), arc((x0 + 330) / 2 + x0 / 2, 300, 165, self.yx + 6 - 300, 180, 52)], lsb=48, rsb=14)
        g['u'] = Spec([line((x0, yx), (x0, 200)), arc(x0 + 165, 200, 165, 200 - yb, 180, 360), line((xr, yx), (xr, yb))], lsb=48, rsb=50)

        # diagonals
        xw = x0 + 360
        xm = (x0 + xw) / 2
        g['v'] = Spec([line((x0, yx), (xm, yb), (xw, yx))], lsb=26, rsb=26)
        wm = x0 + 290
        g['w'] = Spec([line((x0, yx), (x0 + 150, yb), (wm, 400), (wm + 140, yb), (wm + 290, yx))], lsb=26, rsb=26)
        g['x'] = Spec([line((x0, yx), (xw, yb)), line((xw, yx), (x0, yb))], lsb=30, rsb=30)
        yt = (x0 + 40, yd)
        t_end = (xw, yx)
        tt = (yx - 95) / (yx - yd)
        px = t_end[0] + (yt[0] - t_end[0]) * tt
        g['y'] = Spec([line(t_end, yt), line((x0, yx), (px, 95))], lsb=26, rsb=26)
        g['z'] = Spec([line((x0, yx), (xw - 20, yx), (x0, yb), (xw, yb))], lsb=36, rsb=36)

        # stems
        g['i'] = Spec([line((x0, yb), (x0, yx))], [pin_dot(self.nib, x0 + 4, 660)], lsb=46, rsb=46)
        g['dotlessi'] = Spec([line((x0, yb), (x0, yx))], lsb=46, rsb=46)
        g['j'] = Spec(
            [join(line((x0, yx), (x0, -30)), bez((x0, -30), (x0, yd - 14), (x0 - 80, yd - 4), (x0 - 122, -70)))],
            [pin_dot(self.nib, x0 + 4, 660)], lsb=40, rsb=42,
        )
        g['l'] = Spec([line((x0, ya), (x0, yb))], lsb=46, rsb=46)
        g['k'] = Spec([line((x0, ya), (x0, yb)), line((xw - 10, yx), (x0, 190)), line((x0 + 120, 280), (xw, yb))], lsb=48, rsb=22)
        g['t'] = Spec(
            [
                join(line((x0, 640), (x0, 140)), bez((x0, 140), (x0, yb), (x0 + 36, yb), (x0 + 130, yb + 52))),
                line((x0 - 96, yx), (x0 + 150, yx)),
            ],
            lsb=34, rsb=24,
        )
        g['f'] = Spec(
            [
                join(line((x0, yb), (x0, 560)), bez((x0, 580), (x0, ya + 8), (x0 + 90, ya + 8), (x0 + 190, ya - 40))),
                line((x0 - 90, yx), (x0 + 150, yx)),
            ],
            lsb=34, rsb=12,
        )
        # s: two bowls joined by a spine
        sx = x0 + 150
        rs = 150 - hh * 0.2
        top = arc(sx, 372, rs, 100 + 3, 22, 252)
        bot = arc(sx, 128, rs, 100 + 3, 72, -158)
        g['s'] = Spec([join(top, line(tuple(top[-1]), tuple(bot[0])), bot)], lsb=36, rsb=34)

        # Vietnamese base letters: horned o/u, crossed d
        ho = g['o']
        xh = x0 + rx_o * 2
        g['ohorn'] = Spec(
            list(ho.strokes) + [bez((xh - 12, 372), (xh + 36, 410), (xh + 62, 462), (xh + 100, 498))],
            lsb=40, rsb=34, anchor=x0 + rx_o,
        )
        gu = g['u']
        g['uhorn'] = Spec(
            list(gu.strokes) + [bez((xr, 384), (xr + 44, 420), (xr + 70, 462), (xr + 108, 496))],
            lsb=48, rsb=44, anchor=(x0 + xr) / 2,
        )
        # đ: a d with a crossbar
        d = g['d']
        g['dcroat'] = Spec(list(d.strokes) + [line((xa - 120, 585), (xa + 62, 585))], lsb=40, rsb=60)
        return g

    # ---- capitals ------------------------------------------------------------------------

    def upper(self) -> dict[str, Spec]:
        hh, hv = self.hh, self.hv
        yb, yc = self.yb, self.yc
        x0 = hh
        g: dict[str, Spec] = {}
        cyc = CAP / 2
        ryc = CAP / 2 - hv + OS

        def ring(cx, rx, a0=90, a1=450):
            return arc(cx, cyc, rx, ryc, a0, a1)

        rO = 292 - hh
        g['O'] = Spec([ring(x0 + rO, rO)], lsb=40, rsb=40)
        g['Q'] = Spec([ring(x0 + rO, rO), line((x0 + rO * 1.25, 150), (x0 + rO * 2 + 26, -34))], lsb=40, rsb=40)
        g['C'] = Spec([ring(x0 + rO, rO, 42, 318)], lsb=40, rsb=26)
        rG = 282 - hh
        cxg = x0 + rG
        g['G'] = Spec([join(ring(cxg, rG, 40, 360), line((cxg + rG, cyc), (cxg + 4, cyc)))], lsb=40, rsb=40)
        xd = x0 + 190
        g['D'] = Spec([join(line((x0, yb), (x0, yc)), line((x0, yc), (xd, yc)), arc(xd, cyc, 190 + 10, yc - cyc, 90, -90), line((xd, yb), (x0, yb)))], lsb=50, rsb=40)
        # B: stem and two bowls
        ym = 365
        xb1, xb2 = x0 + 150, x0 + 175
        g['B'] = Spec(
            [
                line((x0, yb), (x0, yc)),
                join(line((x0, yc), (xb1, yc)), arc(xb1, (yc + ym) / 2, 140, (yc - ym) / 2, 90, -90), line((xb1, ym), (x0, ym))),
                join(line((x0, ym), (xb2, ym)), arc(xb2, (ym + yb) / 2, 165, (ym - yb) / 2, 90, -90), line((xb2, yb), (x0, yb))),
            ],
            lsb=50, rsb=34,
        )
        g['P'] = Spec(
            [
                line((x0, yb), (x0, yc)),
                join(line((x0, yc), (x0 + 160, yc)), arc(x0 + 160, (yc + 330) / 2, 150, (yc - 330) / 2, 90, -90), line((x0 + 160, 330), (x0, 330))),
            ],
            lsb=50, rsb=34,
        )
        g['R'] = Spec(
            [
                line((x0, yb), (x0, yc)),
                join(line((x0, yc), (x0 + 160, yc)), arc(x0 + 160, (yc + 330) / 2, 150, (yc - 330) / 2, 90, -90), line((x0 + 160, 330), (x0, 330))),
                line((x0 + 150, 330), (x0 + 330, yb)),
            ],
            lsb=50, rsb=26,
        )
        xe = x0 + 300
        g['E'] = Spec([line((xe, yc), (x0, yc), (x0, yb), (xe, yb)), line((x0, 360), (xe - 40, 360))], lsb=50, rsb=26)
        g['F'] = Spec([line((xe, yc), (x0, yc), (x0, yb)), line((x0, 360), (xe - 50, 360))], lsb=50, rsb=26)
        g['L'] = Spec([line((x0, yc), (x0, yb), (xe - 20, yb))], lsb=50, rsb=26)
        xh2 = x0 + 400
        g['H'] = Spec([line((x0, yb), (x0, yc)), line((xh2, yb), (xh2, yc)), line((x0, 360), (xh2, 360))], lsb=50, rsb=50)
        g['I'] = Spec([line((x0, yb), (x0, yc))], lsb=46, rsb=46)
        g['J'] = Spec([join(line((x0 + 260, yc), (x0 + 260, 230)), arc(x0 + 130, 230, 130, 230 - yb + OS, 0, -152))], lsb=22, rsb=36)
        xk = x0 + 340
        arm = ((xk + 10, yc), (x0, 270))
        tk = 100 / (arm[0][0] - arm[1][0])
        leg_start = (arm[1][0] + 100, arm[1][1] + (arm[0][1] - arm[1][1]) * tk)
        g['K'] = Spec([line((x0, yb), (x0, yc)), line(*arm), line(leg_start, (xk + 20, yb))], lsb=50, rsb=22)
        xn = x0 + 420
        g['N'] = Spec([line((x0, yb), (x0, yc), (xn, yb), (xn, yc))], lsb=50, rsb=50)
        xmm = x0 + 560
        g['M'] = Spec([line((x0, yb), (x0, yc), ((x0 + xmm) / 2, 250), (xmm, yc), (xmm, yb))], lsb=50, rsb=50)
        xa = x0 + 520
        tc = (230 - yb) / (yc - yb)
        g['A'] = Spec([line((x0, yb), ((x0 + xa) / 2, yc), (xa, yb)), line((x0 + (xa - x0) / 2 * tc, 230), (xa - (xa - x0) / 2 * tc, 230))], lsb=20, rsb=20)
        g['V'] = Spec([line((x0, yc), ((x0 + xa) / 2, yb), (xa, yc))], lsb=20, rsb=20)
        xw2 = x0 + 800
        g['W'] = Spec([line((x0, yc), (x0 + 200, yb), (x0 + 400, 470), (x0 + 600, yb), (xw2, yc))], lsb=20, rsb=20)
        g['X'] = Spec([line((x0, yc), (x0 + 480, yb)), line((x0 + 480, yc), (x0, yb))], lsb=24, rsb=24)
        g['Y'] = Spec([line((x0, yc), (x0 + 250, 330)), line((x0 + 500, yc), (x0 + 250, 330), (x0 + 250, yb))], lsb=20, rsb=20)
        g['Z'] = Spec([line((x0, yc), (x0 + 440, yc), (x0, yb), (x0 + 460, yb))], lsb=34, rsb=34)
        g['T'] = Spec([line((x0, yc), (x0 + 460, yc)), line((x0 + 230, yc), (x0 + 230, yb))], lsb=24, rsb=24)
        xu = x0 + 420
        g['U'] = Spec([join(line((x0, yc), (x0, 270)), arc(x0 + 210, 270, 210, 270 - yb + OS, 180, 360), line((xu, 270), (xu, yc)))], lsb=48, rsb=48)
        # S
        rs = 190 - hh * 0.2
        sx = x0 + 195
        top = arc(sx, 520, rs, 150 + 3, 24, 252)
        bot = arc(sx, 188, rs + 8, 162 + 3, 72, -156)
        g['S'] = Spec([join(top, line(tuple(top[-1]), tuple(bot[0])), bot)], lsb=36, rsb=36)
        g['Dcroat'] = Spec(list(g['D'].strokes) + [line((x0 - 60, 360), (x0 + 120, 360))], lsb=34, rsb=40)
        g['Ohorn'] = Spec(
            list(g['O'].strokes) + [bez((x0 + rO * 2 - 20, 520), (x0 + rO * 2 + 34, 566), (x0 + rO * 2 + 66, 616), (x0 + rO * 2 + 110, 652))],
            lsb=40, rsb=36, anchor=x0 + rO,
        )
        g['Uhorn'] = Spec(
            list(g['U'].strokes) + [bez((xu, 540), (xu + 48, 580), (xu + 76, 622), (xu + 116, 656))],
            lsb=48, rsb=44, anchor=x0 + 210,
        )
        return g

    # ---- figures -------------------------------------------------------------------------

    def figures(self) -> dict[str, Spec]:
        hh, hv = self.hh, self.hv
        yb, yc = self.yb, self.yc
        x0 = hh
        g: dict[str, Spec] = {}
        cyc = CAP / 2
        ryc = CAP / 2 - hv + OS
        r0 = 230 - hh
        g['zero'] = Spec([arc(x0 + r0, cyc, r0, ryc, 90, 450)], lsb=40, rsb=40)
        g['one'] = Spec([line((x0 - 70, yc - 120), (x0 + 30, yc), (x0 + 30, yb))], lsb=60, rsb=50)
        g['two'] = Spec([join(arc(x0 + 180, 500, 180, 175, 168, -38), line((x0 + 330, 394), (x0, yb), (x0 + 380, yb)))], lsb=40, rsb=40)
        g['three'] = Spec(
            [join(arc(x0 + 160, 515, 160, 160 - 2, 150, -90), arc(x0 + 150, 190, 190, 190, 90, -150))],
            lsb=40, rsb=40,
        )
        g['four'] = Spec([line((x0 + 300, yb), (x0 + 300, yc), (x0, 210), (x0 + 420, 210))], lsb=36, rsb=36)
        g['five'] = Spec(
            [join(line((x0 + 340, yc), (x0 + 30, yc), (x0 + 12, 380)), arc(x0 + 180, 230, 190, 215, 135, -155))],
            lsb=40, rsb=40,
        )
        g['six'] = Spec(
            [arc(x0 + 190, 225, 190, 215, 90, 450), bez((x0 + 330, yc - 20), (x0 + 170, yc + 20), (x0 + 5, 470), (x0 + 2, 250))],
            lsb=40, rsb=40,
        )
        g['seven'] = Spec([line((x0, yc), (x0 + 400, yc), (x0 + 130, yb))], lsb=40, rsb=36)
        g['eight'] = Spec([arc(x0 + 165, 510, 165, 160, 90, 450), arc(x0 + 190, 190, 190, 190 - 2, 90, 450)], lsb=40, rsb=40)
        six = g['six']
        g['nine'] = Spec([affinity_rot(s, 2 * (x0 + 190)) for s in six.strokes], lsb=40, rsb=40)
        return g

    # ---- punctuation ---------------------------------------------------------------------

    def punct(self) -> dict[str, Spec]:
        hh, hv = self.hh, self.hv
        x0 = hh
        g: dict[str, Spec] = {}
        n = self.nib
        g['period'] = Spec(extra=[dot(n, x0, 36, 54)], lsb=44, rsb=44)
        g['comma'] = Spec([bez((x0 + 2, 10), (x0 + 6, -50), (x0 - 10, -100), (x0 - 40, -122))], [dot(n, x0, 44, 54)], lsb=44, rsb=40)
        g['colon'] = Spec(extra=[dot(n, x0, 36, 54), dot(n, x0, 436, 54)], lsb=44, rsb=44)
        g['semicolon'] = Spec([bez((x0 + 2, 10), (x0 + 6, -50), (x0 - 10, -100), (x0 - 40, -122))], [dot(n, x0, 44, 54), dot(n, x0, 436, 54)], lsb=44, rsb=40)
        g['exclam'] = Spec([line((x0, self.yc), (x0, 240))], [dot(n, x0, 36, 54)], lsb=48, rsb=48)
        g['question'] = Spec(
            [join(arc(x0 + 150, 520, 150, 150 - 4, 160, -45), bez((x0 + 150 + 106, 520 - 106), (x0 + 100, 330), (x0 + 150, 300), (x0 + 150, 230)))],
            [dot(n, x0 + 150, 36, 54)], lsb=40, rsb=40,
        )
        g['hyphen'] = Spec([line((x0, 255), (x0 + 190, 255))], lsb=50, rsb=50)
        g['endash'] = Spec([line((x0, 255), (x0 + 380, 255))], lsb=40, rsb=40)
        g['emdash'] = Spec([line((x0, 255), (x0 + 760, 255))], lsb=40, rsb=40)
        g['quotesingle'] = Spec([line((x0, self.yc), (x0 - 8, 480))], lsb=44, rsb=44)
        g['quoteright'] = Spec([bez((x0 + 6, self.yc), (x0 + 16, 560), (x0 - 4, 520), (x0 - 24, 500))], [dot(n, x0 + 6, self.yc - 30, 46)], lsb=40, rsb=40)
        g['quoteleft'] = Spec([bez((x0 - 6, 500), (x0 - 16, 560), (x0 + 4, 600), (x0 + 24, 624))], [dot(n, x0 - 8, 500, 46)], lsb=40, rsb=40)
        g['quotedbl'] = Spec([line((x0, self.yc), (x0 - 8, 480)), line((x0 + 110, self.yc), (x0 + 102, 480))], lsb=44, rsb=44)
        g['quotedblright'] = Spec(
            [bez((x0 + 6, self.yc), (x0 + 16, 560), (x0 - 4, 520), (x0 - 24, 500)), bez((x0 + 126, self.yc), (x0 + 136, 560), (x0 + 116, 520), (x0 + 96, 500))],
            [dot(n, x0 + 6, self.yc - 30, 46), dot(n, x0 + 126, self.yc - 30, 46)], lsb=40, rsb=40,
        )
        g['quotedblleft'] = Spec(
            [bez((x0 - 6, 500), (x0 - 16, 560), (x0 + 4, 600), (x0 + 24, 624)), bez((x0 + 114, 500), (x0 + 104, 560), (x0 + 124, 600), (x0 + 144, 624))],
            [dot(n, x0 - 8, 500, 46), dot(n, x0 + 112, 500, 46)], lsb=40, rsb=40,
        )
        g['parenleft'] = Spec([arc(x0 + 220, 260, 220, 410, 118, 242)], lsb=40, rsb=34)
        g['parenright'] = Spec([arc(x0 - 20, 260, 220, 410, -62, 62)], lsb=34, rsb=40)
        g['slash'] = Spec([line((x0, -40), (x0 + 270, 720))], lsb=20, rsb=20)
        g['plus'] = Spec([line((x0, 250), (x0 + 330, 250)), line((x0 + 165, 90), (x0 + 165, 410))], lsb=44, rsb=44)
        g['equal'] = Spec([line((x0, 180), (x0 + 330, 180)), line((x0, 330), (x0 + 330, 330))], lsb=44, rsb=44)
        g['multiply'] = Spec([line((x0, 130), (x0 + 270, 380)), line((x0 + 270, 130), (x0, 380))], lsb=44, rsb=44)
        g['periodcentered'] = Spec(extra=[dot(n, x0, 270, 54)], lsb=44, rsb=44)
        g['ellipsis'] = Spec(extra=[dot(n, x0, 36, 54), dot(n, x0 + 190, 36, 54), dot(n, x0 + 380, 36, 54)], lsb=44, rsb=44)
        g['degree'] = Spec([arc(x0 + 70, 600, 70, 70, 90, 450)], lsb=40, rsb=40)
        yb = self.yb
        g['ampersand'] = Spec(
            [
                join(
                    line((x0 + 410, yb + 4), (x0 + 120, 400)),
                    bez((x0 + 120, 400), (x0 + 20, 500), (x0 + 60, 676), (x0 + 190, 676)),
                    bez((x0 + 190, 676), (x0 + 310, 676), (x0 + 330, 560), (x0 + 240, 470)),
                    bez((x0 + 240, 470), (x0 + 120, 350), (x0 + 0, 260), (x0 + 8, 150)),
                    bez((x0 + 8, 150), (x0 + 8, 40), (x0 + 120, yb), (x0 + 210, yb)),
                    bez((x0 + 210, yb), (x0 + 330, yb), (x0 + 390, 170), (x0 + 420, 300)),
                )
            ],
            lsb=40, rsb=40,
        )
        g['percent'] = Spec(
            [line((x0 + 20, 0), (x0 + 520, 700)), arc(x0 + 90, 580, 80, 100, 90, 450), arc(x0 + 440, 120, 80, 100, 90, 450)],
            lsb=36, rsb=36,
        )
        g['space'] = Spec(lsb=0, rsb=0)
        return g


def affinity_rot(stroke: np.ndarray, cx_total: float) -> np.ndarray:
    """Rotate a skeleton 180° about the middle of the figure box (used to turn a 6 into a 9)."""
    cx = cx_total / 2
    cy = CAP / 2
    out = stroke.copy()
    out[:, 0] = 2 * cx - out[:, 0]
    out[:, 1] = 2 * cy - out[:, 1]
    return out


# ───────── diacritic marks (drawn once, placed by the builder) ─────────

def marks(nib: Nib) -> dict[str, list]:
    m = 1.45  # diacritics are drawn a little generously so they stay open at small sizes
    sc = lambda arr: np.asarray(arr, dtype=float) * m
    return {
        'acute': [sc(line((-26, 8), (30, 100)))],
        'grave': [sc(line((26, 8), (-30, 100)))],
        'hook': [sc(join(bez((-30, 92), (-30, 150), (34, 150), (34, 98)), bez((34, 98), (34, 70), (8, 66), (8, 34))))],
        'tilde': [sc(join(bez((-52, 36), (-46, 108), (-10, 108), (0, 70)), bez((0, 70), (10, 34), (40, 30), (52, 102))))],
        'circumflex': [sc(line((-52, 8), (0, 86), (52, 8)))],
        'breve': [sc(bez((-48, 84), (-40, 6), (40, 6), (48, 84)))],
        'dotbelow': [np.array([[0.0, 0.0], [8.0, 10.0]])],
    }
