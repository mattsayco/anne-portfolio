/**
 * One-off development helper that draws clearly-labelled SAMPLE artwork and
 * placeholder content so the site can be built and tested before the artist
 * uploads real work. Every image is procedurally generated (no third-party art)
 * and stamped "SAMPLE".
 *
 *   node scripts/generate-placeholders.mjs
 *
 * Safe to delete once real content exists. It never overwrites existing content
 * JSON unless run with --force.
 */
import sharp from 'sharp';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const force = process.argv.includes('--force');

// ---------- tiny seeded RNG ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const palettes = {
  dusk: ['#2b1d3a', '#5b3a6e', '#c2577a', '#f4a259', '#ffe3b3'],
  forest: ['#10261f', '#1f4d3a', '#3f8a5b', '#a7c957', '#f2e8cf'],
  ocean: ['#0b1d33', '#14456b', '#2a7fb8', '#7cc6e8', '#e8f6fb'],
  ember: ['#1c0f0a', '#5a1e12', '#b5401f', '#f08a3c', '#ffd28a'],
  candy: ['#2d1b4e', '#7b4bb7', '#f26ca7', '#ffc2d9', '#fff4e6'],
  snow: ['#1d2a3a', '#3e5a78', '#8fb0cc', '#d4e4f1', '#ffffff'],
  moss: ['#1a1f16', '#3c4a2a', '#7a8b45', '#c9c27a', '#f3eed9'],
};

const stamp = (w, h) => {
  const fs = Math.max(14, Math.round(Math.min(w, h) * 0.028));
  return `<g font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="${fs * 0.12}">
    <rect x="${fs}" y="${h - fs * 2.6}" width="${fs * 6.2}" height="${fs * 1.7}" rx="${fs * 0.4}" fill="rgba(0,0,0,.55)"/>
    <text x="${fs * 1.6}" y="${h - fs * 1.35}" font-size="${fs}" fill="#fff">SAMPLE</text>
  </g>`;
};

// ---------- generators (return SVG strings) ----------
function landscape(w, h, pal, seed, { sun = true, layers = 5 } = {}) {
  const r = rng(seed);
  let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${pal[1]}"/><stop offset=".65" stop-color="${pal[3]}"/><stop offset="1" stop-color="${pal[4]}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  if (sun) s += `<circle cx="${w * (0.3 + r() * 0.4)}" cy="${h * (0.25 + r() * 0.15)}" r="${Math.min(w, h) * 0.12}" fill="${pal[4]}" opacity=".9"/>`;
  for (let i = 0; i < layers; i++) {
    const base = h * (0.45 + (i / layers) * 0.5);
    const amp = h * (0.12 - i * 0.015);
    let d = `M0 ${h} L0 ${base}`;
    const steps = 8 + i * 2;
    for (let k = 0; k <= steps; k++) {
      const x = (k / steps) * w;
      const y = base - amp * (0.4 + r() * 0.8) * (k % 2 ? 1 : 0.5);
      d += ` Q${x - w / steps / 2} ${y - amp * r() * 0.5} ${x} ${y}`;
    }
    d += ` L${w} ${h} Z`;
    const col = pal[Math.max(0, 2 - Math.floor(i / 2))];
    s += `<path d="${d}" fill="${col}" opacity="${0.55 + i * 0.1}"/>`;
  }
  return s;
}

