// --- Conversion ---
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function parseColor(input) {
  if (typeof input === 'string') {
    if (input.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(input)) {
      const rgb = hexToRgb(input);
      return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) };
    }
  }
  if (input.r !== undefined) {
    return { hex: rgbToHex(input), rgb: input, hsl: rgbToHsl(input) };
  }
  if (input.h !== undefined) {
    const rgb = hslToRgb(input);
    return { hex: rgbToHex(rgb), rgb, hsl: input };
  }
  return null;
}

// --- Harmonies ---
function complementary(hex) {
  const c = parseColor(hex);
  const comp = hslToRgb({ h: (c.hsl.h + 180) % 360, s: c.hsl.s, l: c.hsl.l });
  return [c.hex, rgbToHex(comp)];
}

function analogous(hex) {
  const c = parseColor(hex);
  return [-30, 0, 30].map(offset => {
    const rgb = hslToRgb({ h: (c.hsl.h + offset + 360) % 360, s: c.hsl.s, l: c.hsl.l });
    return rgbToHex(rgb);
  });
}

function triadic(hex) {
  const c = parseColor(hex);
  return [0, 120, 240].map(offset => {
    const rgb = hslToRgb({ h: (c.hsl.h + offset) % 360, s: c.hsl.s, l: c.hsl.l });
    return rgbToHex(rgb);
  });
}

function splitComplementary(hex) {
  const c = parseColor(hex);
  return [0, 150, 210].map(offset => {
    const rgb = hslToRgb({ h: (c.hsl.h + offset) % 360, s: c.hsl.s, l: c.hsl.l });
    return rgbToHex(rgb);
  });
}

function tetradic(hex) {
  const c = parseColor(hex);
  return [0, 90, 180, 270].map(offset => {
    const rgb = hslToRgb({ h: (c.hsl.h + offset) % 360, s: c.hsl.s, l: c.hsl.l });
    return rgbToHex(rgb);
  });
}

function monochromatic(hex, count = 5) {
  const c = parseColor(hex);
  const results = [];
  for (let i = 0; i < count; i++) {
    const l = Math.max(10, Math.min(90, c.hsl.l - 30 + (60 / (count - 1)) * i));
    results.push(rgbToHex(hslToRgb({ h: c.hsl.h, s: c.hsl.s, l: Math.round(l) })));
  }
  return results;
}

// --- Gradient ---
function gradient(hex1, hex2, steps = 5) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const result = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    result.push(rgbToHex({
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    }));
  }
  return result;
}

// --- Contrast / Accessibility ---
function luminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

function wcagCheck(hex1, hex2) {
  const ratio = contrastRatio(hex1, hex2);
  return {
    ratio,
    AA_normal: ratio >= 4.5,
    AA_large: ratio >= 3,
    AAA_normal: ratio >= 7,
    AAA_large: ratio >= 4.5,
  };
}

// --- Random palette ---
function randomPalette(count = 5) {
  const baseHue = Math.floor(Math.random() * 360);
  return Array.from({ length: count }, (_, i) => {
    const h = (baseHue + (360 / count) * i + Math.random() * 20 - 10) % 360;
    const s = 50 + Math.random() * 30;
    const l = 40 + Math.random() * 30;
    return rgbToHex(hslToRgb({ h: Math.round(h), s: Math.round(s), l: Math.round(l) }));
  });
}

// --- CSS output ---
function toCss(colors, name = 'palette') {
  return `:root {\n${colors.map((c, i) => `  --${name}-${i + 1}: ${c};`).join('\n')}\n}`;
}

function toTailwind(colors, name = 'brand') {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const obj = {};
  colors.forEach((c, i) => { if (shades[i]) obj[shades[i]] = c; });
  return { [name]: obj };
}

module.exports = {
  parseColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  gradient, contrastRatio, wcagCheck, randomPalette, toCss, toTailwind,
};
