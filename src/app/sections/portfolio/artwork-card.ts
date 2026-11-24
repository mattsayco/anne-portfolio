import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Artwork } from '../../core/content.models';
import { ContentService } from '../../core/content.service';
import { ArtImage } from '../../shared/art-image';

@Component({
  selector: 'app-artwork-card',
  imports: [ArtImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card" [href]="'?art=' + art().slug" (click)="onClick($event)">
      <div class="frame">
        <app-art-image [image]="art().image" [alt]="art().alt" [useThumb]="true"
                       sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 33vw" />
        <span class="veil" aria-hidden="true"></span>
      </div>
      <span class="meta">
        <span class="title">{{ art().title }}</span>
        <span class="cats">{{ categoryLabels() }}</span>
      </span>
    </a>
  `,
  styles: `
    :host { display: block; animation: card-in .6s var(--ease) both; animation-delay: var(--i, 0ms); }
    @keyframes card-in { from { opacity: 0; transform: translateY(16px) scale(.98); } }
    .card { display: block; text-decoration: none; color: inherit; border-radius: var(--radius); }
    .frame { position: relative; border-radius: var(--radius); overflow: hidden; background: var(--paper-2);
      box-shadow: 0 0 0 1px rgb(23 22 26 / .04); transform: translateZ(0); }
    .frame app-art-image { transition: transform .9s var(--ease); }
    .veil { position: absolute; inset: 0; background: linear-gradient(to top, rgb(10 10 12 / .55), transparent 45%);
      opacity: 0; transition: opacity .4s var(--ease); }
    .meta { display: flex; flex-direction: column; gap: 2px; padding: 12px 4px 0; }
    .title { font-family: var(--font-display); font-weight: 600; color: var(--ink); font-size: 1.02rem; line-height: 1.3; }
    .cats { font-size: var(--step--1); color: var(--ink-3); }

    /* Pointer devices: title slides over the art on hover instead of sitting below. */
    @media (hover: hover) and (pointer: fine) {
      .meta { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 20px; pointer-events: none;
        opacity: 0; transform: translateY(10px); transition: opacity .35s var(--ease), transform .45s var(--ease); }
      .card { position: relative; display: block; }
      .title { color: #fff; }
      .cats { color: rgb(255 255 255 / .82); }
      .card:hover .frame app-art-image, .card:focus-visible .frame app-art-image { transform: scale(1.04); }
      .card:hover .veil, .card:focus-visible .veil { opacity: 1; }
      .card:hover .meta, .card:focus-visible .meta { opacity: 1; transform: none; }
    }
  `,
})
export class ArtworkCard {
  private readonly content = inject(ContentService);
  readonly art = input.required<Artwork>();
  readonly opened = output<string>();

  protected readonly categoryLabels = computed(() => this.art().categories.map((c) => this.content.categoryLabel(c)).join(' · '));

  protected onClick(event: MouseEvent): void {
    // Let modified clicks (new tab etc.) behave like normal links.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    this.opened.emit(this.art().slug);
  }
}
