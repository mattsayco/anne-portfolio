import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Category } from '../../core/content.models';

/** Category filter. Buttons with aria-pressed: simple, keyboard-friendly, screen-reader clear. */
@Component({
  selector: 'app-portfolio-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter" role="group" aria-label="Filter artwork by category">
      @for (c of options(); track c.value) {
        <button type="button" class="pill" [class.active]="c.value === selected()"
                [attr.aria-pressed]="c.value === selected()" (click)="changed.emit(c.value)">
          {{ c.label }}
          <span class="count" aria-hidden="true">{{ c.count }}</span>
          <span class="visually-hidden">({{ c.count }} {{ c.count === 1 ? 'piece' : 'pieces' }})</span>
        </button>
      }
    </div>
  `,
  styles: `
    .filter {
      display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 10px; margin: -4px -2px 0;
      scrollbar-width: none; scroll-snap-type: x proximity;
      mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
    }
    .filter::-webkit-scrollbar { display: none; }
    @media (min-width: 900px) { .filter { flex-wrap: wrap; overflow: visible; mask-image: none; } }
    .pill {
      flex: none; scroll-snap-align: start;
      display: inline-flex; align-items: center; gap: 8px;
      min-height: 42px; padding: 0 16px; border-radius: 999px;
      border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink-2);
      font-family: var(--font-display); font-weight: 500; font-size: .95rem; cursor: pointer;
      transition: background-color .2s, color .2s, border-color .2s, transform .3s var(--ease);
    }
    .pill:hover { border-color: var(--ink); color: var(--ink); }
    .pill.active { background: var(--ink); border-color: var(--ink); color: var(--paper); }
    .count {
      min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; display: inline-grid; place-items: center;
      font-size: .75rem; background: var(--paper-2); color: var(--ink-3);
    }
    .pill.active .count { background: rgb(255 255 255 / .16); color: var(--paper); }
  `,
})
export class PortfolioFilter {
  readonly categories = input.required<Category[]>();
  readonly total = input.required<number>();
  readonly selected = input.required<string>();
  readonly changed = output<string>();

  protected readonly options = computed(() => [{ value: 'all', label: 'Show All', count: this.total() }, ...this.categories()]);
}
