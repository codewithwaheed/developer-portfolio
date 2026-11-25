import { siteConfig } from '@/config/site';

/** Next shallow-merges openGraph, so every override must spread this to keep image and site name. */
export const baseOpenGraph = {
  siteName: siteConfig.name,
  images: ['/og.png'],
  type: 'website' as const,
};
