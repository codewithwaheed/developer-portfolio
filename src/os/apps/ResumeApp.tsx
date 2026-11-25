import { IconDownload } from '@tabler/icons-react';

export function ResumeApp() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end px-3 py-2">
        <a
          href="/resume.pdf"
          download
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--control)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--hover)]"
        >
          <IconDownload size={14} stroke={1.8} aria-hidden />
          Download
        </a>
      </div>
      <iframe
        src="/resume.pdf"
        title="Resume"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
