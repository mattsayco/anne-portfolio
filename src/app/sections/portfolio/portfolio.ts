import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { GalleryStateService } from '../../core/gallery-state.service';
import { AnalyticsService } from '../../core/analytics.service';
import { Artwork } from '../../core/content.models';
import { Reveal } from '../../shared/reveal.directive';
import { PortfolioFilter } from './portfolio-filter';
import { ArtworkCard } from './artwork-card';

/** Breakpoints → column count. 3 is the prerender default. */
const COLUMN_QUERIES: [string, number][] = [
  ['(max-width: 559px)', 1],
  ['(max-width: 959px)', 2],
];

@Component({
  selector: 'app-portfolio',
  imports: [PortfolioFilter, ArtworkCard, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="portfolio" class="section" aria-labelledby="portfolio-title">
      <div class="container">
        <header class="head" appReveal>
          <div class="section-head">
            <p class="eyebrow">Portfolio</p>
            <h2 id="portfolio-title" class="section-title">{{ site().headings.portfolio }}</h2>
            @if (site().headings.portfolioIntro) {
              <p class="lead">{{ site().headings.portfolioIntro }}</p>
            }
          </div>
        </header>

        <div class="toolbar">
          <app-portfolio-filter [categories]="categories()" [total]="total()" [selected]="gallery.category()"
                                (changed)="select($event)" />
        </div>

        <p class="visually-hidden" aria-live="polite">{{ liveMessage() }}</p>

        @if (items().length) {
          <div class="masonry" [style.--cols]="columns()">
            @for (col of masonry(); track $index) {
              <div class="col">
                @for (art of col; track art.slug) {
                  <app-artwork-card [art]="art" (opened)="open($event)" [style.--i]="($index % 6) * 60 + 'ms'" />
                }
              </div>
            }
          </div>
        } @else {
          <p class="empty">No artwork here yet — check back soon.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: end; gap: 24px; }
    .toolbar { position: sticky; top: var(--header-h); z-index: 10; padding: 12px 0 8px; margin-bottom: 20px;
      background: linear-gradient(var(--paper) 78%, transparent); }
    .masonry { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: clamp(14px, 2vw, 28px); align-items: start; }
    .col { display: grid; gap: clamp(14px, 2vw, 28px); }
    .empty { padding: 64px 0; text-align: center; color: var(--ink-3); }
    @media (max-width: 559px) { .toolbar { margin-inline: calc(var(--gutter) * -1); padding-inline: var(--gutter); } }
  `,
})
export class Portfolio {
  private readonly content = inject(ContentService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly gallery = inject(GalleryStateService);
  protected readonly site = this.content.site;
  protected readonly categories = this.content.categories;
  protected readonly total = computed(() => this.content.artworks().length);
  protected readonly items = this.gallery.filtered;
  protected readonly columns = signal(3);

  protected readonly liveMessage = computed(() => {
    const n = this.items().length;
    const c = this.gallery.category();
    return `Showing ${n} ${n === 1 ? 'piece' : 'pieces'}${c === 'all' ? '' : ` in ${this.content.categoryLabel(c)}`}.`;
  });

  /**
   * Distributes artwork into columns, always adding to the currently shortest
   * column (heights estimated from known aspect ratios). Keeps reading order
   * roughly left-to-right, unlike CSS columns which fill top-to-bottom.
   */
  protected readonly masonry = computed(() => {
    const n = this.columns();
    const cols: Artwork[][] = Array.from({ length: n }, () => []);
    const heights = new Array(n).fill(0);
    for (const art of this.items()) {
      const ratio = art.image.width && art.image.height ? art.image.height / art.image.width : 1;
      const i = heights.indexOf(Math.min(...heights));
      cols[i].push(art);
      heights[i] += ratio + 0.12; // + caption/gap allowance
    }
    return cols;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const mqls = COLUMN_QUERIES.map(([q, n]) => [matchMedia(q), n] as const);
      const update = () => this.columns.set(mqls.find(([m]) => m.matches)?.[1] ?? 3);
      update();
      mqls.forEach(([m]) => m.addEventListener('change', update));
      destroyRef.onDestroy(() => mqls.forEach(([m]) => m.removeEventListener('change', update)));
    });
  }

  protected select(category: string): void {
    this.gallery.setCategory(category);
    this.analytics.event(`category/${category}`);
  }

  protected open(slug: string): void {
    this.gallery.open(slug);
    this.analytics.event(`artwork/${slug}`);
  }
}
