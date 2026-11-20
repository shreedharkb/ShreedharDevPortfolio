import portfolioData from "./data.js";
import { skillIcons } from "./icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function link(label, href, className = "text-link") {
    const anchor = el("a", className, label);
    anchor.href = href;
    const shouldOpenInNewTab = !href.startsWith("#") && !href.startsWith("mailto:");
    anchor.target = shouldOpenInNewTab ? "_blank" : "_self";
    if (shouldOpenInNewTab) {
        anchor.rel = "noopener noreferrer";
    }
    return anchor;
}

function logoImage(logo) {
    // The mark gets a plate rather than sitting flat on the card: these logos are
    // white mono art and a bare one reads as a rendering glitch on this palette.
    // When the institution gives us a site, the plate itself becomes the link so
    // the whole mark is the hit area and the custom cursor locks onto it.
    const plate = el(logo.href ? "a" : "span", "logo-plate");
    if (logo.href) {
        plate.href = logo.href;
        plate.target = "_blank";
        plate.rel = "noopener noreferrer";
        plate.setAttribute("aria-label", `${logo.alt} website`);
    }
    const image = el("img", "org-logo");
    image.src = logo.src;
    image.alt = logo.alt;
    // Intrinsic size alongside the contained layout keeps the card from reflowing
    // while the mark loads.
    image.width = logo.width;
    image.height = logo.height;
    plate.append(image);
    return plate;
}

// Props exactly as the react-bits demo is configured. fontFamily "" means inherit
// the container's font, and currentColor resolves against the container's colour.
const TECH = {
    fontWeight: 600,
    fontSize: 150,
    letterSpacing: -0.05,
    color: "currentColor",
    accentColor: "currentColor",
    align: "center",
    reach: 200,
    softness: 0.7,
    dashLength: 4,
    dashGap: 2,
    strokeWidth: 1.5,
    lineStyle: "dashed",
    reveal: "letter",
    specks: 15,
    selection: true,
    labels: true,
    draggable: true,
    bounce: 0.4,
    sweep: false,
    speed: 1,
    clickKick: true,
    intro: "none",
    introDuration: 2,
    guides: false
};

const LABEL_FONT = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const FALLOFF_STEPS = 8;
const SPRING = 320;
const INHERIT = /^(currentcolor|inherit)$/i;
const INTRO_DELAY = 0.15;
const KICK_DECAY = 0.62;

const techApproach = (current, target, dt, seconds) => current + (target - current) * (1 - Math.exp(-dt / seconds));
const techClamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const techSmoothstep = (edge0, edge1, value) => {
    const t = techClamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};
const techNoise = (...values) => {
    let h = 2166136261;
    for (const value of values) {
        h = Math.imul(h ^ (value | 0), 16777619);
        h ^= h >>> 13;
        h = Math.imul(h, 0x5bd1e995);
        h ^= h >>> 15;
    }
    return (h >>> 0) / 4294967296;
};
const techSigned = (value) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0");

