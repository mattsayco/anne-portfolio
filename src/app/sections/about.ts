import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ContentService } from '../core/content.service';
import { AnalyticsService } from '../core/analytics.service';
import { paragraphs } from '../core/text';
import { ArtImage } from '../shared/art-image';
import { Icon } from '../shared/icon';
import { SocialIcon } from '../shared/social-icon';
import { Reveal } from '../shared/reveal.directive';

@Component({
  selector: 'app-about',
  imports: [ArtImage, Icon, SocialIcon, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="about" class="section about" aria-labelledby="about-title">
      <div class="container grid">
        <aside class="card" appReveal>
          @if (profile().avatar; as avatar) {
            <div class="portrait">
              <app-art-image [image]="avatar" [alt]="profile().avatarAlt" aspect="1 / 1" sizes="(max-width: 860px) 70vw, 340px" />
            </div>
          }
          <p class="name">{{ profile().name }}</p>
          <p class="role">{{ profile().title }}</p>

          <ul class="facts">
            <li><span class="status status--{{ contact().commissionStatus }}">{{ statusLabel() }}</span></li>
            @if (contact().location) {
              <li><app-icon name="pin" [size]="18" /> {{ contact().location }}</li>
            }
          </ul>

          @if (profile().resume; as resume) {
            <a class="btn resume" [href]="resume" download target="_blank" rel="noopener" (click)="analytics.event('cta/resume')">
              <app-icon name="download" [size]="18" /> {{ profile().resumeLabel }}
            </a>
          }

          @if (contact().socials.length) {
            <ul class="socials" aria-label="Social media">
              @for (s of contact().socials; track s.url) {
                <li>
                  <a [href]="s.url" target="_blank" rel="noopener noreferrer me" [attr.title]="s.label">
                    <app-social-icon [link]="s" [size]="18" />
                    <span class="visually-hidden">{{ s.label }} (opens in a new tab)</span>
                  </a>
                </li>
              }
            </ul>
          }
        </aside>

        <div class="body">
          <div class="section-head" appReveal>
            <p class="eyebrow">About</p>
            <h2 id="about-title" class="section-title">Hi, I'm {{ profile().name }}.</h2>
          </div>

          <div class="bio" appReveal>
            @for (p of bio(); track $index) {
              <p [class.lead]="$first">{{ p }}</p>
            }
          </div>

          @if (background().length) {
            <div class="block" appReveal>
              <h3>Background</h3>
              @for (p of background(); track $index) {
                <p>{{ p }}</p>
              }
            </div>
          }

          @if (profile().experience.length) {
            <div class="block" appReveal>
              <h3>Experience</h3>
              <ol class="timeline">
                @for (e of profile().experience; track $index) {
                  <li>
                    <span class="period">{{ e.period }}</span>
                    <div>
                      <p class="exp-role">{{ e.role }}@if (e.organization) { <span> · {{ e.organization }}</span> }</p>
                      @if (e.description) {
                        <p class="exp-desc">{{ e.description }}</p>
                      }
                    </div>
                  </li>
                }
              </ol>
            </div>
          }

          <div class="lists" appReveal>
            @if (profile().skills.length) {
              <div>
                <h3>Skills & specialties</h3>
                <ul class="chip-list">
                  @for (s of profile().skills; track s) { <li class="chip">{{ s }}</li> }
                </ul>
              </div>
            }
            @if (profile().tools.length) {
              <div>
                <h3>Software & tools</h3>
                <ul class="chip-list">
                  @for (s of profile().tools; track s) { <li class="chip">{{ s }}</li> }
                </ul>
              </div>
            }
            @if (profile().interests.length) {
              <div>
                <h3>Artistic interests</h3>
                <ul class="chip-list">
                  @for (s of profile().interests; track s) { <li class="chip">{{ s }}</li> }
                </ul>
              </div>
            }
          </div>

          @if (profile().achievements.length) {
            <div class="block" appReveal>
              <h3>Achievements</h3>
              <ul class="ticks">
                @for (a of profile().achievements; track a) { <li>{{ a }}</li> }
              </ul>
            </div>
          }

          @if (profile().links.length) {
            <div class="block links" appReveal>
              @for (l of profile().links; track l.url) {
                <a class="text-link" [href]="l.url" [attr.target]="l.url.startsWith('http') ? '_blank' : null" rel="noopener noreferrer">
                  {{ l.label }} <app-icon name="arrow-up-right" [size]="16" />
                </a>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './about.scss',
})
export class About {
  private readonly content = inject(ContentService);
  protected readonly analytics = inject(AnalyticsService);
  protected readonly profile = this.content.profile;
  protected readonly contact = this.content.contact;
  protected readonly bio = computed(() => paragraphs(this.profile().bio));
  protected readonly background = computed(() => paragraphs(this.profile().background));
  protected readonly statusLabel = computed(
    () => ({ open: 'Open for commissions', limited: 'Limited availability', closed: 'Commissions closed' })[this.contact().commissionStatus],
  );
}
