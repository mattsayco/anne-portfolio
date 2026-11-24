import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Stroke icons drawn on a 24×24 grid (simple original paths). */
const ICONS: Record<string, string> = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  'arrow-left': 'M19 12H5m6-6-6 6 6 6',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  'arrow-up-right': 'M7 17 17 7M8 7h9v9',
  'arrow-up': 'M12 19V5m-6 6 6-6 6 6',
  download: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5 10 17l9-10',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  alert: 'M12 8v5m0 3.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  quote: 'M9 7H6a2 2 0 0 0-2 2v3h5v5H4M20 7h-3a2 2 0 0 0-2 2v3h5v5h-5',
  // Service icons
  brush: 'M14.5 4.5l5 5L10 19c-1.4 1.4-4 1.5-6 1 .5-2 .4-4.6 1.8-6zM13 6l5 5',
  character: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0',
  mountain: 'M3 20 9.5 8l4 7 2.5-4L21 20zM15 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  tree: 'M12 22v-6M12 2 5 12h4l-3 4h12l-3-4h4z',
  pixel: 'M4 4h5v5H4zM9 9h6v6H9zM15 15h5v5h-5zM15 4h5v5h-5zM4 15h5v5H4z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  cube: 'M12 2.5 20.5 7v10L12 21.5 3.5 17V7zM3.5 7 12 11.5 20.5 7M12 11.5v10',
  sparkle:
    'M12 3c.6 4.2 2.3 6.4 6.5 7-4.2.6-5.9 2.8-6.5 7-.6-4.2-2.3-6.4-6.5-7 4.2-.6 5.9-2.8 6.5-7zM19 16c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z',
  pen: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4zM14.5 5.5l3 3',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" fill="none" stroke="currentColor"
    [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path [attr.d]="d()" /></svg>`,
  styles: `:host{display:inline-flex;flex:none;line-height:0}`,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly stroke = input(1.75);
  protected readonly d = computed(() => ICONS[this.name()] ?? ICONS['sparkle']);
}
