import { ChangeDetectionStrategy, Component, DOCUMENT, afterNextRender, effect, inject } from '@angular/core';
import { AnalyticsService } from './core/analytics.service';
import { GalleryStateService } from './core/gallery-state.service';
import { SeoService } from './core/seo.service';
import { Footer } from './layout/footer';
import { Header } from './layout/header';
import { About } from './sections/about';
import { Contact } from './sections/contact';
import { Hero } from './sections/hero';
import { ArtworkLightbox } from './sections/portfolio/artwork-lightbox';
import { Portfolio } from './sections/portfolio/portfolio';
import { Services } from './sections/services';
import { Testimonials } from './sections/testimonials';

/**
 * Single-page shell. All state (gallery filter, open artwork) lives in query
 * params, so there is only one route and it is prerendered to index.html.
 */
@Component({
  selector: 'app-root',
  imports: [Header, Hero, Portfolio, About, Services, Testimonials, Contact, Footer, ArtworkLightbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly doc = inject(DOCUMENT);
  private readonly seo = inject(SeoService);
  private readonly gallery = inject(GalleryStateService);
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    this.seo.applyDefaults();

    // Swap in per-artwork title / share metadata while the viewer is open.
    effect(() => this.seo.applyArtwork(this.gallery.active()));

    afterNextRender(() => this.analytics.init());
  }

  /**
   * In-page "#section" links. A bare "#contact" resolves against <base href>
   * (e.g. "/#contact"), which would drop ?category=… and reload the page. Scroll instead
   * and keep the current query string.
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
    const id = link?.getAttribute('href')?.slice(1);
    if (!id) return;
    const target = this.doc.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = id === 'home' ? '' : id;
    history.replaceState(history.state, '', url);
    target.scrollIntoView({ block: 'start' });
    // Move focus for keyboard and screen-reader users without a second scroll.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