function character(w, h, pal, seed) {
  const r = rng(seed);
  const cx = w / 2;
  const bodyW = w * 0.42;
  let s = `<rect width="${w}" height="${h}" fill="${pal[4]}"/>
    <circle cx="${cx}" cy="${h * 0.45}" r="${w * 0.42}" fill="${pal[3]}" opacity=".35"/>
    <path d="M${cx - bodyW / 2} ${h} Q${cx - bodyW / 2} ${h * 0.55} ${cx} ${h * 0.55} Q${cx + bodyW / 2} ${h * 0.55} ${cx + bodyW / 2} ${h} Z" fill="${pal[1]}"/>
    <ellipse cx="${cx}" cy="${h * 0.4}" rx="${w * 0.2}" ry="${w * 0.22}" fill="${pal[2]}"/>`;
  // hair / hat
  s += `<path d="M${cx - w * 0.23} ${h * 0.38} Q${cx} ${h * (0.12 + r() * 0.06)} ${cx + w * 0.23} ${h * 0.38} Q${cx} ${h * 0.28} ${cx - w * 0.23} ${h * 0.38}Z" fill="${pal[0]}"/>`;
  const eyeY = h * 0.42;
  for (const dx of [-1, 1]) {
    s += `<ellipse cx="${cx + dx * w * 0.07}" cy="${eyeY}" rx="${w * 0.03}" ry="${w * 0.04}" fill="${pal[0]}"/>
      <circle cx="${cx + dx * w * 0.07 + w * 0.01}" cy="${eyeY - w * 0.015}" r="${w * 0.01}" fill="#fff"/>`;
  }
  s += `<path d="M${cx - w * 0.04} ${h * 0.48} Q${cx} ${h * 0.5} ${cx + w * 0.04} ${h * 0.48}" stroke="${pal[0]}" stroke-width="${w * 0.008}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 14; i++) {
    s += `<circle cx="${r() * w}" cy="${r() * h * 0.5}" r="${2 + r() * w * 0.008}" fill="${pal[2]}" opacity=".6"/>`;
  }
  return s;
}

function environment(w, h, pal, seed) {
  const r = rng(seed);
  let s = `<rect width="${w}" height="${h}" fill="${pal[0]}"/>`;
  const tile = w / 9;
  for (let gy = 0; gy < 7; gy++) {
    for (let gx = 0; gx < 7; gx++) {
      const x = w / 2 + (gx - gy) * tile * 0.5;
      const y = h * 0.18 + (gx + gy) * tile * 0.28;
      const z = Math.floor(r() * 3) * tile * 0.25;
      const top = `M${x} ${y - z} l${tile / 2} ${tile * 0.28} l${-tile / 2} ${tile * 0.28} l${-tile / 2} ${-tile * 0.28}Z`;
      const left = `M${x - tile / 2} ${y - z + tile * 0.28} l${tile / 2} ${tile * 0.28} v${z + tile * 0.2} l${-tile / 2} ${-tile * 0.28}Z`;
      const right = `M${x + tile / 2} ${y - z + tile * 0.28} l${-tile / 2} ${tile * 0.28} v${z + tile * 0.2} l${tile / 2} ${-tile * 0.28}Z`;
      s += `<path d="${left}" fill="${pal[1]}"/><path d="${right}" fill="${pal[2]}"/><path d="${top}" fill="${pal[3]}"/>`;
      if (r() > 0.82) s += `<circle cx="${x}" cy="${y - z - tile * 0.15}" r="${tile * 0.14}" fill="${pal[4]}"/>`;
    }
  }
  return s;
}

function icons(w, h, pal, seed) {
  const r = rng(seed);
  let s = `<rect width="${w}" height="${h}" fill="${pal[0]}"/>`;
  const n = 3;
  const cell = w / n;
  for (let i = 0; i < n * n; i++) {
    const x = (i % n) * cell + cell / 2;
    const y = Math.floor(i / n) * cell + cell / 2;
    const c = pal[2 + (i % 3)];
    s += `<rect x="${x - cell * 0.36}" y="${y - cell * 0.36}" width="${cell * 0.72}" height="${cell * 0.72}" rx="${cell * 0.16}" fill="${pal[1]}"/>`;
    const k = Math.floor(r() * 4);
    if (k === 0) s += `<circle cx="${x}" cy="${y}" r="${cell * 0.18}" fill="${c}"/>`;
    if (k === 1) s += `<path d="M${x} ${y - cell * 0.2} L${x + cell * 0.2} ${y + cell * 0.16} L${x - cell * 0.2} ${y + cell * 0.16}Z" fill="${c}"/>`;
    if (k === 2) s += `<path d="M${x} ${y - cell * 0.2} l${cell * 0.06} ${cell * 0.13} l${cell * 0.14} 0 l${-cell * 0.11} ${cell * 0.09} l${cell * 0.05} ${cell * 0.15} l${-cell * 0.14} ${-cell * 0.09} l${-cell * 0.14} ${cell * 0.09} l${cell * 0.05} ${-cell * 0.15} l${-cell * 0.11} ${-cell * 0.09} l${cell * 0.14} 0Z" fill="${c}"/>`;
    if (k === 3) s += `<rect x="${x - cell * 0.16}" y="${y - cell * 0.16}" width="${cell * 0.32}" height="${cell * 0.32}" rx="${cell * 0.05}" fill="none" stroke="${c}" stroke-width="${cell * 0.06}"/>`;
  }
  return s;
}

function threeD(w, h, pal, seed) {
  const r = rng(seed);
  let s = `<defs>
    <radialGradient id="sph" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${pal[4]}"/><stop offset=".45" stop-color="${pal[3]}"/><stop offset="1" stop-color="${pal[1]}"/></radialGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal[4]}"/><stop offset="1" stop-color="${pal[3]}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#floor)"/>`;
  const objs = 3 + Math.floor(r() * 2);
  for (let i = 0; i < objs; i++) {
    const rad = Math.min(w, h) * (0.09 + r() * 0.08);
    const x = w * (0.2 + (i / objs) * 0.65 + r() * 0.05);
    const y = h * (0.5 + r() * 0.25);
    s += `<ellipse cx="${x + rad * 0.3}" cy="${y + rad * 0.95}" rx="${rad * 1.1}" ry="${rad * 0.3}" fill="url(#sh)"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="url(#sph)"/>`;
  }
  return s;
}

function misc(w, h, pal, seed) {
  const r = rng(seed);
  let s = `<rect width="${w}" height="${h}" fill="${pal[4]}"/>`;
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 10 + r() * Math.min(w, h) * 0.18;
    s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${pal[Math.floor(r() * 4)]}" opacity="${0.35 + r() * 0.5}"/>`;
  }
  for (let i = 0; i < 6; i++) {
    s += `<path d="M0 ${r() * h} C${w * 0.3} ${r() * h} ${w * 0.6} ${r() * h} ${w} ${r() * h}" stroke="${pal[0]}" stroke-width="${2 + r() * 6}" fill="none" opacity=".6"/>`;
  }
  return s;
}

