import { getContent } from '@/content/load';
import { AgentOS } from '@/os/shell/AgentOS';

export default async function Home() {
  const content = await getContent();
  return <AgentOS content={content} />;
}
