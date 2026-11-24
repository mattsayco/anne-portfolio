import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContentService } from '../core/content.service';
import { ArtImage } from '../shared/art-image';
import { Icon } from '../shared/icon';
import { Reveal } from '../shared/reveal.directive';

@Component({
  selector: 'app-testimonials',
  imports: [ArtImage, Icon, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (site().showTestimonials && testimonials().length) {
      <section class="section testimonials" aria-labelledby="testimonials-title">
        <div class="container">
          <div class="section-head" appReveal>
            <p class="eyebrow">Testimonials</p>
            <h2 id="testimonials-title" class="section-title">{{ site().headings.testimonials }}</h2>
          </div>
          <ul class="grid">
            @for (t of testimonials(); track t.slug) {
              <li appReveal [revealDelay]="($index % 3) * 90">
                <figure>
                  <app-icon name="quote" [size]="28" class="mark" />
                  <blockquote>{{ t.quote }}</blockquote>
                  <figcaption>
                    @if (t.avatar; as av) {
                      <app-art-image class="avatar" [image]="av" alt="" aspect="1 / 1" sizes="48px" [useThumb]="true" />
                    } @else {
                      <span class="avatar initials" aria-hidden="true">{{ t.name.charAt(0) }}</span>
                    }
                    <span>
                      <strong>{{ t.name }}</strong>
                      @if (t.role) { <span class="role">{{ t.role }}</span> }
                      @if (t.project) { <span class="role">Project: {{ t.project }}</span> }
                    </span>
                  </figcaption>
                </figure>
              </li>
            }
          </ul>
        </div>
      </section>
    }
  `,
  styles: `
    .testimonials { padding-top: 0; }
    .grid { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(16px, 2vw, 24px);
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); }
    figure { margin: 0; height: 100%; display: flex; flex-direction: column; gap: 20px; padding: clamp(24px, 2.6vw, 36px);
      border-radius: calc(var(--radius) + 6px); background: var(--paper-2); border: 1px solid var(--line); }
    .mark { color: var(--accent); }
    blockquote { margin: 0; font-family: var(--font-display); font-size: var(--step-1); line-height: 1.45; color: var(--ink); letter-spacing: -.01em; }
    figcaption { margin-top: auto; display: flex; align-items: center; gap: 12px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex: none; }
    .initials { display: grid; place-items: center; background: var(--ink); color: var(--paper); font-family: var(--font-display); font-weight: 600; }
    strong { display: block; color: var(--ink); font-family: var(--font-display); font-weight: 600; }
    .role { display: block; font-size: var(--step--1); color: var(--ink-3); }
  `,
})
export class Testimonials {
  private readonly content = inject(ContentService);
  protected readonly site = this.content.site;
  protected readonly testimonials = this.content.testimonials;
}
