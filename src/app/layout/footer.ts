import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContentService } from '../core/content.service';
import { Icon } from '../shared/icon';
import { SocialIcon } from '../shared/social-icon';

@Component({
  selector: 'app-footer',
  imports: [Icon, SocialIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="container inner">
        <div class="sign">
          <p class="name">{{ profile().name }}</p>
          <p class="title">{{ profile().title }}</p>
        </div>

        @if (contact().socials.length) {
          <ul class="socials" aria-label="Social media">
            @for (s of contact().socials; track s.url) {
              <li>
                <a [href]="s.url" target="_blank" rel="noopener noreferrer me">
                  <app-social-icon [link]="s" [size]="18" />
                  <span class="visually-hidden">{{ s.label }} (opens in a new tab)</span>
                </a>
              </li>
            }
          </ul>
        }

        <a class="top" href="#home">
          Back to top <app-icon name="arrow-up" [size]="16" />
        </a>
      </div>
      <div class="container legal">
        <p>© {{ year }} {{ profile().name }}. {{ site().footerNote }}</p>
        <p>
          @if (site().hasSampleContent) { Artwork marked “Sample” is placeholder content. }
          This site doesn't use cookies.
        </p>
      </div>
    </footer>
  `,
  styles: `
    .footer { border-top: 1px solid var(--line); padding-block: 48px 32px; background: var(--paper-2); }
    .inner { display: flex; flex-wrap: wrap; align-items: center; gap: 24px 40px; }
    .sign { margin-right: auto; }
    .name { font-family: var(--font-display); font-weight: 600; color: var(--ink); font-size: 1.25rem; margin: 0; }
    .title { margin: 0; color: var(--ink-3); font-size: var(--step--1); }
    .socials { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; }
    .socials a {
      display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--line-strong); color: var(--ink); transition: background-color .2s, color .2s, transform .3s var(--ease);
    }
    .socials a:hover { background: var(--ink); color: var(--paper); transform: translateY(-2px); }
    .top { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: var(--ink); font-family: var(--font-display); font-weight: 500; }
    .top:hover { color: var(--accent-ink); }
    .legal { margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--line); font-size: var(--step--1); color: var(--ink-3); display: flex; flex-wrap: wrap; gap: 4px 24px; justify-content: space-between; }
    .legal p { margin: 0; }
  `,
})
export class Footer {
  private readonly content = inject(ContentService);
  protected readonly profile = this.content.profile;
  protected readonly contact = this.content.contact;
  protected readonly site = this.content.site;
  protected readonly year = new Date().getFullYear();
}
