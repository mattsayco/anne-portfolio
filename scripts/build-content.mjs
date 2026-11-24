/**
 * Content build step — runs before every `ng build` / `ng serve`.
 *
 *  1. Reads the CMS-managed JSON in /content (written by Pages CMS commits).
 *  2. Validates entries; invalid ones are skipped with a warning instead of
 *     breaking the whole site.
 *  3. Drops drafts (published: false / active: false) so they never ship.
 *  4. Generates responsive WebP variants for every *referenced* image into
 *     public/_img (only published images are deployed — drafts stay private
 *     on the site, though they remain visible in a public repository).
 *  5. Copies referenced documents (resume) into public/_files.
 *  6. Writes src/app/core/generated/content.json (bundled into the app) plus
 *     public/sitemap.xml and public/robots.txt.
 *
 * Categories come from the artwork "categories" select in .pages.yml, so that
 * file is the single source of truth for the gallery filters.
 */
import sharp from 'sharp';
import { load as parseYaml } from 'js-yaml';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, copyFile, access, rm } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as simpleIcons from 'simple-icons';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT_IMG = join(root, 'public/_img');
const OUT_FILES = join(root, 'public/_files');
const OUT_JSON = join(root, 'src/app/core/generated/content.json');
const WIDTHS = [480, 800, 1200, 1800, 2400];
const isCI = !!process.env.GITHUB_ACTIONS;
const warnings = [];

function warn(msg) {
  warnings.push(msg);
  console.warn(isCI ? `::warning::${msg}` : `⚠  ${msg}`);
}

const exists = (p) => access(p).then(() => true, () => false);

