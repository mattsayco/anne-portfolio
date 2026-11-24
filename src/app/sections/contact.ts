import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContentService } from '../core/content.service';
import { ContactPrefillService, InquiryType } from '../core/contact-prefill.service';
import { AnalyticsService } from '../core/analytics.service';
import { Icon } from '../shared/icon';
import { SocialIcon } from '../shared/social-icon';
import { Reveal } from '../shared/reveal.directive';

type SendState = 'idle' | 'sending' | 'success' | 'error';

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

const INQUIRIES: { value: InquiryType; label: string }[] = [
  { value: 'commission', label: 'Commission request' },
  { value: 'job', label: 'Job opportunity' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'general', label: 'General inquiry' },
];

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, Icon, SocialIcon, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  private readonly content = inject(ContentService);
  private readonly prefill = inject(ContactPrefillService);
  private readonly analytics = inject(AnalyticsService);
  private readonly fb = inject(FormBuilder);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly site = this.content.site;
  protected readonly contact = this.content.contact;
  protected readonly inquiries = INQUIRIES;
  protected readonly formAvailable = computed(() => this.contact().form.enabled && !!this.contact().form.accessKey);
  protected readonly state = signal<SendState>('idle');
  protected readonly errorMessage = signal('');
  protected readonly copied = signal(false);
  protected readonly submitted = signal(false);

  protected readonly statusLabel = computed(
    () => ({ open: 'Open for commissions', limited: 'Limited availability', closed: 'Commissions currently closed' })[this.contact().commissionStatus],
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    subject: ['', [Validators.required, Validators.maxLength(150)]],
    inquiry: ['commission' as InquiryType, Validators.required],
    message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(4000)]],
    /** Honeypot: hidden from people, bots tend to fill it. Web3Forms rejects submissions where it is set. */
    botcheck: [false],
  });

  protected readonly messageLength = signal(0);

  constructor() {
    this.form.controls.message.valueChanges.subscribe((v) => this.messageLength.set(v.length));

    // Service cards / CTAs can pre-fill the inquiry type and subject.
    effect(() => {
      const req = this.prefill.request();
      if (!req) return;
      this.form.patchValue({ inquiry: req.inquiry, subject: req.subject });
      if (this.state() !== 'sending') this.state.set('idle');
      // Wait for the smooth scroll to land before moving focus.
      setTimeout(() => this.nameInput()?.nativeElement.focus({ preventScroll: true }), 600);
    });
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.state() === 'sending') {
      this.form.markAllAsTouched();
      const firstInvalid = document.querySelector<HTMLElement>('.contact-form .ng-invalid:not(form)');
      firstInvalid?.focus();
      return;
    }
    const v = this.form.getRawValue();
    if (v.botcheck) return; // silently drop bot submissions

    this.state.set('sending');
    this.errorMessage.set('');
    const inquiryLabel = INQUIRIES.find((i) => i.value === v.inquiry)?.label ?? v.inquiry;

    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: this.contact().form.accessKey,
          subject: `[${inquiryLabel}] ${v.subject}`,
          from_name: `${this.content.profile().name} portfolio`,
          name: v.name,
          email: v.email,
          inquiry_type: inquiryLabel,
          message: v.message,
          botcheck: false,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || `The form service responded with an error (${res.status}).`);
      }
      this.state.set('success');
      this.analytics.event(`contact/sent/${v.inquiry}`);
      this.form.reset({ inquiry: v.inquiry });
      this.submitted.set(false);
    } catch (e) {
      this.state.set('error');
      this.errorMessage.set(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Could not reach the form service — check your connection.');
    }
  }

  protected async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.contact().email);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2200);
    } catch {
      /* clipboard unavailable; the mailto link still works */
    }
    this.analytics.event('cta/copy-email');
  }

  protected trackEmail(): void {
    this.analytics.event('cta/email');
  }
}
