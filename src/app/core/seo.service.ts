import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ContentService } from './content.service';
import { Artwork } from './content.models';

/**
 * Title, description, Open Graph / Twitter cards, canonical URL and JSON-LD.
 * Runs during prerendering, so crawlers and link previews get real metadata.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly content = inject(ContentService);

  private abs(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return this.content.site().url + (path.startsWith('/') ? path : `/${path}`);
  }

  applyDefaults(): void {
    const site = this.content.site();
    const profile = this.content.profile();
    this.doc.documentElement.lang = site.language || 'en';
    this.set(site.title, site.description, site.shareImage, `${site.url}/`);
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: profile.name });
    this.meta.updateTag({ name: 'author', content: profile.name });
    this.setJsonLd();
  }

  /** Per-artwork metadata while the viewer is open (shareable ?art= links). */
  applyArtwork(art: Artwork | undefined): void {
    if (!art) {
      this.applyDefaults();
      return;
    }
    const site = this.content.site();
    const name = this.content.profile().name;
    const desc = art.description ? art.description.slice(0, 160) : `${art.title} by ${name}.`;
    this.set(`${art.title} — ${name}`, desc, art.image.thumb ?? art.image.src, `${site.url}/?art=${encodeURIComponent(art.slug)}`);
  }

  private set(title: string, description: string, image: string | null, url: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: this.abs(image) });
      this.meta.updateTag({ name: 'twitter:image', content: this.abs(image) });
    }
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private setJsonLd(): void {
    const profile = this.content.profile();
    const contact = this.content.contact();
    const site = this.content.site();
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle: profile.title,
      url: `${site.url}/`,
      image: profile.avatar ? this.abs(profile.avatar.src) : undefined,
      email: contact.email ? `mailto:${contact.email}` : undefined,
      knowsAbout: profile.skills,
      sameAs: contact.socials.map((s) => s.url),
    };
    let script = this.doc.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!script) {
      script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      this.doc.head.appendChild(script);
    }
    // Escape "<" so CMS text can never close the script tag.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
