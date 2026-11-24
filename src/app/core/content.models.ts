/**
 * Shape of src/app/core/generated/content.json, produced by
 * scripts/build-content.mjs from the CMS-managed files in /content.
 * Keep in sync with that script.
 */

export interface ResponsiveImage {
  /** Largest variant (used as fallback src). */
  src: string;
  /** Medium variant suited to grid thumbnails. */
  thumb?: string;
  /** `url widthw, …` list for the srcset attribute. Empty for remote/SVG/GIF. */
  srcset: string;
  width: number;
  height: number;
  /** Dominant colour shown while the image loads. */
  color: string;
  /** True for pixel art: render with crisp, nearest-neighbour scaling. */
  pixelated: boolean;
}

export interface Category {
  value: string;
  label: string;
  count: number;
}

export interface Artwork {
  slug: string;
  title: string;
  alt: string;
  description: string;
  categories: string[];
  tags: string[];
  date: string | null;
  software: string[];
  featured: boolean;
  order: number;
  image: ResponsiveImage;
  process: ResponsiveImage[];
}

export type PricingMode = 'fixed' | 'from' | 'request' | 'hidden';

export interface Service {
  slug: string;
  title: string;
  description: string;
  icon: string;
  image: ResponsiveImage | null;
  pricingMode: PricingMode;
  price: string;
  pricingNote: string;
  delivery: string;
  details: string[];
  ctaLabel: string;
  order: number;
}

export interface Testimonial {
  slug: string;
  name: string;
  role: string;
  quote: string;
  project: string;
  avatar: ResponsiveImage | null;
  order: number;
}

export interface Link {
  label: string;
  url: string;
}

export interface SocialLink extends Link {
  platform: string;
  icon: { path: string; evenOdd: boolean } | null;
}

export interface HeroButton {
  label: string;
  link: string;
  style: 'primary' | 'secondary';
}

export type CommissionStatus = 'open' | 'limited' | 'closed';

export interface SiteContent {
  generatedAt: string;
  site: {
    url: string;
    title: string;
    description: string;
    shareImage: string | null;
    language: string;
    headings: {
      portfolio: string;
      portfolioIntro: string;
      services: string;
      servicesIntro: string;
      testimonials: string;
      contact: string;
      contactIntro: string;
    };
    showTestimonials: boolean;
    goatcounter: string;
    footerNote: string;
    /** True while any placeholder ("sample-") media is still in use. */
    hasSampleContent: boolean;
  };
  hero: {
    eyebrow: string;
    headline: string;
    intro: string;
    image: ResponsiveImage | null;
    showFeatured: boolean;
    buttons: HeroButton[];
  };
  profile: {
    name: string;
    title: string;
    avatar: ResponsiveImage | null;
    avatarAlt: string;
    bio: string;
    background: string;
    experience: { role: string; organization: string; period: string; description: string }[];
    skills: string[];
    tools: string[];
    interests: string[];
    achievements: string[];
    resume: string | null;
    resumeLabel: string;
    links: Link[];
  };
  contact: {
    email: string;
    location: string;
    commissionStatus: CommissionStatus;
    commissionNote: string;
    commissionLink: string;
    responseTime: string;
    socials: SocialLink[];
    form: { enabled: boolean; accessKey: string; successMessage: string };
  };
  categories: Category[];
  artworks: Artwork[];
  services: Service[];
  testimonials: Testimonial[];
}
