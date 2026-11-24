import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Fades an element in when it scrolls into view.
 * The hiding CSS only applies once the browser adds `.reveal-ready` to <html>,
 * so prerendered HTML is always fully visible (no-JS visitors, crawlers).
 */
@Directive({
  selector: '[appReveal]',
  host: { '[style.--reveal-delay]': 'revealDelay() + "ms"' },
})
export class Reveal {
  readonly revealDelay = input(0);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const node = this.el.nativeElement;
      if (!('IntersectionObserver' in window)) {
        node.classList.add('is-visible');
        return;
      }
      // Elements already on screen at load are shown immediately (no flash).
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        node.classList.add('is-visible');
      }
      document.documentElement.classList.add('reveal-ready');
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            node.classList.add('is-visible');
            io.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
      );
      io.observe(node);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