// The react-bits TechText effect, ported without changing its behaviour: every
// glyph is rasterised twice (solid fill and dashed outline), a lens trails the
// pointer, and the letter under the lens swaps to its outline while a selection
// frame, orbiting specks and a metric label appear around it. Letters are
// spring-loaded, so they can be dragged and clicked. The demo's auto-sweep is
// off, so with no pointer over the name every glyph rests on its solid sprite
// and the title reads as ordinary text.
function initializeTechText() {
    const container = qs("#hero-title");
    const s = { ...TECH, text: container.textContent.trim(), fontFamily: "" };
    if (!s.text) {
        return;
    }

    const canvas = el("canvas", "tech-text-canvas");
    container.textContent = "";
    container.classList.add("tech-text");
    container.setAttribute("role", "img");
    container.setAttribute("aria-label", s.text);
    container.append(canvas);

    const ctx = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });
    if (!ctx || !scratchCtx) {
        return;
    }

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let visible = false;
    let alive = true;
    let layoutKey = "";
    let sizeDirty = true;
    let requestedFont = "";
    let word = null;
    let glyphs = [];
    let presence = 0;
    let clock = 0;
    let pulse = 0;
    let placed = false;
    let dragging = -1;
    let cursor = "";
    let introClock = 0;
    let introKind = "";
    let introducing = false;
    let fontsReady = !document.fonts;
    let guideAlpha = 0;
    const kicks = [];
    const press = { x: 0, y: 0, time: 0, index: -1 };
    const pointer = { x: 0, y: 0, inside: false };
    const grab = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };
    const frameBox = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };

    const refreshFonts = () => {
        layoutKey = "";
        wake();
    };

    const fontsLoaded = () => {
        fontsReady = true;
        refreshFonts();
    };

    const family = () => s.fontFamily || getComputedStyle(container).fontFamily || "sans-serif";
    const fontFor = (size) => `${s.fontWeight} ${size}px ${family()}`;

    const palette = () => {
        const current = getComputedStyle(container).color || "#000000";
        const pick = (value) => (!value || INHERIT.test(String(value).trim()) ? current : value);
        return { ink: pick(s.color), accent: pick(s.accentColor) };
    };

    const setFont = (target, size) => {
        target.font = fontFor(size);
        if ("letterSpacing" in target) target.letterSpacing = `${s.letterSpacing * size}px`;
        target.textAlign = "left";
        target.textBaseline = "alphabetic";
    };

    const sprite = (view, glyph, stroke, ink) => {
        const pad = Math.ceil(s.strokeWidth * 2 + 4);
        const left = glyph.box.x1 - pad;
        const top = glyph.box.y1 - pad;
        const w = glyph.box.x2 - glyph.box.x1 + pad * 2;
        const h = glyph.box.y2 - glyph.box.y1 + pad * 2;
        const image = document.createElement("canvas");
        image.width = Math.max(1, Math.ceil(w * dpr));
        image.height = Math.max(1, Math.ceil(h * dpr));
        const c = image.getContext("2d");
        if (!c) return { image, left, top };
        c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
        setFont(c, view.size);
        if (stroke) {
            c.lineJoin = "round";
            c.lineWidth = s.strokeWidth * 2;
            c.lineCap = "butt";
            c.strokeStyle = ink;
            if (s.lineStyle !== "solid") c.setLineDash([Math.max(1, s.dashLength), Math.max(1, s.dashGap)]);
            c.strokeText(glyph.char, glyph.x, view.baseline);
            c.setLineDash([]);
            c.globalCompositeOperation = "destination-out";
            c.fillStyle = "#000000";
            c.fillText(glyph.char, glyph.x, view.baseline);
            c.globalCompositeOperation = "source-over";
        } else {
            c.fillStyle = ink;
            c.fillText(glyph.char, glyph.x, view.baseline);
        }
        return { image, left, top };
    };

    const ensureLayout = (ink) => {
        const key = [
            s.text, family(), s.fontWeight, s.fontSize, s.letterSpacing, s.align, ink,
            s.dashLength, s.dashGap, s.strokeWidth, s.lineStyle, width, height, dpr
        ].join("|");
        if (key === layoutKey && word) return word;
        layoutKey = key;
        const wanted = fontFor(64);
        if (document.fonts && wanted !== requestedFont) {
            requestedFont = wanted;
            document.fonts.load(wanted, s.text).then(refreshFonts, refreshFonts);
        }

        const probe = scratchCtx;
        setFont(probe, s.fontSize);
        let m = probe.measureText(s.text);
        const fit = Math.min(
            1,
            (width * 0.9) / Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1),
            (height * 0.66) / Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, 1)
        );
        const size = s.fontSize * fit;
        setFont(probe, size);
        m = probe.measureText(s.text);
        const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        const margin = width * 0.05;
        const start =
            s.align === "left" ? margin : s.align === "right" ? width - margin - inkWidth : (width - inkWidth) / 2;
        const x = start + m.actualBoundingBoxLeft;
        const baseline = (height - inkHeight) / 2 + m.actualBoundingBoxAscent;
        const xHeight = baseline - probe.measureText("x").actualBoundingBoxAscent;
        const capHeight = baseline - probe.measureText("H").actualBoundingBoxAscent;
        const ascender = baseline - probe.measureText("d").actualBoundingBoxAscent;
        const descender = baseline + probe.measureText("p").actualBoundingBoxDescent;
        const top = baseline - m.actualBoundingBoxAscent;
        const bottom = baseline + m.actualBoundingBoxDescent;
        const inkTop = Math.min(top, capHeight) - 2;
        const inkBottom = Math.max(bottom, baseline) + 2;
        const next = {
            size,
            baseline,
            left: x - m.actualBoundingBoxLeft,
            right: x + m.actualBoundingBoxRight,
            top,
            bottom,
            lines: [
                { y: baseline, label: "baseline" },
                { y: xHeight, label: "x-height" },
                { y: capHeight, label: "cap height" },
                ...(capHeight - ascender > Math.max(11, size * 0.06) ? [{ y: ascender, label: "ascender" }] : []),
                { y: descender, label: "descender" }
            ],
            bands: [
                { y0: xHeight, y1: baseline, up: true, order: 0 },
                { y0: capHeight, y1: xHeight, up: true, order: 1 },
                { y0: inkTop, y1: capHeight, up: true, order: 2 },
                { y0: baseline, y1: inkBottom, up: false, order: 1 }
            ].filter((band) => band.y1 - band.y0 > 0.5)
        };
        word = next;

        const chars = Array.from(s.text);
        const previous = glyphs;
        glyphs = [];
        let prefix = "";
        chars.forEach((char, i) => {
            prefix += char;
            const own = probe.measureText(char);
            const gx = x + probe.measureText(prefix).width - own.width;
            if (!char.trim()) return;
            const base = {
                char,
                x: gx,
                box: {
                    x1: gx - own.actualBoundingBoxLeft,
                    y1: baseline - own.actualBoundingBoxAscent,
                    x2: gx + own.actualBoundingBoxRight,
                    y2: baseline + own.actualBoundingBoxDescent
                }
            };
            const kept = previous[glyphs.length];
            const sameGlyph = kept?.char === char && kept.index === i;
            glyphs.push({
                ...base,
                offset: sameGlyph ? kept.offset : { x: 0, y: 0 },
                velocity: sameGlyph ? kept.velocity : { x: 0, y: 0 },
                outline: sameGlyph ? kept.outline : 0,
                shown: sameGlyph ? kept.shown : 1,
                cells: null,
                assembled: 0,
                index: i,
                fill: sprite(next, base, false, ink),
                dashes: sprite(next, base, true, ink)
            });
        });
        if (dragging >= 0 && glyphs[dragging]?.index !== previous[dragging]?.index) dragging = -1;
        if (frameBox.index >= 0 && glyphs[frameBox.index]?.char !== previous[frameBox.index]?.char) frameBox.index = -1;
        return next;
    };

    const glyphAt = (gx, gy) => {
        if (!word || gy < word.top - 24 || gy > word.bottom + 24) return -1;
        let best = -1;
        let bestDistance = Infinity;
        glyphs.forEach((glyph, i) => {
            const x1 = glyph.box.x1 + glyph.offset.x;
            const x2 = glyph.box.x2 + glyph.offset.x;
            const d = gx < x1 ? x1 - gx : gx > x2 ? gx - x2 : 0;
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        });
        return bestDistance < 28 ? best : -1;
    };

    const falloff = (target, cx, cy, radius, strength, softness) => {
        const inner = Math.min(1, Math.max(0, 1 - softness));
        const gradient = target.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
        if (inner > 0.995) {
            gradient.addColorStop(0.995, `rgba(0, 0, 0, ${strength})`);
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            return gradient;
        }
        for (let i = 0; i <= FALLOFF_STEPS; i++) {
            const t = i / FALLOFF_STEPS;
            const eased = t * t * (3 - 2 * t);
            gradient.addColorStop(inner + (1 - inner) * t, `rgba(0, 0, 0, ${strength * (1 - eased)})`);
        }
        return gradient;
    };

    const blit = (target, art, dx, dy, originX, originY) => {
        target.drawImage(
            art.image,
            Math.round((art.left + dx) * dpr - originX),
            Math.round((art.top + dy) * dpr - originY)
        );
    };

    const drawReveal = () => {
        const radius = s.reach * dpr;
        const cx = lens.x * dpr;
        const cy = lens.y * dpr;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = falloff(ctx, cx, cy, radius, presence, s.softness);
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.globalCompositeOperation = "source-over";

        const x0 = Math.max(0, Math.floor(cx - radius));
        const y0 = Math.max(0, Math.floor(cy - radius));
        const x1 = Math.min(canvas.width, Math.ceil(cx + radius));
        const y1 = Math.min(canvas.height, Math.ceil(cy + radius));
        if (x1 <= x0 || y1 <= y0) return;
        const w = x1 - x0;
        const h = y1 - y0;
        if (scratch.width < w || scratch.height < h) {
            scratch.width = Math.max(scratch.width, w);
            scratch.height = Math.max(scratch.height, h);
        }
        scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
        scratchCtx.globalCompositeOperation = "source-over";
        scratchCtx.clearRect(0, 0, w, h);
        for (const glyph of glyphs) blit(scratchCtx, glyph.dashes, glyph.offset.x, glyph.offset.y, x0, y0);
        scratchCtx.globalCompositeOperation = "destination-in";
        scratchCtx.fillStyle = falloff(scratchCtx, cx - x0, cy - y0, radius, 1, s.softness);
        scratchCtx.fillRect(0, 0, w, h);
        scratchCtx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = presence;
        ctx.drawImage(scratch, 0, 0, w, h, x0, y0, w, h);
        ctx.globalAlpha = 1;
    };

    const crisp = (value) => (Math.round(value * dpr) + 0.5) / dpr;

    const perimeterPoint = (distance, w, h) => {
        let d = (distance % (2 * (w + h)) + 2 * (w + h)) % (2 * (w + h));
        if (d < w) return [frameBox.x1 + d, frameBox.y1, 0, -1];
        d -= w;
        if (d < h) return [frameBox.x2, frameBox.y1 + d, 1, 0];
        d -= h;
        if (d < w) return [frameBox.x2 - d, frameBox.y2, 0, 1];
        d -= w;
        return [frameBox.x1, frameBox.y2 - d, -1, 0];
    };

    const drawSpecks = (a, accent) => {
        const w = frameBox.x2 - frameBox.x1;
        const h = frameBox.y2 - frameBox.y1;
        if (w < 2 || h < 2) return;
        const perimeter = 2 * (w + h);
        const seed = frameBox.index + 1;
        const grid = 3;
        ctx.fillStyle = accent;
        ctx.strokeStyle = accent;

        for (let k = 0; k < s.specks; k++) {
            const period = 0.5 + techNoise(seed, k, 11) * 1.2;
            const t = pulse / period + techNoise(seed, k, 17);
            const cycle = Math.floor(t);
            const life = t - cycle;
            if (life > 0.7) continue;
            const [px, py, nx, ny] = perimeterPoint(techNoise(seed, k, cycle) * perimeter, w, h);
            const pick = techNoise(seed, k, cycle, 2);
            const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11;
            const large = size >= 8;
            const out = (large ? 9 : 4) + Math.floor(techNoise(seed, k, cycle, 1) * 5) * grid;
            const x = frameBox.x1 + Math.round((px + nx * out - frameBox.x1) / grid) * grid;
            const y = frameBox.y1 + Math.round((py + ny * out - frameBox.y1) / grid) * grid;
            const tone = techNoise(seed, k, cycle, 3);
            const blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
            const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink;
            const left = Math.round(x - size / 2);
            const top = Math.round(y - size / 2);
            ctx.globalAlpha = alpha;
            if (tone < 0.26 || (large && tone < 0.78)) {
                ctx.strokeRect(left + 0.5, top + 0.5, size, size);
                if (large && tone > 0.5) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
            } else {
                ctx.fillRect(left, top, size, size);
            }
        }

        for (let j = 0; j < 2; j++) {
            const head = (pulse * 0.42 * s.speed + j * 0.5) * perimeter;
            for (let i = 0; i < 4; i++) {
                const [x, y] = perimeterPoint(head - i * 6, w, h);
                const size = i === 0 ? 3 : 2;
                ctx.globalAlpha = a * [0.95, 0.55, 0.32, 0.16][i];
                ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
            }
        }
        ctx.globalAlpha = 1;
    };

    const drawFrame = (accent) => {
        const glyph = glyphs[frameBox.index];
        if (!glyph || frameBox.alpha < 0.01) return;
        const a = frameBox.alpha;
        const x1 = crisp(frameBox.x1);
        const y1 = crisp(frameBox.y1);
        const x2 = crisp(frameBox.x2);
        const y2 = crisp(frameBox.y2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = accent;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;

        const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
        if (moved > 1) {
            const hx = (glyph.box.x1 + glyph.box.x2) / 2;
            const hy = (glyph.box.y1 + glyph.box.y2) / 2;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx + glyph.offset.x, hy + glyph.offset.y);
            ctx.setLineDash([3, 4]);
            ctx.globalAlpha = 0.45 * a;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4);
            ctx.globalAlpha = 0.7 * a;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.globalAlpha = 0.5 * a;
        ctx.stroke();

        ctx.beginPath();
        for (const [cx, cy] of [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) {
            ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
        }
        ctx.globalAlpha = 0.95 * a;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (s.specks > 0) drawSpecks(a, accent);

        if (!s.labels) return;
        ctx.font = LABEL_FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.62 * a;
        const label =
            moved > 1
                ? `${techSigned(Math.round(glyph.offset.x))}, ${techSigned(Math.round(-glyph.offset.y))}`
                : `${glyph.char}  ${Math.round(glyph.box.x2 - glyph.box.x1)} × ${Math.round(glyph.box.y2 - glyph.box.y1)}`;
        ctx.fillText(label, Math.round(frameBox.x1), Math.round(frameBox.y1) - 7);
        ctx.globalAlpha = 1;
    };

    const drawLines = (view, accent, alpha, growth) => {
        const pad = Math.max(12, view.size * 0.12);
        const x1 = Math.round(view.left - pad);
        const x2 = Math.round(view.right + pad);
        const room = width - x2 > x1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = accent;
        ctx.fillStyle = accent;
        ctx.lineWidth = 1;
        ctx.font = LABEL_FONT;
        ctx.textBaseline = "middle";
        ctx.textAlign = room ? "left" : "right";
        view.lines.forEach((line, k) => {
            const grow = growth(k);
            if (grow <= 0.001) return;
            const y = crisp(line.y);
            const end = x1 + (x2 - x1) * grow;
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(end, y);
            ctx.stroke();
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillRect(x1 - 1, Math.round(line.y) - 1, 3, 3);
            ctx.fillRect(Math.round(end) - 1, Math.round(line.y) - 1, 3, 3);
            if (s.labels) {
                ctx.globalAlpha = alpha * 0.62 * techSmoothstep(0.7, 1, grow);
                ctx.fillText(line.label, room ? x2 + 8 : x1 - 8, Math.round(line.y));
            }
        });
        ctx.textAlign = "left";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
    };

    const ensureCells = (glyph, view) => {
        if (glyph.cells) return glyph.cells;
        const art = glyph.fill;
        const size = Math.max(3, Math.round(view.size / 26));
        const w = art.image.width;
        const h = art.image.height;
        const source = art.image.getContext("2d");
        const cells = [];
        glyph.cells = cells;
        glyph.assembled = 0;
        if (!source || w < 2 || h < 2) return cells;
        const data = source.getImageData(0, 0, w, h).data;
        const gx = Math.floor(art.left / size) * size;
        const gy = Math.floor(art.top / size) * size;
        const cols = Math.ceil((art.left + w / dpr - gx) / size) + 1;
        const rows = Math.ceil((art.top + h / dpr - gy) / size) + 1;
        const hit = new Uint8Array(cols * rows);
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                if (data[(py * w + px) * 4 + 3] < 24) continue;
                const cx = Math.floor((art.left + px / dpr - gx) / size);
                const cy = Math.floor((art.top + py / dpr - gy) / size);
                hit[cy * cols + cx] = 1;
            }
        }
        const center = (glyph.box.x1 + glyph.box.x2) / 2;
        const along = techClamp01((center - view.left) / Math.max(1, view.right - view.left));
        for (let k = 0; k < hit.length; k++) {
            if (!hit[k]) continue;
            const angle = techNoise(glyph.index, k, 1) * Math.PI * 2;
            const distance = view.size * (0.25 + 0.6 * techNoise(glyph.index, k, 2));
            const start = 0.03 + 0.36 * along + 0.12 * techNoise(glyph.index, k, 3);
            const land = start + 0.3 + 0.14 * techNoise(glyph.index, k, 4);
            cells.push({
                x: gx + (k % cols) * size,
                y: gy + Math.floor(k / cols) * size,
                size,
                dx: Math.cos(angle) * distance,
                dy: Math.sin(angle) * distance * 0.7,
                start,
                land
            });
            glyph.assembled = Math.max(glyph.assembled, land);
        }
        return cells;
    };

    const cellRect = (x, y, size) => {
        const left = Math.round(x * dpr);
        const top = Math.round(y * dpr);
        return [left, top, Math.round((x + size) * dpr) - left, Math.round((y + size) * dpr) - top];
    };

    const drawAssembling = (glyph, progress, accent) => {
        const cells = glyph.cells || [];
        ctx.save();
        ctx.beginPath();
        let landed = 0;
        for (const cell of cells) {
            if (progress < cell.land) continue;
            const [x, y, w, h] = cellRect(cell.x, cell.y, cell.size);
            ctx.rect(x, y, w, h);
            landed++;
        }
        if (landed) {
            ctx.clip();
            blit(ctx, glyph.fill, 0, 0, 0, 0);
        }
        ctx.restore();
        ctx.fillStyle = accent;
        for (const cell of cells) {
            if (progress < cell.start || progress >= cell.land) continue;
            const u = (progress - cell.start) / (cell.land - cell.start);
            const eased = 1 - Math.pow(1 - u, 4);
            const size = cell.size * (0.4 + 0.6 * eased);
            const x = cell.x + (cell.size - size) / 2 + cell.dx * (1 - eased);
            const y = cell.y + (cell.size - size) / 2 + cell.dy * (1 - eased);
            const [left, top, w, h] = cellRect(x, y, size);
            ctx.globalAlpha = Math.min(1, u * 4) * (0.55 + 0.45 * eased);
            ctx.fillRect(left, top, Math.max(1, w), Math.max(1, h));
        }
        ctx.globalAlpha = 1;
    };

    const drawFilling = (glyph, lead, progress, view) => {
        const art = glyph.fill;
        const left = Math.floor(art.left * dpr);
        const top = Math.floor(art.top * dpr);
        const w = art.image.width + 2;
        const h = art.image.height + 2;
        const fill = techClamp01((progress - 0.24 - 0.28 * lead) / 0.48);
        const rects = [];
        for (const band of view.bands) {
            const amount = techSmoothstep(0.3 * band.order, 0.3 * band.order + 0.4, fill);
            if (amount <= 0) continue;
            const span = (band.y1 - band.y0) * amount;
            const y0 = Math.round((band.up ? band.y1 - span : band.y0) * dpr);
            const y1 = Math.round((band.up ? band.y1 : band.y0 + span) * dpr);
            if (y1 > y0) rects.push([y0, y1 - y0]);
        }
        const outline = techSmoothstep(0.08 + 0.2 * lead, 0.22 + 0.2 * lead, progress);
        if (outline > 0.001) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(left - 2, top - 2, w + 2, h + 2);
            for (const [y, span] of rects) ctx.rect(left - 2, y, w + 2, span);
            ctx.clip("evenodd");
            ctx.globalAlpha = outline;
            blit(ctx, glyph.dashes, 0, 0, 0, 0);
            ctx.restore();
        }
        if (rects.length) {
            ctx.save();
            ctx.beginPath();
            for (const [y, span] of rects) ctx.rect(left - 2, y, w + 2, span);
            ctx.clip();
            blit(ctx, glyph.fill, 0, 0, 0, 0);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    };

    const kick = (index) => {
        const strength = (word ? word.size : 120) * 11;
        kicks.push({ index, at: pulse, velocity: strength });
        for (let d = 1; d < glyphs.length; d++) {
            const velocity = strength * Math.pow(KICK_DECAY, d);
            if (velocity < 30) break;
            for (const j of [index - d, index + d]) {
                if (j >= 0 && j < glyphs.length) kicks.push({ index: j, at: pulse + d * 0.055, velocity });
            }
        }
        wake();
    };

    function tick(now) {
        raf = 0;
        if (!alive) return;
        if (sizeDirty) {
            sizeDirty = false;
            width = Math.max(1, container.clientWidth);
            height = Math.max(1, container.clientHeight);
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            const pixelWidth = Math.round(width * dpr);
            const pixelHeight = Math.round(height * dpr);
            if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
            if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
        }
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        const { ink, accent } = palette();
        const view = ensureLayout(ink);
        const damping = 2 * Math.sqrt(SPRING) * (1 - techClamp01(s.bounce) * 0.96);

        if (s.intro !== introKind) {
            introKind = s.intro;
            introClock = 0;
        }
        const introOn = introKind !== "none" && !reducedMotion && glyphs.length > 0;
        if (introOn && fontsReady) introClock += dt;
        const progress = introOn ? techClamp01((introClock - INTRO_DELAY) / Math.max(0.3, s.introDuration)) : 1;
        introducing = introOn && progress < 1;

        const sweeping = !introducing && s.sweep && !reducedMotion && !pointer.inside && dragging < 0;
        if (sweeping) clock += dt * s.speed;
        pulse += dt;
        let targetX = pointer.x;
        let targetY = pointer.y;
        if (sweeping) {
            targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45));
            targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8));
        }
        const active = !introducing && (pointer.inside || sweeping || dragging >= 0);
        if (active && !placed) {
            lens.x = targetX;
            lens.y = targetY;
        }
        if (active) {
            const lag = pointer.inside ? 0.05 : 0.22;
            lens.x = techApproach(lens.x, targetX, dt, lag);
            lens.y = techApproach(lens.y, targetY, dt, lag);
        }
        placed = active;
        presence = techApproach(presence, s.reveal === "area" && active && dragging < 0 ? 1 : 0, dt, 0.16);

        for (let k = kicks.length - 1; k >= 0; k--) {
            if (kicks[k].at > pulse) continue;
            const glyph = glyphs[kicks[k].index];
            if (glyph) glyph.velocity.y -= kicks[k].velocity;
            kicks.splice(k, 1);
        }

        let moving = false;
        glyphs.forEach((glyph, i) => {
            if (i === dragging) {
                glyph.offset.x = techApproach(glyph.offset.x, pointer.x - grab.x, dt, 0.03);
                glyph.offset.y = techApproach(glyph.offset.y, pointer.y - grab.y, dt, 0.03);
                glyph.velocity.x = 0;
                glyph.velocity.y = 0;
                moving = true;
                return;
            }
            const { offset, velocity } = glyph;
            if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) {
                offset.x = 0;
                offset.y = 0;
                velocity.x = 0;
                velocity.y = 0;
                return;
            }
            velocity.x += (-SPRING * offset.x - damping * velocity.x) * dt;
            velocity.y += (-SPRING * offset.y - damping * velocity.y) * dt;
            offset.x += velocity.x * dt;
            offset.y += velocity.y * dt;
            moving = true;
        });

        let typing = -1;
        if (introducing && introKind === "type") {
            const step = 0.86 / glyphs.length;
            const cursorAt = Math.min(glyphs.length - 1, Math.floor(progress / step));
            typing = progress < 0.93 ? cursorAt : -1;
            glyphs.forEach((glyph, i) => {
                glyph.shown = i < cursorAt ? 1 : i === cursorAt ? techSmoothstep(0, step * 0.3, progress - i * step) : 0;
            });
        } else {
            glyphs.forEach((glyph) => {
                glyph.shown = 1;
            });
        }

        const focus = introducing ? typing : dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
        if (focus >= 0 && s.selection) {
            const glyph = glyphs[focus];
            const bx1 = glyph.box.x1 + glyph.offset.x - 6;
            const by1 = glyph.box.y1 + glyph.offset.y - 6;
            const bx2 = glyph.box.x2 + glyph.offset.x + 6;
            const by2 = glyph.box.y2 + glyph.offset.y + 6;
            if (frameBox.index < 0 || frameBox.alpha < 0.02) {
                frameBox.x1 = bx1;
                frameBox.y1 = by1;
                frameBox.x2 = bx2;
                frameBox.y2 = by2;
            }
            const glide = focus === dragging ? 0.02 : 0.08;
            frameBox.x1 = techApproach(frameBox.x1, bx1, dt, glide);
            frameBox.y1 = techApproach(frameBox.y1, by1, dt, glide);
            frameBox.x2 = techApproach(frameBox.x2, bx2, dt, glide);
            frameBox.y2 = techApproach(frameBox.y2, by2, dt, glide);
            frameBox.index = focus;
        }
        frameBox.alpha = techApproach(frameBox.alpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);

        glyphs.forEach((glyph, i) => {
            const target = introducing
                ? introKind === "type" && (i === typing || (typing >= 0 && i > typing))
                    ? 1
                    : 0
                : s.reveal === "letter" && i === focus && i !== dragging
                    ? 1
                    : 0;
            if (introducing && glyph.shown === 0) glyph.outline = target;
            glyph.outline = techApproach(glyph.outline, target, dt, 0.09);
            if (Math.abs(glyph.outline - target) > 0.002) moving = true;
            else glyph.outline = target;
        });

        guideAlpha = techApproach(guideAlpha, s.guides && !introducing && (focus >= 0 || presence > 0.4) ? 1 : 0, dt, 0.14);

        const hovering = !introducing && focus >= 0 && pointer.inside;
        const nextCursor =
            dragging >= 0 ? "grabbing" : hovering && s.draggable ? "grab" : hovering && s.clickKick ? "pointer" : "";
        if (nextCursor !== cursor) {
            cursor = nextCursor;
            container.style.cursor = nextCursor;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const glyph of glyphs) {
            const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
            if (moved > 1) {
                ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
                blit(ctx, glyph.dashes, 0, 0, 0, 0);
                ctx.globalAlpha = 1;
            }
        }
        if (introducing && introKind === "metrics") {
            drawLines(view, accent, 1 - techSmoothstep(0.84, 1, progress), (k) =>
                techSmoothstep(0.02 + 0.04 * k, 0.2 + 0.04 * k, progress)
            );
        } else if (guideAlpha > 0.005) {
            drawLines(view, accent, guideAlpha * 0.6, () => 1);
        }
        glyphs.forEach((glyph, i) => {
            if (introducing && introKind === "assemble") {
                if (progress < glyph.assembled) {
                    drawAssembling(glyph, progress, accent);
                    return;
                }
            }
            if (introducing && introKind === "metrics") {
                const lead = glyphs.length > 1 ? i / (glyphs.length - 1) : 0;
                if (progress < 0.72 + 0.28 * lead) {
                    drawFilling(glyph, lead, progress, view);
                    return;
                }
            }
            if (glyph.shown < 0.001) return;
            if (glyph.outline < 0.999) {
                ctx.globalAlpha = (1 - glyph.outline) * glyph.shown;
                blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0);
            }
            if (glyph.outline > 0.001) {
                ctx.globalAlpha = glyph.outline * glyph.shown;
                blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0);
            }
            ctx.globalAlpha = 1;
        });
        if (presence > 0.001) drawReveal();
        drawFrame(accent);

        const settling =
            moving ||
            introducing ||
            kicks.length > 0 ||
            (guideAlpha > 0.005 && guideAlpha < 0.995) ||
            Math.abs(presence - (s.reveal === "area" && active && dragging < 0 ? 1 : 0)) > 0.002 ||
            (frameBox.alpha > 0.01 && frameBox.alpha < 0.99);
        if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
    }

    function wake() {
        if (raf || !visible || !alive) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
    }

    const resize = () => {
        sizeDirty = true;
        wake();
    };

    const locate = (e) => {
        const rect = container.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
    };
    const onMove = (e) => {
        locate(e);
        pointer.inside = true;
        wake();
    };
    const onLeave = () => {
        if (dragging >= 0) return;
        pointer.inside = false;
        wake();
    };
    const onDown = (e) => {
        locate(e);
        pointer.inside = true;
        const primary = e.pointerType !== "mouse" || e.button === 0;
        const index = introducing || !primary ? -1 : glyphAt(pointer.x, pointer.y);
        press.x = pointer.x;
        press.y = pointer.y;
        press.time = performance.now();
        press.index = index;
        if (s.draggable && index >= 0) {
            dragging = index;
            grab.x = pointer.x - glyphs[index].offset.x;
            grab.y = pointer.y - glyphs[index].offset.y;
            container.setPointerCapture?.(e.pointerId);
        }
        wake();
    };
    const onUp = (e) => {
        if (dragging >= 0) {
            dragging = -1;
            container.releasePointerCapture?.(e.pointerId);
            const rect = container.getBoundingClientRect();
            pointer.inside =
                e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        }
        if (e.type === "pointerup" && press.index >= 0 && s.clickKick && !reducedMotion && performance.now() - press.time < 450) {
            const rect = container.getBoundingClientRect();
            if (Math.hypot(e.clientX - rect.left - press.x, e.clientY - rect.top - press.y) < 6) kick(press.index);
        }
        press.index = -1;
        wake();
    };

    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener("pointerenter", onMove, { passive: true });
    container.addEventListener("pointerdown", onDown, { passive: true });
    container.addEventListener("pointerup", onUp, { passive: true });
    container.addEventListener("pointercancel", onUp, { passive: true });
    container.addEventListener("pointerleave", onLeave, { passive: true });

    new ResizeObserver(resize).observe(container);
    window.addEventListener("resize", resize, { passive: true });
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        wake();
    }).observe(container);
    if (document.fonts) document.fonts.ready.then(fontsLoaded, fontsLoaded);

    resize();
}

