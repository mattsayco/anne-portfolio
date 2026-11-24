import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { ContentService } from '../../core/content.service';
import { GalleryStateService } from '../../core/gallery-state.service';
import { formatDate, paragraphs } from '../../core/text';
import { Icon } from '../../shared/icon';

/**
 * Full-screen artwork viewer built on the native <dialog> element, which gives
 * us a focus trap, Esc handling, inert background and focus restoration for free.
 * Open state lives in the URL (?art=slug) via GalleryStateService.
 */
@Component({
  selector: 'app-artwork-lightbox',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <dialog #dialog class="lightbox" aria-labelledby="lb-title" (cancel)="onCancel($event)" (click)="onBackdrop($event)">
      @if (art(); as a) {
        @let img = current() ?? a.image;
        <div class="layout">
          <div class="stage" (pointerdown)="swipeStart($event)" (pointerup)="swipeEnd($event)">
            <!-- one-item loop re-creates the <img> per image so the fade-in replays -->
            @for (shown of [img]; track shown.src) {
              <img class="art" [src]="shown.src" [attr.srcset]="shown.srcset || null" sizes="(max-width: 900px) 100vw, 72vw"
                   [attr.width]="shown.width || null" [attr.height]="shown.height || null"
                   [class.pixelated]="shown.pixelated" [style.background-color]="shown.color"
                   [alt]="imageIndex() === 0 ? a.alt : a.title + ' — extra image ' + imageIndex()" />
            }

            @if (position(); as p) {
              @if (p.total > 1) {
                <button type="button" class="nav prev" (click)="gallery.step(-1)" aria-label="Previous artwork">
                  <app-icon name="arrow-left" [size]="22" />
                </button>
                <button type="button" class="nav next" (click)="gallery.step(1)" aria-label="Next artwork">
                  <app-icon name="arrow-right" [size]="22" />
                </button>
              }
            }
          </div>

          <aside class="info">
            <div class="info-top">
              @if (position(); as p) {
                <span class="counter" aria-live="polite">{{ p.index + 1 }} / {{ p.total }}</span>
              }
              <button type="button" class="close" (click)="gallery.close()" aria-label="Close artwork viewer">
                <app-icon name="close" [size]="22" />
              </button>
            </div>

            <h2 id="lb-title">{{ a.title }}</h2>
            <p class="cats">{{ categoryLabels() }}@if (date()) { · {{ date() }} }</p>

            @for (p of description(); track $index) {
              <p class="desc">{{ p }}</p>
            }

            @if (images().length > 1) {
              <div class="thumbs" role="group" aria-label="Images of this artwork">
                @for (im of images(); track im.src; let i = $index) {
                  <button type="button" [class.active]="i === imageIndex()" (click)="imageIndex.set(i)"
                          [attr.aria-pressed]="i === imageIndex()" [attr.aria-label]="i === 0 ? 'Main image' : 'Extra image ' + i">
                    <img [src]="im.thumb ?? im.src" alt="" loading="lazy" [class.pixelated]="im.pixelated" />
                  </button>
                }
              </div>
            }

            @if (a.software.length) {
              <h3>Made with</h3>
              <ul class="chip-list dark">
                @for (s of a.software; track s) { <li class="chip">{{ s }}</li> }
              </ul>
            }
            @if (a.tags.length) {
              <h3>Tags</h3>
              <ul class="chip-list dark">
                @for (t of a.tags; track t) { <li class="chip">#{{ t }}</li> }
              </ul>
            }

            <div class="actions">
              <button type="button" class="share" (click)="copyLink()">
                <app-icon [name]="copied() ? 'check' : 'copy'" [size]="18" />
                {{ copied() ? 'Link copied' : 'Copy link' }}
              </button>
              <a class="share" [href]="img.src" target="_blank" rel="noopener">
                <app-icon name="arrow-up-right" [size]="18" /> Full size
              </a>
            </div>
            <p class="hint" aria-hidden="true">Use ← → to browse · Esc to close</p>
          </aside>
        </div>
      }
    </dialog>
  `,
  styleUrl: './artwork-lightbox.scss',
})
export class ArtworkLightbox {
  protected readonly gallery = inject(GalleryStateService);
  private readonly content = inject(ContentService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly art = this.gallery.active;
  protected readonly position = this.gallery.position;
  protected readonly images = computed(() => {
    const a = this.art();
    return a ? [a.image, ...a.process] : [];
  });
  /** Resets to the main image whenever another artwork is shown. */
  protected readonly imageIndex = linkedSignal({ source: () => this.art()?.slug, computation: () => 0 });
  protected readonly current = computed(() => this.images()[this.imageIndex()]);
  protected readonly copied = signal(false);
  protected readonly description = computed(() => paragraphs(this.art()?.description));
  protected readonly date = computed(() => formatDate(this.art()?.date ?? null, this.content.site().language));
  protected readonly categoryLabels = computed(() => (this.art()?.categories ?? []).map((c) => this.content.categoryLabel(c)).join(' · '));

  private swipeX: number | null = null;

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      const open = !!this.art();
      if (open && !el.open) {
        el.showModal();
        document.documentElement.style.overflow = 'hidden';
      } else if (!open && el.open) {
        el.close();
        document.documentElement.style.overflow = '';
      }
      this.copied.set(false);
    });
  }

  protected onCancel(event: Event): void {
    // Esc: route the close through the URL state instead of closing directly.
    event.preventDefault();
    this.gallery.close();
  }

  protected onBackdrop(event: MouseEvent): void {
    // Clicks on the dialog element itself (outside .layout content) = backdrop.
    if (event.target === this.dialog().nativeElement) this.gallery.close();
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.art()) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.gallery.step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.gallery.step(-1);
    }
  }

  protected swipeStart(e: PointerEvent): void {
    if (e.pointerType !== 'mouse') this.swipeX = e.clientX;
  }

  protected swipeEnd(e: PointerEvent): void {
    if (this.swipeX === null) return;
    const dx = e.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) > 50) this.gallery.step(dx < 0 ? 1 : -1);
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(location.href);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2200);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the URL bar still has the link.
    }
  }
}
