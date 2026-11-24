import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentService } from './content.service';

interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void;
}

/**
 * Optional, privacy-friendly analytics via GoatCounter (no cookies, no personal data).
 * Disabled unless a GoatCounter code is set in the CMS (Site settings).
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly code = inject(ContentService).site().goatcounter;

  init(): void {
    if (!this.isBrowser || !this.code) return;
    const s = this.doc.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset['goatcounter'] = `https://${this.code}.goatcounter.com/count`;
    this.doc.body.appendChild(s);
  }

  /** Records a named event, e.g. "artwork/lantern-valley" or "cta/hire-me". */
  event(path: string, title?: string): void {
    if (!this.isBrowser || !this.code) return;
    const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
    gc?.count?.({ path, title: title ?? path, event: true });
  }
}