function renderHero() {
    const { basic } = portfolioData;
    document.title = `${basic.name} | ${basic.role}`;

    const title = qs("#hero-title");
    title.textContent = basic.name;
    title.setAttribute("aria-label", basic.name);

    qs("#hero-role").textContent = basic.role;
    qs("#hero-intro").textContent = basic.intro;
    qs("#hero-location").textContent = basic.location;
    qs("#hero-photo").src = basic.profileImage;
    qs("#hero-photo").alt = `${basic.name} portrait`;

    const resume = qs("#nav-resume");
    if (basic.resumeLink) {
        resume.href = basic.resumeLink;
        resume.hidden = false;
    } else {
        resume.hidden = true;
    }
}

// A section whose source array is empty would render as a heading over an empty
// box, and its nav link would scroll to nothing. Contact is excluded because it
// renders from objects, not arrays.
function hideEmptySections() {
    const sources = {
        experience: portfolioData.experience,
        projects: portfolioData.projects,
        hackathons: portfolioData.achievements,
        skills: portfolioData.skills,
        education: portfolioData.education,
        leadership: portfolioData.leadership
    };

    Object.entries(sources).forEach(([id, items]) => {
        if (items.length) return;
        qs(`#${id}`).hidden = true;
        document.querySelector(`.site-nav a[href="#${id}"]`)?.remove();
    });

    if (!portfolioData.archivedProjects.length) {
        qs("#archive-toggle").hidden = true;
    }
}

