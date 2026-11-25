import { getContent } from '@/content/load';
import { AgentOS } from '@/os/shell/AgentOS';
import { SeoContent } from '@/seo/SeoContent';
import { HideWhenHydrated } from '@/seo/HideWhenHydrated';

export default async function Home() {
  const content = await getContent();
  return (
    <>
      <noscript>
        <style>{'.agentos-root{display:none}'}</style>
      </noscript>
      <AgentOS content={content} />
      <HideWhenHydrated>
        <SeoContent content={content} />
      </HideWhenHydrated>
    </>
  );
}
