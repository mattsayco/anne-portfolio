import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { ContentService } from './content.service';

/**
 * Gallery filter + open artwork, stored in the URL (?category=…&art=…)
 * so filtered views and individual pieces are shareable, and the browser
 * back button closes the viewer.
 */
@Injectable({ providedIn: 'root' })
export class GalleryStateService {
  private readonly router = inject(Router);
  private readonly content = inject(ContentService);
  private readonly params = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((p) => ({ category: p.get('category'), art: p.get('art') }))),
    { initialValue: { category: null as string | null, art: null as string | null } },
  );
  /** True when the viewer was opened by a click in this session, so closing can use history.back(). */
  private openedInApp = false;

  readonly category = computed(() => {
    const c = this.params().category;
    return c && this.content.categories().some((x) => x.value === c) ? c : 'all';
  });

  readonly filtered = computed(() => {
    const c = this.category();
    const all = this.content.artworks();
    return c === 'all' ? all : all.filter((a) => a.categories.includes(c));
  });

  readonly active = computed(() => this.content.findArtwork(this.params().art));

  /** List used for prev/next: the current filter if it contains the piece, otherwise everything. */
  private readonly sequence = computed(() => {
    const a = this.active();
    const f = this.filtered();
    return a && f.includes(a) ? f : this.content.artworks();
  });

  readonly position = computed(() => {
    const a = this.active();
    const seq = this.sequence();
    return a ? { index: seq.indexOf(a), total: seq.length } : null;
  });

  setCategory(category: string): void {
    void this.router.navigate([], {
      queryParams: { category: category === 'all' ? null : category },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  open(slug: string): void {
    this.openedInApp = true;
    void this.router.navigate([], { queryParams: { art: slug }, queryParamsHandling: 'merge' });
  }

  step(delta: 1 | -1): void {
    const seq = this.sequence();
    const pos = this.position();
    if (!pos || seq.length < 2) return;
    const next = seq[(pos.index + delta + seq.length) % seq.length];
    void this.router.navigate([], { queryParams: { art: next.slug }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  close(): void {
    if (this.openedInApp) {
      this.openedInApp = false;
      history.back();
    } else {
      void this.router.navigate([], { queryParams: { art: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }
}