function renderExperience() {
    const list = qs("#experience-list");

    portfolioData.experience.forEach((item) => {
        const card = el("article", "timeline-card");
        const header = el("div", "card-header");
        const titleWrap = el("div");

        titleWrap.append(el("p", "meta", item.period), el("h3", "", `${item.company} - ${item.title}`));
        header.append(titleWrap);

        card.append(header, el("p", "summary", item.summary), pointList(item.points), tagList(item.tags));
        list.append(card);
    });
}

function renderProjects() {
    const grid = qs("#project-grid");

    portfolioData.projects.forEach((project) => {
        grid.append(projectCard(project));
    });

    renderArchivedProjects();
}

function projectCard(project) {
    const card = el("article", "project-card");

    if (project.image) {
        const preview = el("button", "project-preview");
        preview.type = "button";
        preview.setAttribute("aria-label", `Open ${project.name} screenshot`);

        const image = document.createElement("img");
        image.src = project.image;
        image.alt = `${project.name} screenshot`;
        image.loading = "lazy";

        preview.append(image);
        preview.addEventListener("click", () => openImageDialog(project.image, `${project.name} screenshot`));
        card.append(preview);
    }

    const actions = el("div", "inline-links");
    if (project.link) {
        actions.append(link("Live", project.link));
    }
    if (project.github) {
        actions.append(link("Code", project.github));
    }

    const header = el("div", "project-card-header");
    const titleWrap = el("div");
    titleWrap.append(el("p", "meta", project.type), el("h3", "", project.name));
    header.append(titleWrap);
    if (actions.children.length) {
        header.append(actions);
    }

    card.append(
        header,
        el("p", "summary", project.summary),
        pointList(project.points),
        tagList(project.stack)
    );

    return card;
}

