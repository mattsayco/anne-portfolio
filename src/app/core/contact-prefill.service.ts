import { Injectable, signal } from '@angular/core';

export type InquiryType = 'job' | 'commission' | 'collaboration' | 'general';

export interface ContactPrefill {
  inquiry: InquiryType;
  subject: string;
}

/** Lets service cards and CTAs pre-fill the contact form before scrolling to it. */
@Injectable({ providedIn: 'root' })
export class ContactPrefillService {
  readonly request = signal<ContactPrefill | null>(null);

  prefill(value: ContactPrefill): void {
    this.request.set({ ...value });
  }
}
