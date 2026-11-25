'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** With JS, a blog URL opens inside the OS; without it the article stays readable. */
export function PostRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/?app=pensieve&post=${encodeURIComponent(slug)}`);
  }, [router, slug]);
  return null;
}
