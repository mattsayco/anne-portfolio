import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SocialLink } from '../core/content.models';
import { Icon } from './icon';

/** Brand mark for a social platform (paths from simple-icons, CC0), or a globe fallback. */
@Component({
  selector: 'app-social-icon',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @if (link().icon; as icon) {
      <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" fill="currentColor" focusable="false">
        <path [attr.d]="icon.path" [attr.fill-rule]="icon.evenOdd ? 'evenodd' : null" />
      </svg>
    } @else {
      <app-icon name="globe" [size]="size()" />
    }
  `,
  styles: `:host{display:inline-flex;line-height:0}`,
})
export class SocialIcon {
  readonly link = input.required<SocialLink>();
  readonly size = input(20);
}
