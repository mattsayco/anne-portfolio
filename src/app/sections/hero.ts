import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ContentService } from '../core/content.service';
import { GalleryStateService } from '../core/gallery-state.service';
import { AnalyticsService } from '../core/analytics.service';
import { emphasisParts, isExternal } from '../core/text';
import { ArtImage } from '../shared/art-image';
import { Icon } from '../shared/icon';

const STATUS_LABEL = { open: 'Open for commissions', limited: 'Limited availability', closed: 'Commissions currently closed' } as const;

@Component({
  selector: 'app-hero',
  imports: [ArtImage, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="home" class="hero" aria-labelledby="hero-title">
      <div class="backdrop" aria-hidden="true"></div>
      <div class="container grid" [class.single]="!collage().length && !hero().image">
        <div class="copy">
          @if (hero().eyebrow) {
            <p class="eyebrow rise" style="--d: 0ms">{{ hero().eyebrow }}</p>
          }
          <h1 id="hero-title" class="rise" style="--d: 80ms">
            <span class="visually-hidden">{{ profile().name }}, {{ profile().title }}. </span>
            @for (part of headline(); track $index) {
              @if (part.emphasis) {
                <em>{{ part.text }}</em>
              } @else {
                <span class="soft">{{ part.text }}</span>
              }
            }
          </h1>
          @if (hero().intro) {
            <p class="intro rise" style="--d: 160ms">{{ hero().intro }}</p>
          }
          @if (hero().buttons.length) {
            <div class="actions rise" style="--d: 240ms">
              @for (b of hero().buttons; track $index) {
                <a class="btn" [class.btn--secondary]="b.style === 'secondary'" [href]="b.link"
                   [attr.target]="external(b.link) ? '_blank' : null"
                   [attr.rel]="external(b.link) ? 'noopener noreferrer' : null"
                   (click)="analytics.event('cta/hero/' + b.label)">
                  {{ b.label }}
                  @if (external(b.link)) {
                    <app-icon name="arrow-up-right" [size]="18" />
                    <span class="visually-hidden">(opens in a new tab)</span>
                  } @else {
                    <app-icon name="arrow-right" [size]="18" />
                  }
                </a>
              }
            </div>
          }
          <p class="availability rise" style="--d: 320ms">
            <span class="status status--{{ contact().commissionStatus }}">{{ statusLabel() }}</span>
            @if (contact().commissionNote) {
              <span class="note">{{ contact().commissionNote }}</span>
            }
          </p>
        </div>

        @if (collage().length) {
          <div class="collage" [attr.data-count]="collage().length">
            @for (art of collage(); track art.slug; let i = $index) {
              <a class="piece piece--{{ i + 1 }}" [href]="'?art=' + art.slug" (click)="open($event, art.slug)"
                 [attr.aria-label]="'View ' + art.title">
                <app-art-image [image]="art.image" [alt]="art.alt" [eager]="i === 0" [useThumb]="true"
                               [aspect]="i === 0 ? '4 / 5' : '1 / 1'"
                               sizes="(max-width: 960px) 60vw, 34vw" />
                <span class="label">{{ art.title }}</span>
              </a>
            }
          </div>
        } @else if (hero().image; as img) {
          <div class="solo rise" style="--d: 120ms">
            <app-art-image [image]="img" [alt]="profile().name + ' — featured artwork'" [eager]="true" sizes="(max-width: 960px) 100vw, 45vw" />
          </div>
        }
      </div>
      <a class="scroll-cue" href="#portfolio" aria-label="Scroll to portfolio">
        <span></span>
      </a>
    </section>
  `,
  styleUrl: './hero.scss',
})
export class Hero {
  private readonly content = inject(ContentService);
  private readonly gallery = inject(GalleryStateService);
  protected readonly analytics = inject(AnalyticsService);
  protected readonly hero = this.content.hero;
  protected readonly profile = this.content.profile;
  protected readonly contact = this.content.contact;
  protected readonly headline = computed(() => emphasisParts(this.hero().headline));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.contact().commissionStatus]);
  protected readonly collage = computed(() => (this.hero().showFeatured ? this.content.featured().slice(0, 3) : []));
  protected readonly external = isExternal;

  protected open(event: MouseEvent, slug: string): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    this.gallery.open(slug);
    this.analytics.event(`artwork/${slug}`);
  }
}