async function readJson(rel) {
  const text = await readFile(join(root, rel), 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Could not read ${rel}: ${e.message}`);
  }
}

async function readCollection(dir) {
  const full = join(root, dir);
  if (!(await exists(full))) return [];
  const files = (await readdir(full)).filter((f) => f.endsWith('.json')).sort();
  const items = [];
  for (const f of files) {
    try {
      items.push({ file: `${dir}/${f}`, slug: slugify(basename(f, '.json')), data: await readJson(`${dir}/${f}`) });
    } catch (e) {
      warn(`${e.message} — entry skipped.`);
    }
  }
  return items;
}

// ---------------------------------------------------------------- helpers
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x.trim() : x)).filter(Boolean) : []);
const num = (v, d = 100) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
const byOrder = (a, b) => a.order - b.order || (b.date ?? '').localeCompare(a.date ?? '') || a.title?.localeCompare?.(b.title ?? '') || 0;

/** "https://x" / "mailto:" / "#section" / "/path" are allowed; anything else (e.g. javascript:) is dropped. */
function safeLink(v) {
  const s = str(v);
  if (!s) return '';
  if (/^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`; // "artstation.com/me"
  warn(`Ignored unsafe or invalid link "${s}".`);
  return '';
}

/** Map a CMS media path ("/media/artwork/x.png") to a file on disk. */
function mediaPath(p) {
  const s = str(p);
  if (!s) return null;
  if (/^https?:\/\//.test(s)) return { remote: s };
  const rel = decodeURIComponent(s.replace(/^\/+/, ''));
  if (rel.includes('..')) return null;
  return { local: join(root, rel), rel };
}

// ---------------------------------------------------------------- images
const imageCache = new Map();
const producedImages = new Set();

/**
 * Returns { src, srcset, width, height, color, pixelated } for a media path,
 * generating WebP variants on first use. Variants are content-hashed so
 * browsers can cache them forever.
 */
async function processImage(p, { pixelated = false, context = '' } = {}) {
  const ref = mediaPath(p);
  if (!ref) return null;
  if (ref.remote) return { src: ref.remote, srcset: '', width: 0, height: 0, color: '#ddd', pixelated };
  const key = ref.local + (pixelated ? ':px' : '');
  if (imageCache.has(key)) return imageCache.get(key);
  if (!(await exists(ref.local))) {
    warn(`Image not found: ${p}${context ? ` (used by ${context})` : ''}.`);
    return null;
  }
  const input = await readFile(ref.local);
  const hash = createHash('sha1').update(input).digest('hex').slice(0, 10);
  const name = slugify(basename(ref.rel, extname(ref.rel))).slice(0, 50);
  const img = sharp(input, { failOn: 'none' });
  const meta = await img.metadata();
  const isAnimated = (meta.pages ?? 1) > 1;
  const isSvg = meta.format === 'svg';
  let width = meta.width ?? 0;
  let height = meta.height ?? 0;
  if ((meta.orientation ?? 1) >= 5) [width, height] = [height, width];

  const result = { src: '', srcset: '', width, height, color: '#e8e6e1', pixelated };

  if (isAnimated || isSvg) {
    // Keep GIF/SVG untouched so animation / vectors survive.
    const out = `${name}-${hash}${extname(ref.rel).toLowerCase()}`;
    await copyFile(ref.local, join(OUT_IMG, out));
    producedImages.add(out);
    result.src = `_img/${out}`;
  } else {
    const stats = await sharp(input).stats().catch(() => null);
    if (stats?.dominant) {
      const { r, g, b } = stats.dominant;
      result.color = `rgb(${r} ${g} ${b})`;
    }
    // Pixel art: upscale small sprites with nearest-neighbour so they stay crisp.
    const targets = pixelated
      ? [...new Set([Math.max(width, 960), Math.max(width, 1920)])]
      : WIDTHS.filter((w) => w < width).concat(width > 2400 ? [] : [width]);
    const variants = [];
    for (const w of [...new Set(targets)].sort((a, b) => a - b)) {
      const out = `${name}-${hash}-${w}.webp`;
      const dest = join(OUT_IMG, out);
      if (!(await exists(dest))) {
        await sharp(input, { failOn: 'none' })
          .rotate()
          .resize({ width: w, kernel: pixelated ? 'nearest' : 'lanczos3', withoutEnlargement: !pixelated })
          .webp(pixelated ? { lossless: true } : { quality: w <= 800 ? 78 : 84, effort: 5 })
          .toFile(dest);
      }
      producedImages.add(out);
      variants.push({ w, url: `_img/${out}` });
    }
    result.srcset = variants.map((v) => `${v.url} ${v.w}w`).join(', ');
    result.src = variants[variants.length - 1].url;
    result.thumb = (variants.find((v) => v.w >= 800) ?? variants[variants.length - 1]).url;
  }
  imageCache.set(key, result);
  return result;
}

async function processFile(p, context) {
  const ref = mediaPath(p);
  if (!ref) return null;
  if (ref.remote) return ref.remote;
  if (!(await exists(ref.local))) {
    warn(`File not found: ${p} (used by ${context}).`);
    return null;
  }
  const out = basename(ref.rel).replace(/[^\w.-]+/g, '-');
  await copyFile(ref.local, join(OUT_FILES, out));
  return `_files/${out}`;
}

// ---------------------------------------------------------------- icons
const BRAND_ICON = {
  artstation: 'siArtstation', behance: 'siBehance', instagram: 'siInstagram', x: 'siX', bluesky: 'siBluesky',
  pinterest: 'siPinterest', deviantart: 'siDeviantart', dribbble: 'siDribbble', youtube: 'siYoutube',
  tiktok: 'siTiktok', threads: 'siThreads', tumblr: 'siTumblr', kofi: 'siKofi', patreon: 'siPatreon',
  itchio: 'siItchdotio', github: 'siGithub',
};
const PLATFORM_LABEL = {
  artstation: 'ArtStation', behance: 'Behance', instagram: 'Instagram', x: 'X', bluesky: 'Bluesky',
  pinterest: 'Pinterest', linkedin: 'LinkedIn', deviantart: 'DeviantArt', dribbble: 'Dribbble', youtube: 'YouTube',
  tiktok: 'TikTok', threads: 'Threads', tumblr: 'Tumblr', kofi: 'Ko-fi', patreon: 'Patreon', itchio: 'itch.io',
  github: 'GitHub', website: 'Website',
};
// LinkedIn is not in simple-icons; a simple hand-drawn "in" mark (24×24 viewBox).
const LINKEDIN_PATH = 'M3 3h18v18H3zM7 10v7h2.2v-7zm1.1-3.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM11 10v7h2.2v-3.7c0-1 .4-1.6 1.3-1.6.8 0 1.1.6 1.1 1.6V17H18v-4.3c0-2-1-2.9-2.5-2.9-1 0-1.7.5-2.1 1.1V10z';
function iconPath(platform) {
  if (platform === 'linkedin') return { path: LINKEDIN_PATH, evenOdd: true };
  const icon = simpleIcons[BRAND_ICON[platform]];
  return icon ? { path: icon.path, evenOdd: false } : null;
}

// ---------------------------------------------------------------- main
async function main() {
  // public/_img is kept between runs as a cache; unused files are pruned at the end.
  await mkdir(OUT_IMG, { recursive: true });
  await rm(OUT_FILES, { recursive: true, force: true }).catch(() => {});
  await mkdir(OUT_FILES, { recursive: true });
  await mkdir(dirname(OUT_JSON), { recursive: true });

  // Categories from .pages.yml
  const cms = parseYaml(await readFile(join(root, '.pages.yml'), 'utf8'));
  const artCfg = cms.content.find((c) => c.name === 'artworks');
  const catValues = artCfg.fields.find((f) => f.name === 'categories').options.values;
  const categories = catValues.map((v) => (typeof v === 'string' ? { value: slugify(v), label: v } : { value: String(v.value), label: v.label ?? String(v.value) }));
  const catSet = new Set(categories.map((c) => c.value));

  const site = await readJson('content/site.json');
  const hero = await readJson('content/hero.json');
  const profile = await readJson('content/profile.json');
  const contact = await readJson('content/contact.json');

  // ----- artworks
  const artworks = [];
  const usedSlugs = new Set();
  for (const { file, slug: fileSlug, data } of await readCollection('content/artworks')) {
    if (bool(data.published, true) === false) continue;
    const title = str(data.title);
    if (!title) { warn(`${file}: missing title — skipped.`); continue; }
    const cats = list(data.categories).map(String).filter((c) => catSet.has(c));
    if (!cats.length) { warn(`${file}: no valid category — shown under "Misc".`); cats.push(catSet.has('misc') ? 'misc' : categories[0].value); }
    const pixelated = cats.includes('pixel-art');
    const image = await processImage(data.image, { pixelated, context: file });
    if (!image) { warn(`${file}: artwork image missing — skipped.`); continue; }
    const processImages = [];
    for (const p of list(data.process_images)) {
      const im = await processImage(p, { pixelated, context: file });
      if (im) processImages.push(im);
    }
    let slug = fileSlug;
    while (usedSlugs.has(slug)) slug += '-2';
    usedSlugs.add(slug);
    artworks.push({
      slug,
      title,
      alt: str(data.alt) || title,
      description: str(data.description),
      categories: cats,
      tags: list(data.tags).map(String),
      date: str(data.date) || null,
      software: list(data.software).map(String),
      featured: bool(data.featured, false),
      order: num(data.order),
      image,
      process: processImages,
    });
  }
  artworks.sort(byOrder);

  // ----- services
  const services = [];
  for (const { file, slug, data } of await readCollection('content/services')) {
    if (bool(data.active, true) === false) continue;
    if (!str(data.title)) { warn(`${file}: missing title — skipped.`); continue; }
    const mode = ['fixed', 'from', 'request', 'hidden'].includes(data.pricing_mode) ? data.pricing_mode : 'request';
    services.push({
      slug,
      title: str(data.title),
      description: str(data.description),
      icon: str(data.icon) || 'sparkle',
      image: await processImage(data.image, { context: file }),
      pricingMode: mode,
      price: str(data.starting_price),
      pricingNote: str(data.pricing_note),
      delivery: str(data.delivery_time),
      details: list(data.details).map(String),
      ctaLabel: str(data.cta_label) || 'Request a quote',
      order: num(data.order),
    });
  }
  services.sort(byOrder);

  // ----- testimonials
  const testimonials = [];
  for (const { file, slug, data } of await readCollection('content/testimonials')) {
    if (bool(data.published, true) === false) continue;
    if (!str(data.name) || !str(data.quote)) { warn(`${file}: needs a name and a quote — skipped.`); continue; }
    testimonials.push({
      slug,
      name: str(data.name),
      role: str(data.role),
      quote: str(data.quote),
      project: str(data.project),
      avatar: await processImage(data.avatar, { context: file }),
      order: num(data.order),
    });
  }
  testimonials.sort(byOrder);

  // ----- social links
  const socials = [];
  for (const s of Array.isArray(contact.social_links) ? contact.social_links : []) {
    const url = safeLink(s?.url);
    if (!url) continue;
    const platform = str(s.platform) || 'website';
    socials.push({ platform, url, label: str(s.label) || PLATFORM_LABEL[platform] || 'Website', icon: iconPath(platform) });
  }

  const status = ['open', 'limited', 'closed'].includes(contact.commission_status) ? contact.commission_status : 'open';

  const content = {
    generatedAt: new Date().toISOString(),
    site: {
      url: str(site.site_url).replace(/\/+$/, ''),
      title: str(site.site_title) || str(profile.name),
      description: str(site.meta_description),
      shareImage: (await processImage(site.share_image, { context: 'site settings' }))?.src ?? null,
      language: str(site.language) || 'en',
      headings: {
        portfolio: str(site.portfolio_heading) || 'Portfolio',
        portfolioIntro: str(site.portfolio_intro),
        services: str(site.services_heading) || 'Services',
        servicesIntro: str(site.services_intro),
        testimonials: str(site.testimonials_heading) || 'Testimonials',
        contact: str(site.contact_heading) || 'Contact',
        contactIntro: str(site.contact_intro),
      },
      showTestimonials: bool(site.show_testimonials, true),
      goatcounter: str(site.goatcounter_code).replace(/[^a-z0-9-]/gi, ''),
      footerNote: str(site.footer_note),
      hasSampleContent: false, // set below
    },
    hero: {
      eyebrow: str(hero.eyebrow),
      headline: str(hero.headline) || str(profile.name),
      intro: str(hero.intro),
      image: await processImage(hero.image, { context: 'hero' }),
      showFeatured: bool(hero.show_featured, true),
      buttons: (Array.isArray(hero.buttons) ? hero.buttons : [])
        .map((b) => ({ label: str(b?.label), link: safeLink(b?.link), style: b?.style === 'secondary' ? 'secondary' : 'primary' }))
        .filter((b) => b.label && b.link)
        .slice(0, 3),
    },
    profile: {
      name: str(profile.name),
      title: str(profile.title),
      avatar: await processImage(profile.avatar, { context: 'profile' }),
      avatarAlt: str(profile.avatar_alt) || `Portrait of ${str(profile.name)}`,
      bio: str(profile.bio),
      background: str(profile.background),
      experience: (Array.isArray(profile.experience) ? profile.experience : [])
        .map((e) => ({ role: str(e?.role), organization: str(e?.organization), period: str(e?.period), description: str(e?.description) }))
        .filter((e) => e.role),
      skills: list(profile.skills).map(String),
      tools: list(profile.tools).map(String),
      interests: list(profile.interests).map(String),
      achievements: list(profile.achievements).map(String),
      resume: await processFile(profile.resume, 'profile resume'),
      resumeLabel: str(profile.resume_label) || 'Download resume',
      links: (Array.isArray(profile.links) ? profile.links : [])
        .map((l) => ({ label: str(l?.label), url: safeLink(l?.url) }))
        .filter((l) => l.label && l.url),
    },
    contact: {
      email: str(contact.email),
      location: str(contact.location),
      commissionStatus: status,
      commissionNote: str(contact.commission_note),
      commissionLink: safeLink(contact.commission_link) || '#contact',
      responseTime: str(contact.response_time),
      socials,
      form: {
        enabled: bool(contact.form_enabled, true),
        accessKey: str(contact.form_access_key),
        successMessage: str(contact.form_success_message) || "Thanks! I'll get back to you soon.",
      },
    },
    categories: categories.map((c) => ({ ...c, count: artworks.filter((a) => a.categories.includes(c.value)).length })),
    artworks,
    services,
    testimonials,
  };

  content.site.hasSampleContent = [...imageCache.keys()].some((k) => /[\\/]sample-[^\\/]*$/.test(k.replace(/:px$/, '')));

  if (!content.site.url || content.site.url.includes('username.github.io')) warn('Site settings: "Website address" is still the placeholder — update it so share previews and the sitemap use the real address.');
  if (content.contact.form.enabled && !content.contact.form.accessKey) warn('Contact form has no Web3Forms access key — visitors will be shown your email address instead of the form.');

  for (const f of await readdir(OUT_IMG)) if (!producedImages.has(f)) await rm(join(OUT_IMG, f));

  await writeFile(OUT_JSON, JSON.stringify(content, null, 2) + '\n');

  // ----- sitemap + robots
  const base = content.site.url || '';
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [`${base}/`, ...artworks.map((a) => `${base}/?art=${encodeURIComponent(a.slug)}`)];
  await writeFile(
    join(root, 'public/sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc><lastmod>${lastmod}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  await writeFile(join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);

  console.log(
    `✔ Content built: ${artworks.length} artworks, ${services.length} services, ${testimonials.length} testimonials, ${imageCache.size} images` +
      (warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''),
  );
}

main().catch((e) => {
  console.error(isCI ? `::error::${e.message}` : e);
  process.exit(1);
});