function renderArchivedProjects() {
    const archiveGrid = qs("#archive-grid");
    const archiveToggle = qs("#archive-toggle");

    portfolioData.archivedProjects.forEach((project) => {
        archiveGrid.append(projectCard(project));
    });

    archiveToggle.addEventListener("click", () => {
        const isExpanded = archiveToggle.getAttribute("aria-expanded") === "true";
        archiveToggle.setAttribute("aria-expanded", String(!isExpanded));
        archiveGrid.hidden = isExpanded;
        archiveToggle.textContent = isExpanded ? "show archived builds" : "hide archived builds";
    });
}

function renderAchievements() {
    const grid = qs("#achievement-grid");

    portfolioData.achievements.forEach((achievement) => {
        const card = el("article", "achievement-card");

        if (achievement.image) {
            const preview = el("button", "achievement-preview");
            preview.type = "button";
            preview.setAttribute("aria-label", `Open ${achievement.title} photo`);

            const image = document.createElement("img");
            image.src = achievement.image;
            image.alt = `${achievement.title} prize photo`;
            image.loading = "lazy";

            preview.append(image);
            preview.addEventListener("click", () => openImageDialog(achievement.image, `${achievement.title} prize photo`));
            card.append(preview);
        }

        card.append(el("h3", "", achievement.title), el("p", "summary", achievement.detail));
        if (achievement.link) {
            card.append(link("Certificate", achievement.link));
        }
        grid.append(card);
    });
}

