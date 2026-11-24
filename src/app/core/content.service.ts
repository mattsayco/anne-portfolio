import { Injectable, computed, signal } from '@angular/core';
import generated from './generated/content.json';
import { Artwork, SiteContent } from './content.models';

/**
 * Read-only access to the site content.
 *
 * Content is compiled into the bundle at build time (see scripts/build-content.mjs),
 * so it is available synchronously during prerendering and needs no runtime fetch.
 * Every CMS edit triggers a rebuild via GitHub Actions.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly data = signal(generated as unknown as SiteContent).asReadonly();

  readonly site = computed(() => this.data().site);
  readonly hero = computed(() => this.data().hero);
  readonly profile = computed(() => this.data().profile);
  readonly contact = computed(() => this.data().contact);
  readonly artworks = computed(() => this.data().artworks);
  readonly services = computed(() => this.data().services);
  readonly testimonials = computed(() => this.data().testimonials);

  /** Only categories that currently contain published artwork. */
  readonly categories = computed(() => this.data().categories.filter((c) => c.count > 0));

  readonly featured = computed(() => this.artworks().filter((a) => a.featured));

  private readonly categoryLabels = computed(
    () => new Map(this.data().categories.map((c) => [c.value, c.label] as const)),
  );

  categoryLabel(value: string): string {
    return this.categoryLabels().get(value) ?? value;
  }

  findArtwork(slug: string | null | undefined): Artwork | undefined {
    return slug ? this.artworks().find((a) => a.slug === slug) : undefined;
  }
}
