import { siteConfig } from '@/config/site';

export function ConsultApp() {
  return (
    <div className="flex h-full flex-col overflow-auto p-5">
      <p className="font-mono text-xs text-[var(--accent)]">Let’s Build Something Great!</p>
      <h1 className="mt-1 text-xl font-semibold text-[var(--fg)]">Book a Free Consultation</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
        Have an exciting idea or need an estimate for your project? Feel free to book a meeting and
        let’s discuss how we can bring it to life in 20-minutes strategy session with me
      </p>
      <iframe
        title="Book a free consultation"
        src={siteConfig.bookingUrl}
        loading="lazy"
        className="mt-4 min-h-[420px] w-full flex-1 rounded-lg border-0 bg-white"
      />
    </div>
  );
}