function renderSkills() {
    const board = qs("#skill-board");
    portfolioData.skills.forEach((skillGroup) => {
        const card = el("article", "skill-card");
        card.append(el("h3", "", skillGroup.group), tagList(skillGroup.items));
        board.append(card);
    });
}

function renderEducation() {
    const educationList = qs("#education-list");
    portfolioData.education.forEach((education) => {
        const card = el("article", "education-box");
        const body = el("div", "card-body");
        body.append(
            el("h3", "", education.institution),
            el("p", "summary", `${education.degree} / ${education.period}`),
            el("p", "meta", education.result)
        );
        card.append(logoImage(education.logo), body);
        educationList.append(card);
    });
}

function renderLeadership() {
    const leadershipList = qs("#leadership-list");
    portfolioData.leadership.forEach((entry) => {
        const card = el("article", "leadership-card");
        const body = el("div", "card-body");
        body.append(
            el("h3", "", `${entry.organization} - ${entry.role}`),
            el("p", "summary", entry.summary)
        );
        card.append(logoImage(entry.logo), body);
        leadershipList.append(card);
    });
}

function renderContact() {
    qs("#contact-pitch").textContent = portfolioData.contact.pitch;
    qs("#footer-copy").textContent = `${new Date().getFullYear()} ${portfolioData.basic.name}.`;

    const socials = qs("#social-links");
    socials.append(link(portfolioData.basic.email, `mailto:${portfolioData.basic.email}`, "social-link primary"));
    portfolioData.social.forEach((social) => socials.append(link(social.label, social.href, "social-link")));
}

