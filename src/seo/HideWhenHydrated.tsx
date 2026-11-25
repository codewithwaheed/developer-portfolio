'use client';

import { useEffect, useState } from 'react';

/** Server HTML stays visible for crawlers and no-JS; once the OS hydrates it is the accessible UI. */
export function HideWhenHydrated({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <div hidden={hydrated}>{children}</div>;
}
