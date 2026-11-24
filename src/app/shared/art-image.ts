import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ResponsiveImage } from '../core/content.models';

/**
 * Responsive, lazy-loaded image with its intrinsic aspect ratio reserved
 * (no layout shift) and the dominant colour shown while it loads.
 */
@Component({
  selector: 'app-art-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.aspect-ratio]': 'ratio()',
    '[style.background-color]': 'loaded() ? null : image().color',
    '[class.pixelated]': 'image().pixelated',
    '[class.loaded]': 'loaded()',
  },
  template: `<img
    [src]="useThumb() && image().thumb ? image().thumb : image().src"
    [attr.srcset]="image().srcset || null"
    [attr.sizes]="image().srcset ? sizes() : null"
    [attr.width]="image().width || null"
    [attr.height]="image().height || null"
    [alt]="alt()"
    [attr.loading]="eager() ? 'eager' : 'lazy'"
    [attr.fetchpriority]="eager() ? 'high' : null"
    decoding="async"
    (load)="loaded.set(true)"
  />`,
  styles: `
    :host { display: block; overflow: hidden; position: relative; }
    img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .5s ease; }
    :host(.loaded) img { opacity: 1; }
    :host(.pixelated) img { image-rendering: pixelated; }
    :host(.contain) img { object-fit: contain; }
  `,
})
export class ArtImage {
  readonly image = input.required<ResponsiveImage>();
  readonly alt = input('');
  readonly sizes = input('100vw');
  readonly eager = input(false);
  /** Force an aspect ratio (e.g. "1"), otherwise the image's own is used. */
  readonly aspect = input<string | null>(null);
  readonly useThumb = input(false);

  protected readonly loaded = signal(false);
  protected readonly ratio = computed(() => {
    const forced = this.aspect();
    if (forced) return forced;
    const { width, height } = this.image();
    return width && height ? `${width} / ${height}` : null;
  });
}