function initializeDialog() {
    const dialog = qs("#image-dialog");
    // A modal dialog paints in the top layer, above the custom pointer, so the
    // native cursor has to take over while one is open.
    dialog.addEventListener("toggle", () => {
        document.documentElement.dataset.dialogOpen = String(dialog.open);
    });
    qs("#dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
}

function openImageDialog(src, caption) {
    const dialog = qs("#image-dialog");
    qs("#dialog-image").src = src;
    qs("#dialog-image").alt = caption;
    qs("#dialog-caption").textContent = caption;

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }
}

function pointList(points) {
    const list = el("ul", "point-list");
    points.forEach((point) => list.append(el("li", "", point)));
    return list;
}

function svgIcon(icon) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (icon.stroke) {
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.7");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
    } else {
        svg.setAttribute("fill", "currentColor");
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", icon.d);
    svg.append(path);
    return svg;
}

function tagList(tags) {
    const wrap = el("div", "tag-list");
    tags.forEach((tag) => {
        const icon = skillIcons[tag.toLowerCase()];
        const badge = el("span", "skill-badge");
        if (icon) {
            badge.append(svgIcon(icon));
        }
        badge.append(el("span", "", tag));
        badge.style.setProperty("--brand-color", icon ? icon.color : "var(--green)");
        wrap.append(badge);
    });
    return wrap;
}

const DOT_STIFFNESS = 360;
const DOT_BOUNCE = 0.3;

