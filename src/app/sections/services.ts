import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ContentService } from '../core/content.service';
import { ContactPrefillService } from '../core/contact-prefill.service';
import { AnalyticsService } from '../core/analytics.service';
import { Service } from '../core/content.models';
import { ArtImage } from '../shared/art-image';
import { Icon } from '../shared/icon';
import { Reveal } from '../shared/reveal.directive';

@Component({
  selector: 'app-service-card',
  imports: [ArtImage, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="service" [attr.aria-labelledby]="'svc-' + service().slug">
      @if (service().image; as img) {
        <app-art-image class="thumb" [image]="img" [alt]="''" aspect="16 / 10" sizes="(max-width: 700px) 100vw, 33vw" [useThumb]="true" />
      } @else {
        <span class="badge"><app-icon [name]="service().icon" [size]="26" /></span>
      }
      <h3 [id]="'svc-' + service().slug">{{ service().title }}</h3>
      <p class="desc">{{ service().description }}</p>

      @if (service().details.length) {
        <ul class="details">
          @for (d of service().details; track d) {
            <li><app-icon name="check" [size]="16" /> {{ d }}</li>
          }
        </ul>
      }

      <dl class="terms">
        @if (price(); as p) {
          <div><dt>Price</dt><dd class="price">{{ p }}</dd></div>
        }
        @if (service().delivery) {
          <div><dt>Delivery</dt><dd>{{ service().delivery }}</dd></div>
        }
      </dl>
      @if (service().pricingNote && service().pricingMode !== 'hidden') {
        <p class="note">{{ service().pricingNote }}</p>
      }

      <a class="btn btn--secondary btn--sm cta" href="#contact" (click)="inquire.emit(service())">
        {{ service().ctaLabel }} <app-icon name="arrow-right" [size]="16" />
      </a>
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .service {
      height: 100%; display: flex; flex-direction: column; gap: 12px;
      padding: clamp(22px, 2.4vw, 32px); border-radius: calc(var(--radius) + 6px);
      background: var(--surface); border: 1px solid var(--line);
      transition: transform .5s var(--ease), box-shadow .5s var(--ease), border-color .3s;
    }
    .service:hover { transform: translateY(-4px); box-shadow: var(--shadow-2); border-color: transparent; }
    .badge { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center;
      background: var(--accent-soft); color: var(--accent-ink); margin-bottom: 8px; transition: transform .5s var(--ease); }
    .service:hover .badge { transform: rotate(-8deg) scale(1.06); }
    .thumb { border-radius: var(--radius); margin-bottom: 8px; }
    h3 { font-size: var(--step-1); }
    .desc { margin: 0; }
    .details { list-style: none; padding: 0; margin: 4px 0 0; display: grid; gap: 6px; font-size: .95rem; }
    .details li { display: flex; gap: 8px; align-items: flex-start; }
    .details app-icon { color: var(--open); margin-top: 4px; }
    .terms { margin: auto 0 0; padding-top: 16px; border-top: 1px dashed var(--line-strong); display: flex; flex-wrap: wrap; gap: 8px 32px; }
    .terms dt { font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
    .terms dd { margin: 0; font-family: var(--font-display); font-weight: 500; color: var(--ink); }
    .price { font-size: 1.15rem; }
    .note { margin: 0; font-size: var(--step--1); color: var(--ink-3); }
    .cta { align-self: flex-start; margin-top: 8px; }
  `,
})
export class ServiceCard {
  readonly service = input.required<Service>();
  readonly inquire = output<Service>();

  protected readonly price = computed(() => {
    const s = this.service();
    switch (s.pricingMode) {
      case 'fixed':
        return s.price || null;
      case 'from':
        return s.price ? `From ${s.price}` : null;
      case 'request':
        return 'On request';
      default:
        return null;
    }
  });
}

@Component({
  selector: 'app-services',
  imports: [ServiceCard, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="services" class="section" aria-labelledby="services-title">
      <div class="container">
        <div class="head">
          <div class="section-head" appReveal>
            <p class="eyebrow">Services</p>
            <h2 id="services-title" class="section-title">{{ site().headings.services }}</h2>
            @if (site().headings.servicesIntro) {
              <p class="lead">{{ site().headings.servicesIntro }}</p>
            }
          </div>
        </div>

        @if (services().length) {
          <ul class="grid">
            @for (s of services(); track s.slug) {
              <li appReveal [revealDelay]="($index % 3) * 90">
                <app-service-card [service]="s" (inquire)="inquire($event)" />
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: `
    .grid { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(16px, 2vw, 24px);
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
  `,
})
export class Services {
  private readonly content = inject(ContentService);
  private readonly prefill = inject(ContactPrefillService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly site = this.content.site;
  protected readonly services = this.content.services;

  protected inquire(s: Service): void {
    this.prefill.prefill({ inquiry: 'commission', subject: `Commission: ${s.title}` });
    this.analytics.event(`cta/service/${s.slug}`);
  }
}
