import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, afterNextRender, effect, inject, signal } from '@angular/core';
import { ContentService } from '../core/content.service';
import { Icon } from '../shared/icon';

export interface NavItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-header',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.scrolled]': 'scrolled()',
    '[class.menu-open]': 'menuOpen()',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <div class="bar container">
      <a class="brand" href="#home" (click)="menuOpen.set(false)" aria-label="{{ profile().name }} — back to top">
        <span class="brand-mark" aria-hidden="true">{{ initial() }}</span>
        <span class="brand-name">{{ profile().name }}</span>
      </a>

      <nav class="nav" aria-label="Main">
        <ul id="site-menu" [class.open]="menuOpen()">
          @for (item of nav; track item.id) {
            <li>
              <a [href]="'#' + item.id" [class.active]="active() === item.id"
                 [attr.aria-current]="active() === item.id ? 'true' : null"
                 (click)="menuOpen.set(false)">{{ item.label }}</a>
            </li>
          }
          <li class="menu-cta">
            <a class="btn btn--accent" [href]="contact().commissionLink" (click)="menuOpen.set(false)">Hire me</a>
          </li>
        </ul>
      </nav>

      <a class="btn btn--sm hire" [href]="contact().commissionLink">
        <span class="status status--{{ contact().commissionStatus }}"></span>
        Hire me
      </a>

      <button class="menu-toggle" type="button" (click)="menuOpen.set(!menuOpen())"
              [attr.aria-expanded]="menuOpen()" aria-controls="site-menu">
        <app-icon [name]="menuOpen() ? 'close' : 'menu'" [size]="24" />
        <span class="visually-hidden">{{ menuOpen() ? 'Close menu' : 'Open menu' }}</span>
      </button>
    </div>
  `,
  styleUrl: './header.scss',
})
export class Header {
  private readonly content = inject(ContentService);
  private readonly doc = inject(DOCUMENT);
  protected readonly profile = this.content.profile;
  protected readonly contact = this.content.contact;
  protected readonly initial = () => (this.profile().name || '•').trim().charAt(0).toUpperCase();

  protected readonly nav: NavItem[] = [
    { id: 'home', label: 'Home' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'contact', label: 'Contact' },
  ];

  protected readonly active = signal('home');
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Lock page scroll while the mobile menu is open.
    effect(() => {
      this.doc.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });

    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });

      // Scroll-spy: the section crossing the upper third of the viewport is "active".
      const sections = this.nav.map((n) => this.doc.getElementById(n.id)).filter((el): el is HTMLElement => !!el);
      const visible = new Map<string, boolean>();
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) visible.set(e.target.id, e.isIntersecting);
          const current = this.nav.find((n) => visible.get(n.id));
          if (current) this.active.set(current.id);
        },
        { rootMargin: '-35% 0px -60% 0px' },
      );
      sections.forEach((s) => io.observe(s));

      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        io.disconnect();
      });
    });
  }
}
