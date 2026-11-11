// Code-drawn art: helmets, tokens, logos. Everything is SVG strings so it's sharp at any size
// and recolors per team. Swap these out for illustrated art later without touching game logic.

export const TIER_COLORS = ['#666', '#9aa3ad', '#3fbf7f', '#3b8df0', '#b25cf0', '#f5b82e'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Side-view football helmet.
export function helmet(colors, { flip = false, num = '', walkon = false } = {}) {
  const main = walkon ? '#4a5060' : colors.main;
  const alt = walkon ? '#6b7285' : colors.alt;
  const dark = shade(main, -45);
  const light = shade(main, 50);
  const t = flip ? 'transform="translate(64 0) scale(-1 1)"' : '';
  const numTxt = num !== '' && num !== 0
    ? `<text x="${flip ? 40 : 24}" y="27" font-family="Bebas Neue, Impact, sans-serif" font-size="13" text-anchor="middle" fill="${alt}" opacity=".95">${esc(num)}</text>` : '';
  return `<svg viewBox="0 0 64 56" class="helmet" aria-hidden="true">
<g ${t}>
<path d="M7 33 C7 13 22 3 37 3 C52 3 60 14 60 27 L60 35 L46 39 L44 50 L21 50 C11 50 7 43 7 33 Z" fill="${main}" stroke="${dark}" stroke-width="2"/>
<path d="M14 16 C20 8 29 5 37 5" stroke="${light}" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>
<path d="M33 3.6 C44 3.6 54 9 58 19" stroke="${alt}" stroke-width="4.5" fill="none"/>
<circle cx="31" cy="34" r="3.6" fill="rgba(0,0,0,.4)"/>
<path d="M44 39 L44 50" stroke="${dark}" stroke-width="2"/>
<path d="M50 29 L63 29 M47 37 L63 37 M56 25 L56 47 M48 45 L62 47" stroke="#d6dbe2" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</g>
${numTxt}
</svg>`;
}

export function stars(n) {
  if (!n) return '';
  return `<span class="stars s${n}">${'★'.repeat(n)}</span>`;
}

// Simple school logo: a shield with initials.
export function shield(colors, name, size = 34) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `<svg viewBox="0 0 40 44" width="${size}" height="${Math.round(size * 1.1)}" class="shield" aria-hidden="true">
<path d="M20 2 L37 8 L35 26 C33 35 26 40 20 42 C14 40 7 35 5 26 L3 8 Z" fill="${colors.main}" stroke="${colors.alt}" stroke-width="2.5"/>
<text x="20" y="27" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="17" fill="${colors.alt}">${esc(initials)}</text>
</svg>`;
}

export function football(size = 22) {
  return `<svg viewBox="0 0 40 24" width="${size}" height="${Math.round(size * 0.6)}" aria-hidden="true"><ellipse cx="20" cy="12" rx="18" ry="10" fill="#8a4b22" stroke="#4d2710" stroke-width="2"/><path d="M13 12 H27 M16 9 V15 M20 9 V15 M24 9 V15" stroke="#f3e9d9" stroke-width="1.8"/></svg>`;
}

export function logoMark() {
  return `<div class="logo"><span class="logo-prep">PREP</span><span class="logo-tac">TACTICS</span></div>`;
}