/** Pixel sprite: drawn on a tiny grid then upscaled with nearest-neighbour. */
async function pixelSprite(file, pal, seed, size = 32, scale = 24) {
  const r = rng(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));
  // mirrored creature
  const half = Math.ceil(size / 2);
  for (let y = 6; y < size - 5; y++) {
    for (let x = 6; x < half; x++) {
      const distY = Math.abs(y - size / 2) / (size / 2);
      const p = 0.75 - distY * 0.6 - (half - x) * 0.025;
      if (r() < p) {
        const c = 1 + Math.floor(r() * 3);
        grid[y][x] = c;
        grid[y][size - 1 - x] = c;
      }
    }
  }
  // outline
  const out = grid.map((row) => row.slice());
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++)
      if (grid[y][x] === -1 && [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]].some((v) => v >= 1))
        out[y][x] = 0;
  // eyes
  const ey = Math.floor(size * 0.42);
  out[ey][half - 4] = 4;
  out[ey][size - half + 3] = 4;
  const buf = Buffer.alloc(size * size * 3);
  const bg = hex(pal[4]);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = out[y][x];
      const col = v === -1 ? bg : v === 4 ? [255, 255, 255] : hex(pal[v]);
      buf.set(col, (y * size + x) * 3);
    }
  await sharp(buf, { raw: { width: size, height: size, channels: 3 } })
    .resize(size * scale, size * scale, { kernel: 'nearest' })
    .composite([{ input: Buffer.from(svgWrap(size * scale, size * scale, stamp(size * scale, size * scale), true)) }])
    .png()
    .toFile(file);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const svgWrap = (w, h, body, transparent = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${transparent ? '' : ''}${body}</svg>`;

async function render(file, w, h, body) {
  await sharp(Buffer.from(svgWrap(w, h, body + stamp(w, h)))).png({ compressionLevel: 9 }).toFile(file);
}

// ---------- the sample catalogue ----------
const artworks = [
  { slug: 'sample-lantern-valley', title: 'Lantern Valley', cats: ['illustration', 'background'], gen: 'land', pal: 'dusk', w: 1600, h: 2000, featured: true, software: ['Procreate'], tags: ['landscape', 'warm light'] },
  { slug: 'sample-moss-wanderer', title: 'Moss Wanderer', cats: ['character'], gen: 'char', pal: 'forest', w: 1500, h: 2000, featured: true, software: ['Clip Studio Paint'], tags: ['character design', 'fantasy'] },
  { slug: 'sample-tidepool-town', title: 'Tidepool Town', cats: ['environment'], gen: 'env', pal: 'ocean', w: 2000, h: 1500, featured: true, software: ['Photoshop'], tags: ['isometric', 'game art'] },
  { slug: 'sample-ember-sprite', title: 'Ember Sprite', cats: ['pixel-art', 'character'], gen: 'pixel', pal: 'ember', w: 768, h: 768, software: ['Aseprite'], tags: ['sprite', '32x32'] },
  { slug: 'sample-frost-ridge', title: 'Frost Ridge', cats: ['background'], gen: 'land', pal: 'snow', w: 2400, h: 1350, software: ['Photoshop'], tags: ['winter', 'parallax'] },
  { slug: 'sample-inventory-set', title: 'Inventory Icon Set', cats: ['icon'], gen: 'icon', pal: 'candy', w: 1500, h: 1500, software: ['Illustrator'], tags: ['UI', 'game icons'] },
  { slug: 'sample-glass-orbs', title: 'Glass Orbs Study', cats: ['3d'], gen: '3d', pal: 'ocean', w: 1600, h: 1600, software: ['Blender'], tags: ['lighting', 'materials'] },
  { slug: 'sample-sketchbook-noise', title: 'Sketchbook Noise', cats: ['misc'], gen: 'misc', pal: 'candy', w: 1600, h: 2000, software: ['Procreate'], tags: ['experiment'] },
  { slug: 'sample-candy-courier', title: 'Candy Courier', cats: ['character', 'illustration'], gen: 'char', pal: 'candy', w: 1500, h: 1900, featured: true, software: ['Procreate'], tags: ['mascot'] },
  { slug: 'sample-moss-sprite', title: 'Moss Sprite', cats: ['pixel-art'], gen: 'pixel', pal: 'moss', w: 768, h: 768, software: ['Aseprite'], tags: ['sprite'] },
  { slug: 'sample-ember-forge', title: 'Ember Forge', cats: ['environment', 'illustration'], gen: 'env', pal: 'ember', w: 2000, h: 1500, software: ['Photoshop'], tags: ['interior'] },
  { slug: 'sample-weapon-icons', title: 'Weapon Icon Pack', cats: ['icon'], gen: 'icon', pal: 'ember', w: 1500, h: 1500, software: ['Illustrator'], tags: ['RPG'] },
  { slug: 'sample-clay-friends', title: 'Clay Friends', cats: ['3d'], gen: '3d', pal: 'candy', w: 2000, h: 1500, software: ['Blender'], tags: ['stylised'] },
  { slug: 'sample-forest-edge', title: 'Forest Edge', cats: ['background', 'environment'], gen: 'land', pal: 'forest', w: 2400, h: 1350, software: ['Photoshop'], tags: ['forest'] },
  { slug: 'sample-ocean-keeper', title: 'Ocean Keeper', cats: ['character'], gen: 'char', pal: 'ocean', w: 1500, h: 2000, software: ['Clip Studio Paint'], tags: ['turnaround'] },
  { slug: 'sample-pattern-play', title: 'Pattern Play', cats: ['misc', 'illustration'], gen: 'misc', pal: 'moss', w: 1800, h: 1800, software: ['Procreate'], tags: ['pattern'], published: false },
];

const services = [
  { slug: 'digital-illustration', title: 'Digital Illustration', icon: 'brush', description: 'Full-colour illustrations for book covers, key art, posters and personal projects.', mode: 'from', amount: '$120', delivery: '1–2 weeks', details: ['Up to 2 revision rounds', 'High-resolution files', 'Personal or commercial licence'] },
  { slug: 'character-design', title: 'Character Design', icon: 'character', description: 'Original characters with expression sheets, colour palettes and turnarounds ready for production.', mode: 'from', amount: '$90', delivery: '1–2 weeks', details: ['Front / side / back views', 'Expression sheet add-on'] },
  { slug: 'environment-background', title: 'Backgrounds & Environments', icon: 'mountain', description: 'Painted backgrounds and environment concepts for games, animation and visual novels.', mode: 'request', delivery: '2–3 weeks', details: ['Parallax-ready layers on request'] },
  { slug: 'pixel-art', title: 'Pixel Art', icon: 'pixel', description: 'Sprites, tilesets and animated pixel scenes in a consistent palette.', mode: 'from', amount: '$40', delivery: '3–10 days', details: ['Sprite sheets', 'Animation frames'] },
  { slug: 'icon-design', title: 'Icon Design', icon: 'grid', description: 'Cohesive icon sets for games, apps and UI.', mode: 'request', delivery: 'Depends on set size', details: [] },
  { slug: 'custom-artwork', title: 'Custom Artwork', icon: 'sparkle', description: 'Something else in mind? Tell me about it and we will figure out the best approach together.', mode: 'request', delivery: '', details: [] },
];

const testimonials = [
  { slug: 'sample-client-one', name: 'Sample Client', role: 'Indie Game Studio (placeholder)', quote: 'This is placeholder testimonial text. Replace it with real feedback from a client or employer through the CMS.', project: 'Sample project' },
  { slug: 'sample-client-two', name: 'Another Sample', role: 'Art Director (placeholder)', quote: 'A second placeholder quote, shown so the layout can be reviewed. Delete or edit this entry in the CMS.', project: '' },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(rel, data) {
  const p = join(root, rel);
  if (!force && (await exists(p))) return;
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  for (const d of ['media/artwork', 'media/profile', 'media/services', 'media/testimonials', 'media/files', 'content/artworks', 'content/services', 'content/testimonials'])
    await mkdir(join(root, d), { recursive: true });

  let seed = 7;
  let order = 10;
  for (const a of artworks) {
    seed += 13;
    const file = join(root, 'media/artwork', `${a.slug}.png`);
    const pal = palettes[a.pal];
    if (a.gen === 'pixel') await pixelSprite(file, pal, seed);
    else {
      const body =
        a.gen === 'land' ? landscape(a.w, a.h, pal, seed)
        : a.gen === 'char' ? character(a.w, a.h, pal, seed)
        : a.gen === 'env' ? environment(a.w, a.h, pal, seed)
        : a.gen === 'icon' ? icons(a.w, a.h, pal, seed)
        : a.gen === '3d' ? threeD(a.w, a.h, pal, seed)
        : misc(a.w, a.h, pal, seed);
      await render(file, a.w, a.h, body);
    }
    const process = [];
    if (a.featured) {
      const pf = join(root, 'media/artwork', `${a.slug}-process.png`);
      await render(pf, 1200, 900, misc(1200, 900, pal, seed + 1));
      process.push(`/media/artwork/${a.slug}-process.png`);
    }
    await writeJson(`content/artworks/${a.slug}.json`, {
      title: `${a.title} (Sample)`,
      image: `/media/artwork/${a.slug}.png`,
      alt: `Placeholder sample artwork: ${a.title.toLowerCase()}, a procedurally generated ${a.cats[0].replace('-', ' ')} piece`,
      description: 'Placeholder description. This sample piece was generated for layout testing — replace it with your own artwork and a few sentences about the idea, process or client.',
      categories: a.cats,
      tags: a.tags,
      date: `2026-${String(1 + (order % 11)).padStart(2, '0')}-15`,
      software: a.software,
      process_images: process,
      featured: !!a.featured,
      published: a.published !== false,
      order,
    });
    order += 10;
  }

  // Profile picture: simple abstract avatar
  await render(join(root, 'media/profile/avatar.png'), 800, 800, character(800, 800, palettes.dusk, 99));

  order = 10;
  for (const s of services) {
    await writeJson(`content/services/${s.slug}.json`, {
      title: s.title,
      description: s.description,
      icon: s.icon,
      image: '',
      pricing_mode: s.mode,
      starting_price: s.amount ?? '',
      pricing_note: s.mode === 'request' ? 'Every project is different — send me the details for a quote.' : 'Final price depends on complexity and usage rights.',
      delivery_time: s.delivery,
      details: s.details,
      cta_label: 'Request a quote',
      active: true,
      order,
    });
    order += 10;
  }

  order = 10;
  for (const t of testimonials) {
    await writeJson(`content/testimonials/${t.slug}.json`, {
      name: t.name,
      role: t.role,
      quote: t.quote,
      avatar: '',
      project: t.project,
      published: true,
      order,
    });
    order += 10;
  }

  await writeFile(join(root, 'media/files/sample-resume.pdf'), minimalPdf('SAMPLE RESUME - placeholder file. Replace via the CMS (Profile > Resume).'));
  console.log('Placeholders generated.');
}

/** Builds a tiny valid single-page PDF containing one line of text. */
function minimalPdf(text) {
  const esc = text.replace(/[()\\]/g, (m) => '\\' + m);
  const stream = `BT /F1 18 Tf 60 760 Td (${esc}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