function initializeNavigation() {
    const nav = qs("#site-nav");
    const links = qsa("a", nav);
    const dot = qs(".nav-dot", nav);
    const pill = qs("#pill-nav");
    const toggle = qs("#nav-toggle");
    const panel = qs("#nav-panel");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    const labels = links.map((link) => link.textContent.trim());

    links.forEach((link, index) => {
        const face = el("span", "nav-face", labels[index]);
        const alt = el("span", "nav-face-alt", labels[index]);
        alt.setAttribute("aria-hidden", "true");
        link.textContent = "";
        link.append(face, alt);

        const row = el("a", "nav-row", labels[index]);
        row.href = link.getAttribute("href");
        row.addEventListener("click", () => setActive(index));
        panel.append(row);
    });

    const resume = qs("#nav-resume");
    if (!resume.hidden) {
        const row = el("a", "nav-row", "Resume");
        row.href = resume.href;
        row.target = "_blank";
        row.rel = "noopener noreferrer";
        panel.append(row);
    }

    // Nothing is lit until the observer decides which section owns the viewport,
    // so the dot starts parked off the list rather than under the first link.
    let activeIndex = -1;
    let dotX = 0;
    let dotVelocity = 0;
    let dotAlpha = 0;
    let frame = null;
    let previous = 0;

    const centerOf = (index) => {
        const link = links[index];
        return link ? link.offsetLeft + link.offsetWidth / 2 : null;
    };

    const tick = (now) => {
        frame = null;
        const center = centerOf(activeIndex);
        if (center === null) {
            dotAlpha = 0;
            dot.style.opacity = "0";
            return;
        }
        const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 1 / 60;
        previous = now;

        if (reducedMotion.matches) {
            dotX = center;
            dotVelocity = 0;
            dotAlpha = 1;
        } else {
            if (dotAlpha < 0.02) {
                dotX = center;
                dotVelocity = 0;
            }
            // Sub-stepped so a fast flick never tunnels through the spring target.
            const damping = 2 * (1 - 0.5 * DOT_BOUNCE) * Math.sqrt(DOT_STIFFNESS);
            const steps = Math.ceil(dt / (1 / 240));
            const h = dt / steps;
            for (let i = 0; i < steps; i++) {
                dotVelocity += (-DOT_STIFFNESS * (dotX - center) - damping * dotVelocity) * h;
                dotX += dotVelocity * h;
            }
            dotAlpha += (1 - dotAlpha) * (1 - Math.exp(-dt / 0.1));
        }

        // Speed stretches the dot sideways, so it reads as a flick rather than a teleport.
        const pull = Math.min(2.2, Math.abs(dotVelocity) / 700);
        dot.style.transform = `translate3d(${dotX}px, 0, 0) scaleX(${1 + pull})`;
        dot.style.opacity = String(dotAlpha);

        const settled = Math.abs(dotX - center) <= 0.05 && Math.abs(dotVelocity) <= 0.5 && dotAlpha >= 0.999;
        if (!settled && !reducedMotion.matches) {
            frame = requestAnimationFrame(tick);
        }
    };

    const wake = () => {
        if (!frame) {
            previous = 0;
            frame = requestAnimationFrame(tick);
        }
    };

    function setActive(index) {
        activeIndex = index;
        links.forEach((link, i) => link.classList.toggle("active", i === index));
        qsa(".nav-row", panel).forEach((row, i) => row.classList.toggle("active", i === index));
        closePanel();
        wake();
    }

    function closePanel() {
        pill.removeAttribute("data-open");
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
        const open = pill.toggleAttribute("data-open");
        toggle.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
        }
    });

    document.addEventListener("click", (event) => {
        if (pill.hasAttribute("data-open") && !pill.contains(event.target)) {
            closePanel();
        }
    });

    links.forEach((link, index) => link.addEventListener("click", () => setActive(index)));
    window.addEventListener("resize", wake);

    const sections = links
        .map((link) => ({ id: link.getAttribute("href").slice(1), el: qs(link.getAttribute("href")) }))
        .filter((section) => section.el);

    // A reading line just under the sticky bar owns the page: whichever section
    // most recently crossed it is the one at the top of the view. Keeping the line
    // shallow also means an anchor jump to a short section still lands on its own
    // button rather than the next one down.
    const currentSection = () => {
        if (window.scrollY < 4) {
            return -1;
        }
        // A short final section can never reach the line, so the bottom of the page
        // still has to land on its button.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
            return sections.length - 1;
        }
        const line = Math.min(pill.getBoundingClientRect().bottom + 48, window.innerHeight * 0.4);
        let index = -1;
        sections.forEach((section, i) => {
            if (section.el.getBoundingClientRect().top <= line) {
                index = i;
            }
        });
        return index;
    };

    const syncSpy = () => {
        const index = currentSection();
        if (index === activeIndex) {
            return;
        }
        activeIndex = index;
        links.forEach((link, i) => link.classList.toggle("active", i === index));
        qsa(".nav-row", panel).forEach((row, i) => row.classList.toggle("active", i === index));
        wake();
    };

    window.addEventListener("scroll", syncSpy, { passive: true });
    window.addEventListener("resize", syncSpy);
    syncSpy();
    wake();
}

const CURSOR_LOCKS = "a, button, input, select, textarea, summary, .skill-badge";

function initializeCursor() {
    const ringWrap = qs(".cursor-ring-wrap");
    const dotWrap = qs(".cursor-dot-wrap");
    if (!ringWrap || !dotWrap || !matchMedia("(pointer: fine)").matches) {
        return;
    }

    const ring = qs(".cursor-ring", ringWrap);
    const dot = qs(".cursor-dot", dotWrap);

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let frame = null;

    // The ring trails the pointer; catching up instantly would just be a second cursor.
    const trail = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.2;

    const step = () => {
        ringX += (targetX - ringX) * trail;
        ringY += (targetY - ringY) * trail;
        ringWrap.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        const stillTrailing = Math.abs(targetX - ringX) > 0.2 || Math.abs(targetY - ringY) > 0.2;
        frame = stillTrailing ? requestAnimationFrame(step) : null;
    };

    document.addEventListener("pointermove", (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        dotWrap.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        if (frame === null) {
            frame = requestAnimationFrame(step);
        }
        const isLocked = Boolean(event.target.closest && event.target.closest(CURSOR_LOCKS));
        ring.classList.toggle("locked", isLocked);
        dot.classList.toggle("locked", isLocked);
    });

    const setFiring = (on) => {
        ring.classList.toggle("firing", on);
        dot.classList.toggle("firing", on);
    };
    document.addEventListener("pointerdown", () => setFiring(true));
    document.addEventListener("pointerup", () => setFiring(false));
    document.addEventListener("pointercancel", () => setFiring(false));

    const setOpacity = (value) => {
        ringWrap.style.opacity = value;
        dotWrap.style.opacity = value;
    };
    document.documentElement.addEventListener("mouseleave", () => setOpacity("0"));
    document.documentElement.addEventListener("mouseenter", () => setOpacity("1"));
}

function initialize() {
    renderHero();
    renderExperience();
    renderProjects();
    renderAchievements();
    renderSkills();
    renderEducation();
    renderLeadership();
    renderContact();
    hideEmptySections();
    initializeDialog();
    initializeNavigation();
    initializeCursor();
    initializeTechText();
}

document.addEventListener("DOMContentLoaded", initialize);
