/** Splits CMS plain text into paragraphs on blank lines. */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export interface TextPart {
  text: string;
  emphasis: boolean;
}

/** Parses "Painting *small worlds*" into plain/emphasised parts (no HTML involved). */
export function emphasisParts(text: string): TextPart[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((t) => (t.startsWith('*') && t.endsWith('*') && t.length > 2 ? { text: t.slice(1, -1), emphasis: true } : { text: t, emphasis: false }));
}

/** True for links that leave the page (opened in a new tab). */
export function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function formatDate(iso: string | null, locale = 'en'): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}
