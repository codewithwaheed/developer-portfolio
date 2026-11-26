import { Fragment, type ReactNode } from 'react';

const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

/** Inline markdown as React nodes: **bold**, *italic*, `code`, [text](url). No HTML is injected. */
function inline(text: string): ReactNode[] {
  const parts = text.split(
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\[[^\]\n]+\]\([^)\s]+\))/g,
  );
  return parts.map((part, i) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--control)] px-1 py-px font-mono text-[0.92em] text-[var(--fg)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--fg)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link && SAFE_HREF.test(link[2])) {
      const external = /^https?:/i.test(link[2]);
      return (
        <a
          key={i}
          href={link[2]}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-[var(--accent)] underline underline-offset-2 hover:brightness-110"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const HEADING = ['text-[15px]', 'text-[14.5px]', 'text-[14px]'];

/**
 * Small, safe markdown renderer for chat replies: headings, paragraphs, bullet and numbered
 * lists, blockquotes, fenced code, rules, plus the inline forms above.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let para: string[] = [];
  const key = () => `b${blocks.length}`;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={key()}>
          {para.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {inline(l)}
            </Fragment>
          ))}
        </p>,
      );
    }
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={key()}
        className={`space-y-0.5 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}
      >
        {list.items.map((li, i) => (
          <li key={i}>{inline(li)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push(
        <blockquote
          key={key()}
          className="border-l-2 border-[var(--accent)] pl-2.5 text-[var(--fg-muted)]"
        >
          {inline(quote.join(' '))}
        </blockquote>,
      );
    }
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      flushAll();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i]);
      blocks.push(
        <pre
          key={key()}
          className="overflow-x-auto rounded-lg bg-[var(--control)] p-2.5 font-mono text-[12px] leading-snug text-[var(--fg)]"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    if (!line) {
      flushAll();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push(
        <p
          key={key()}
          className={`font-semibold text-[var(--fg)] ${HEADING[Math.min(heading[1].length, 3) - 1]}`}
        >
          {inline(heading[2])}
        </p>,
      );
      continue;
    }
    if (/^([-*_])(\s*\1){2,}$/.test(line)) {
      flushAll();
      blocks.push(<hr key={key()} className="border-[var(--glass-edge)]" />);
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      flushQuote();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return <div className="space-y-2">{blocks}</div>;
}
