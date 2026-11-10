"""Titan Watch — original synthesized titan calls (no film audio used).
Each titan gets a voice built from its signature traits:
  Godzilla family : bowed-string friction screech that descends into a bellow (the classic
                    'glove on a double-bass string, slowed down' idea, re-created synthetically)
  Kong / apes     : chest beats + guttural vowel roar with breath and sub-harmonic growl
  Ghidorah / multi-head : several shrill heads, each with a rapid 'cackling' trill
  Mothra          : high bird-like cries over soft wing flutter
  Rodan / fliers  : harsh raptor screech
  MUTO family     : echolocation click trains + electronic-like moan
  Mechagodzilla   : metallic ring-modulated roar + servo whine
  Sea titans      : whale-like moans, low-passed as if under water
Outputs r/<id>.mp3 and r/<id>.png (spectrogram 'voiceprint')."""
import numpy as np, os, subprocess, sys
from scipy.signal import butter, sosfilt, fftconvolve, stft, istft, resample_poly
from scipy.io import wavfile
from PIL import Image

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "r")
os.makedirs(OUT, exist_ok=True)


def R(seed):
    return np.random.default_rng(seed)


def lp(x, f, o=4): return sosfilt(butter(o, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, min(b, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


def smooth_noise(n, rate, rng):
    """random walk-ish noise band-limited to `rate` Hz, unit-ish amplitude"""
    x = lp(rng.standard_normal(n), rate, 2)
    return x / (np.std(x) + 1e-9)


def curve(t, pts):
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


def env(t, pts):
    return curve(t, pts)


def saw_from_f(f, rng=None):
    ph = np.cumsum(f) / SR
    return 2 * (ph % 1.0) - 1


def formant_filter(x, t_formants, bw_scale=1.0, tilt=0.0):
    """time-varying formants applied in STFT domain.
    t_formants: function(time_array_of_frames) -> list of (freq_array, gain, bw) per formant"""
    nper = 2048
    f, tt, Z = stft(x, SR, nperseg=nper, noverlap=nper * 3 // 4)
    E = np.zeros_like(np.abs(Z))
    for (fc, g, bw) in t_formants(tt):
        fc = np.atleast_1d(fc)[None, :] * np.ones((1, len(tt)))
        E += g * np.exp(-0.5 * ((f[:, None] - fc) / (bw * bw_scale)) ** 2)
    if tilt:
        E *= (1 + f[:, None] / 1000.0) ** (-tilt)
    _, y = istft(Z * E, SR, nperseg=nper, noverlap=nper * 3 // 4)
    return y[: len(x)] if len(y) >= len(x) else np.pad(y, (0, len(x) - len(y)))


def reverb(x, sec=2.5, wet=0.3, damp=3000, seed=0):
    n = int(SR * sec)
    t = np.arange(n) / SR
    ir = R(seed).standard_normal(n) * np.exp(-t * 6.9 / sec)
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, ir)[: len(x) + n // 2]
    xx = np.pad(x, (0, len(y) - len(x)))
    return (1 - wet) * xx + wet * y


def norm(x, p=0.95):
    return x / (np.max(np.abs(x)) + 1e-9) * p


# ===================================================================== voices
def friction_roar(dur, f0_pts, amp_pts, form_pts, seed, rasp=0.9, jitter=0.012, sub=0.35,
                  stickslip=55, bright=1.0):
    """bowed-string 'stick-slip' screech: sawtooth with chaotic pitch jitter + gritty AM."""
    rng = R(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f0 = curve(t, f0_pts)
    f0 = f0 * (1 + jitter * smooth_noise(n, 18, rng)) * (1 + 0.012 * np.sin(2 * np.pi * 6.5 * t))
    src = saw_from_f(f0) + 0.55 * saw_from_f(f0 * 1.007) + sub * saw_from_f(f0 / 2)
    # stick-slip grit: fast irregular amplitude chatter
    chatter = 1 + rasp * np.clip(smooth_noise(n, stickslip, rng), -1.5, 1.5) * 0.32
    src = src * chatter
    src += 0.35 * rasp * bp(rng.standard_normal(n), 900, 5000) * (f0 / f0.max())
    src = np.tanh(1.8 * src)

    def forms(tt):
        out = []
        for i in range(len(form_pts[0][1])):
            fc = curve(tt, [(p[0], p[1][i][0]) for p in form_pts])
            out.append((fc, form_pts[0][1][i][1], form_pts[0][1][i][2]))
        return out
    y = formant_filter(src, forms, bw_scale=1.6, tilt=0.6 / bright)
    y += 0.25 * lp(src, 3500) * env(t, [(0, 1), (dur, 1)])
    y *= env(t, amp_pts)
    return y


def chest_beats(n_beats, gap, seed, base=95):
    rng = R(seed)
    out = np.zeros(int(SR * (n_beats * gap + 0.5)))
    for i in range(n_beats):
        tt = np.arange(int(SR * 0.35)) / SR
        f = base * (1 + 1.2 * np.exp(-tt * 30)) * (0.95 + 0.1 * rng.random())
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)
        b += lp(rng.standard_normal(len(tt)), 400) * np.exp(-tt * 40) * 0.7
        s = int(SR * (i * gap + 0.02 * rng.random()))
        out[s:s + len(tt)] += b * (0.8 + 0.2 * rng.random())
    return np.tanh(1.4 * out)


def ape_roar(dur, f0, seed, snarl=0.4, size=1.0):
    """guttural mammal roar: vowel 'aa->oo' formants scaled by body size, heavy breath, growl"""
    rng = R(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(t, [(0, f0 * .8), (dur * .15, f0 * 1.25), (dur * .55, f0 * 1.1), (dur, f0 * .7)])
    f = f * (1 + 0.04 * smooth_noise(n, 9, rng))
    growl = 1 + 0.6 * np.sin(2 * np.pi * (28 + 8 * snarl) * t) * (0.5 + 0.5 * smooth_noise(n, 3, rng))
    src = (saw_from_f(f) + 0.7 * saw_from_f(f / 2)) * growl
    breath = rng.standard_normal(n) * (0.9 + snarl)
    src = np.tanh(1.5 * src) + 0.5 * breath
    s = 1 / size

    def forms(tt):
        a = np.clip(tt / dur * 1.6, 0, 1)
        return [(np.interp(a, [0, 1], [700 * s, 480 * s]), 1.0, 160),
                (np.interp(a, [0, 1], [1150 * s, 820 * s]), .7, 220),
                (2400 * s, .35 * (1 + snarl), 400),
                (180, .6, 90)]
    y = formant_filter(src, forms, tilt=0.9)
    y *= env(t, [(0, 0), (0.12, 1), (dur * .6, .9), (dur, 0)])
    return y


def screech(dur, f_pts, seed, harsh=0.6, trill=0.0, trill_rate=20, shimmer=0.0):
    """shrill bird/reptile screech, optional cackling trill (fast AM)"""
    rng = R(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(t, f_pts) * (1 + 0.02 * smooth_noise(n, 25, rng))
    src = saw_from_f(f) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    src += harsh * bp(rng.standard_normal(n), 1500, 7000)
    src = np.tanh((1 + 2 * harsh) * src)
    if trill:
        tr = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * trill_rate * t * (1 + 0.1 * smooth_noise(n, 2, rng))))
        tr = lp(tr, 90, 2)
        src *= (1 - trill) + trill * tr
    if shimmer:
        src += shimmer * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    fbase = float(np.median(f))

    def forms(tt):
        return [(fbase * 1.0, 1.0, fbase * .35), (fbase * 2.1, .8, fbase * .5), (fbase * 3.3, .5, fbase * .6), (4200, .4, 900)]
    y = formant_filter(src, forms, tilt=0.15)
    y *= env(t, [(0, 0), (min(.08, dur * .1), 1), (dur * .7, .85), (dur, 0)])
    return y


def clicks(dur, rate, seed, f=2600):
    rng = R(seed)
    n = int(SR * dur)
    y = np.zeros(n)
    t = 0.0
    while t < dur - 0.05:
        s = int(t * SR)
        L = int(0.012 * SR)
        tt = np.arange(L) / SR
        y[s:s + L] += np.sin(2 * np.pi * f * (1 + .2 * rng.random()) * tt) * np.exp(-tt * 500)
        t += 1 / (rate * (0.6 + 0.8 * rng.random()))
    return y


def moan(dur, f_pts, seed, under=True, harmonics=(1, .5, .3, .15)):
    rng = R(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = curve(t, f_pts) * (1 + 0.01 * smooth_noise(n, 2, rng))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(a * np.sin((k + 1) * ph) for k, a in enumerate(harmonics))
    y *= 1 + 0.25 * smooth_noise(n, 4, rng)
    y += 0.05 * lp(rng.standard_normal(n), 300)
    y *= env(t, [(0, 0), (dur * .25, 1), (dur * .75, .8), (dur, 0)])
    if under:
        y = lp(y, 900)
    return y


def sub_rumble(dur, seed, f=28, amt=1.0):
    rng = R(seed)
    n = int(SR * dur)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.6 * lp(rng.standard_normal(n), 60) * 3
    return amt * y * env(t, [(0, 0), (dur * .2, 1), (dur * .7, .7), (dur, 0)])


def mix(*parts):
    L = max(len(p[1]) + int(p[0] * SR) for p in parts)
    y = np.zeros(L)
    for st, x, g in parts:
        s = int(st * SR)
        y[s:s + len(x)] += g * x
    return y


# ===================================================================== presets
def godzilla_call(seed, scale=1.0, hi=430, lo=150, dur=5.2, screech_len=1.5, grit=0.9, sub=0.35,
                  extra_low=1.0, metallic=0.0, distort=0.0):
    """two-part call: high friction SKREEE (rising) -> descending ONNNK bellow"""
    s = scale
    A = friction_roar(screech_len + .4, [(0, hi * .55 * s), (screech_len * .55, hi * s), (screech_len + .4, hi * .93 * s)],
                      [(0, 0), (.15, .8), (screech_len, 1), (screech_len + .4, .6)],
                      [(0, [(950 * s, 1, 240), (1750 * s, .9, 320), (2700 * s, .6, 420), (420 * s, .5, 140)])],
                      seed, rasp=grit, sub=sub * .5, stickslip=70, bright=1.3)
    Bd = dur - screech_len + .2
    B = friction_roar(Bd, [(0, hi * .95 * s), (Bd * .2, hi * .88 * s), (Bd * .75, lo * 1.15 * s), (Bd, lo * .85 * s)],
                      [(0, .6), (.3, 1), (Bd * .7, .85), (Bd, 0)],
                      [(0, [(820 * s, 1, 230), (1500 * s, .85, 300), (2400 * s, .45, 420), (360 * s, .8, 140)]),
                       (Bd, [(520 * s, 1, 200), (1050 * s, .7, 260), (1900 * s, .3, 380), (240 * s, 1, 120)])],
                      seed + 1, rasp=grit * .9, sub=sub, stickslip=45, bright=1.0)
    y = mix((0, A, 1.0), (screech_len - .2, B, 1.0), (0.2, sub_rumble(dur, seed + 2, 30, .18 * extra_low), 1.0))
    if metallic:
        t = np.arange(len(y)) / SR
        y = (1 - metallic) * y + metallic * y * np.sin(2 * np.pi * 63 * t) * 1.6
    if distort:
        y = np.tanh((1 + 4 * distort) * norm(y))
    return reverb(norm(y), 3.2, wet=.32, damp=3500, seed=seed)


def kong_call(seed, f0=88, size=1.0, snarl=.35, beats=5):
    cb = chest_beats(beats, .18, seed, 95 / size) if beats else np.zeros(1)
    r = ape_roar(3.4, f0, seed + 5, snarl, size)
    return reverb(norm(mix((0, cb, .9), (beats * .18 + .15 if beats else 0, r, 1.0))), 2.4, .28, 3000, seed)


def multihead(seed, heads=3, base=520, trill=.65, dur=3.2):
    parts = []
    for h in range(heads):
        rr = R(seed + h)
        fb = base * (0.75 + 0.6 * rr.random())
        d = dur * (0.8 + .3 * rr.random())
        x = screech(d, [(0, fb * .8), (d * .25, fb * 1.15), (d * .7, fb), (d, fb * .7)], seed + 11 * h,
                    harsh=.55, trill=trill, trill_rate=16 + 8 * rr.random())
        parts.append((0.18 * h + .05 * rr.random(), x, 1.0 / np.sqrt(heads)))
    y = mix(*parts)
    y = mix((0, y, 1), (0, sub_rumble(dur + .6, seed, 34, .12), 1))
    return reverb(norm(y), 3.0, .35, 4000, seed)


def mothra_call(seed):
    parts = []
    t0 = 0
    for i, (f, d) in enumerate([(1500, .35), (1650, .35), (1900, 1.4)]):
        x = screech(d, [(0, f * .7), (d * .3, f * 1.25), (d, f * .8)], seed + i, harsh=.08, shimmer=.4)
        parts.append((t0, x, .8))
        t0 += d + .26
    n = int(SR * (t0 + .6))
    t = np.arange(n) / SR
    wings = bp(R(seed).standard_normal(n), 150, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) ** 2 * .22
    y = mix(*parts, (0, wings, 1))
    return reverb(norm(y), 3.5, .45, 6000, seed)


def flier_call(seed, f=1700, dur=2.0, harsh=.85, sub=0.0):
    x = screech(dur, [(0, f * .7), (dur * .2, f * 1.15), (dur * .6, f * 1.05), (dur, f * .6)], seed, harsh=harsh)
    y = mix((0, x, 1), (0, sub_rumble(dur, seed, 40, sub * .3), 1)) if sub else x
    return reverb(norm(y), 2.6, .3, 5000, seed)


def muto_call(seed, low=70, cl_rate=14, dur=3.4, f_click=2600):
    c = clicks(dur, cl_rate, seed, f_click)
    m = friction_roar(dur, [(0, low), (dur * .4, low * 1.6), (dur, low * .9)], [(0, 0), (.4, .8), (dur * .7, .7), (dur, 0)],
                      [(0, [(500, 1, 160), (1200, .6, 260), (2300, .3, 400)])], seed + 3, rasp=.5, sub=.5, stickslip=25)
    return reverb(norm(mix((0, c, .55), (.15, m, 1.0))), 2.8, .35, 4000, seed)


def mecha_call(seed):
    g = godzilla_call(seed, scale=.9, hi=400, lo=140, dur=4.4, grit=.6, metallic=.75)
    n = len(g)
    t = np.arange(n) / SR
    servo = np.sin(2 * np.pi * np.cumsum(curve(t, [(0, 600), (1.2, 2400), (2.5, 1800), (t[-1], 900)])) / SR)
    servo *= env(t, [(0, 0), (.3, .25), (2.5, .2), (3.5, 0), (t[-1], 0)])
    clank = np.zeros(n)
    for st in (0.05, 0.4):
        L = int(.25 * SR)
        tt = np.arange(L) / SR
        s = int(st * SR)
        clank[s:s + L] += (np.sin(2 * np.pi * 410 * tt) + np.sin(2 * np.pi * 1130 * tt) + .6 * np.sin(2 * np.pi * 2650 * tt)) * np.exp(-tt * 18)
    return norm(g + servo * .5 + clank * .4)


def sea_call(seed, base=55, dur=5.0, glide=1.8, extra=None):
    m1 = moan(dur, [(0, base), (dur * .4, base * glide), (dur, base * .8)], seed)
    m2 = moan(dur * .8, [(0, base * 1.5), (dur * .5, base * glide * 1.4), (dur * .8, base)], seed + 1)
    parts = [(0, m1, 1.0), (dur * .25, m2, .6)]
    if extra is not None:
        parts.append(extra)
    return reverb(norm(mix(*parts)), 4.5, .5, 1500, seed)


def beast_call(seed, f0=110, size=1.0, snarl=.5):
    """generic large reptile/beast: friction bellow + ape-style throat"""
    a = ape_roar(2.8, f0, seed, snarl, size)
    b = friction_roar(2.6, [(0, f0 * 2.2), (.6, f0 * 2.8), (2.6, f0 * 1.5)], [(0, 0), (.25, .7), (1.8, .6), (2.6, 0)],
                      [(0, [(700 / size, 1, 200), (1400 / size, .6, 300), (2300 / size, .3, 400)])], seed + 9, rasp=.8, sub=.4)
    return reverb(norm(mix((0, a, 1), (.15, b, .6))), 2.8, .3, 3000, seed)


def feline_call(seed, f0=150):
    a = ape_roar(2.6, f0, seed, snarl=.9, size=.8)
    return reverb(norm(a), 2.2, .25, 4000, seed)


def elephantine(seed, f=380, low=48):
    tr = screech(1.6, [(0, f * .8), (.3, f * 1.25), (1.6, f)], seed, harsh=.35)
    tr = lp(tr, 2200)
    rum = moan(3.6, [(0, low), (1.5, low * 1.3), (3.6, low * .9)], seed + 1, under=False)
    return reverb(norm(mix((0, tr, .9), (.6, rum, 1.0))), 3.0, .32, 2500, seed)


def ice_call(seed):
    g = beast_call(seed, 72, 1.25, .45)
    n = len(g)
    t = np.arange(n) / SR
    rng = R(seed)
    sh = sum(np.sin(2 * np.pi * f * t + rng.random() * 6) for f in (2093, 2637, 3136, 4186)) * .08
    sh *= np.exp(-((t - 1.2) / 1.0) ** 2)
    crack = bp(rng.standard_normal(n), 2000, 8000) * (rng.random(n) > .9985) * 3
    return norm(g + reverb(sh + crack, 2.5, .5, 9000, seed)[:n])


def frost(seed):
    return ice_call(seed + 7)


# ===================================================================== roster
P = {
    "godzilla":            lambda: godzilla_call(1, 1.0, 430, 150, 5.4),
    "godzilla-minus-one":  lambda: godzilla_call(2, 1.06, 470, 175, 4.8, grit=1.0, extra_low=.8),
    "godzilla-showa":      lambda: godzilla_call(3, 1.12, 500, 210, 4.0, screech_len=1.3, grit=.85, sub=.2, extra_low=.5),
    "godzilla-heisei":     lambda: godzilla_call(4, 1.0, 455, 165, 4.6, grit=.9),
    "godzilla-millennium": lambda: godzilla_call(5, 1.08, 480, 190, 4.4, grit=1.1),
    "godzilla-ultima":     lambda: godzilla_call(6, 1.02, 450, 160, 4.8, grit=.95),
    "godzilla-earth":      lambda: godzilla_call(7, .72, 330, 90, 6.4, screech_len=1.9, grit=.7, sub=.6, extra_low=1.6),
    "shin-godzilla":       lambda: godzilla_call(8, 1.0, 440, 140, 5.0, grit=1.2, distort=.6, metallic=.15),
    "zilla-1998":          lambda: flier_call(9, 1150, 2.4, harsh=.9, sub=.4),
    "kong":                lambda: kong_call(10, 88, 1.0, .35, 5),
    "suko":                lambda: kong_call(11, 190, .55, .3, 3),
    "skar-king":           lambda: kong_call(12, 105, .95, .85, 0),
    "king-ghidorah":       lambda: multihead(13, 3, 560, .7),
    "yamata-no-orochi":    lambda: multihead(14, 8, 420, .5, 3.6),
    "typhon":              lambda: multihead(15, 4, 300, .35, 3.4),
    "mothra":              lambda: mothra_call(16),
    "rodan":               lambda: flier_call(17, 1500, 2.2, .9, .3),
    "ion-dragon":          lambda: flier_call(18, 1250, 2.4, .8, .25),
    "warbat":              lambda: flier_call(19, 2600, 1.4, .7),
    "quetzalcoatl":        lambda: flier_call(20, 1900, 2.0, .6),
    "muto":                lambda: muto_call(21, 70, 14),
    "abaddon":             lambda: muto_call(22, 60, 10, 3.6, 2100),
    "mother-longlegs":     lambda: muto_call(23, 150, 22, 2.4, 3800),
    "skullcrawler":        lambda: flier_call(24, 900, 1.8, 1.0, .2),
    "mechagodzilla":       lambda: mecha_call(25),
    "scylla":              lambda: sea_call(26, 60, 4.6, 1.9),
    "leviathan":           lambda: sea_call(27, 42, 5.5, 1.6),
    "kraken":              lambda: sea_call(28, 50, 5.0, 2.2),
    "tiamat":              lambda: sea_call(29, 46, 5.2, 1.7, (0.8, beast_call(29, 70, 1.3, .4), .5)),
    "methuselah":          lambda: reverb(norm(moan(6.0, [(0, 32), (2.5, 44), (6, 30)], 30, under=False, harmonics=(1, .7, .5, .35, .2))), 4, .4, 1200, 30),
    "behemoth":            lambda: elephantine(31),
    "mokele-mbembe":       lambda: elephantine(32, 300, 40),
    "shimo":               lambda: ice_call(33),
    "frost-vark":          lambda: frost(34),
    "sekhmet":             lambda: feline_call(35, 160),
    "titan-x":             lambda: beast_call(36, 120, 1.0, .5),
    "amhuluk":             lambda: beast_call(37, 85, 1.2, .55),
    "baphomet":            lambda: beast_call(38, 140, .9, .7),
    "bunyip":              lambda: beast_call(39, 160, .8, .4),
    "lauroth":             lambda: beast_call(40, 100, 1.1, .6),
}


def spectrogram_png(y, path, W=320, H=64, fmax=8000):
    f, t, Z = stft(y, SR, nperseg=1024, noverlap=1024 - 256)
    S = np.abs(Z)
    # log-frequency axis 40Hz..fmax
    fl = np.geomspace(70, fmax, H)
    rows = np.array([np.interp(fl, f, S[:, i]) for i in range(S.shape[1])]).T  # H x T
    dB = 20 * np.log10(rows + 1e-9)
    dB = np.clip((dB - (np.percentile(dB, 99.5) - 55)) / 55, 0, 1) ** 1.6
    img = Image.fromarray((dB[::-1] * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    img.save(path, optimize=True)


if __name__ == "__main__":
    only = sys.argv[2:] or list(P)
    for k in only:
        y = P[k]()
        n = int(.05 * SR)
        y[-n:] *= np.linspace(1, 0, n)
        y = norm(hp(y, 25))
        wav = f"/tmp/{k}.wav"
        wavfile.write(wav, SR, (y * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "80k", f"{OUT}/{k}.mp3"], check=True)
        spectrogram_png(y, f"{OUT}/{k}.png")
        print(k, f"{len(y) / SR:.1f}s")
