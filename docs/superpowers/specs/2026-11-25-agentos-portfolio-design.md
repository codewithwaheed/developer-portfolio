# AgentOS portfolio redesign

Date: 2026-11-25
Status: draft, awaiting approval

## Intent and why

Waheed's current portfolio (codewithwaheed.com) is a Gatsby 3 site built on a
widely used dev-portfolio template: dark navy, a scrolling single page. He wants a
portfolio that is flashy, memorable and clearly "AI", in the spirit of
matthisgarnier.com, where the whole site is an operating system you use rather
than a page you scroll.

The chosen concept is **AgentOS**: a made-up 2030 operating system where an AI
agent is the shell. Visitors can explore it like a desktop (icons, windows, a
menu bar) or tell the agent what they want and watch it move its own cursor,
open apps and arrange windows. The AI is how the site works, not a decoration,
and it doubles as proof of the AI work Waheed sells as a consultant.

Content stays essentially the same as today. Waheed will update copy later.

## Goals

- A desktop-OS experience that feels finished and detailed: boot, lock screen,
  menu bar, draggable windows, dock or icon grid, small surprises.
- An agent that visibly drives the UI (ghost cursor, `agent.log`, windows opening).
- A combined agent: scripted intents first, Gemini free tier for anything else.
- All existing content reachable: about, experience, featured and archive
  projects, blog posts (pensieve), consulting booking, contact, resume, socials.
- Works on phones as a phone-style OS, not a shrunken desktop.
- Recruiters can get the essentials fast (guided tour, classic view, resume).

## Non-goals

- New content or rewritten copy (later, by Waheed).
- A real general-purpose OS: no file system writes, no multi-user state.
- Accounts, sign-in or a CMS.
- Visitor analytics dashboards beyond a basic analytics tag.

## Anti-goals (would be a failure even if it works)

- Looks cheap or templated. It must feel expensive: Mac-level polish.
- A literal macOS copy: no Apple icons, Apple logo, traffic-light window buttons
  or Apple wallpapers. Same quality, own identity.
- The agent replies only with chat text. It must act on the desktop.
- A broken or empty site when the Gemini quota runs out.
- A Gemini API key reachable from the browser.
- Slow first load, or unusable on a phone.
- Content that search engines and screen readers can't reach.

## Constraints

- Gemini free tier only. Free limits are per project, reset at midnight Pacific,
  and have been cut sharply in 2026 (reports range from 1,500 down to 20
  requests per day depending on model). Design for roughly 20 to 250 per day.
- Free-tier prompts may be used by Google to improve its products. Visitor
  questions go to Google, so the prompt bar shows a short "powered by Gemini" note.
- Booking currently uses a Google Calendar appointment-schedule iframe. Real
  free slots are not available through an API we control, so `consult.cal`
  embeds that iframe inside an AgentOS window.
- Hosting moves from Netlify to **Vercel**. The Gemini route runs as a Vercel
  Function; the Gemini key and Supabase service key live only in Vercel
  environment variables.
- Server-side state lives in a **Supabase** (free tier Postgres) project. Free
  projects pause after about a week without requests, so a daily Vercel Cron
  job hits a small health route that queries Supabase to keep it awake.
- `prefers-reduced-motion` must be honoured (the current site already does this).

## Approaches considered

| Approach | Trade-off | Decision |
|---|---|---|
| **A. Next.js (App Router), React, Framer Motion** | Full rebuild, but app-like UI, the Gemini route and content live in one project; Vercel AI SDK has a Gemini provider with streaming and tool calls | **Chosen** |
| B. Astro with React islands | Great for a static classic view, but the desktop is one big interactive island, so Astro's strengths barely apply | Rejected |
| C. Upgrade Gatsby in place | Smallest change on paper, but Gatsby is barely maintained and the UI is rewritten anyway | Rejected |

Agent approaches considered: real AI only (best answers, quota and cost risk),
scripted only (free, but unusual questions dead-end), **combined** (chosen).

## Experience

### 1. Boot (about 3 seconds, skippable, skipped on return visits)
BIOS-style lines type out: `loading weights: waheed-1…`, `mounting projects/…`,
`agent ready`. Then a lock screen: name, title, live Lahore clock, "click to wake".

### 2. Desktop
- **Menu bar:** `◆ AgentOS` menu (about this OS, classic view, restart = replay
  boot), File, Agents, Memory, Help. Right side: clocks (Lahore plus one or two
  client time zones), agent status (`idle` / `thinking`), availability indicator
  in place of a battery (open for consulting / busy, set in config).
- **Icons and apps**, mapped from existing content:

| App | Source today | Behaviour |
|---|---|---|
| `me.md` | `src/components/sections/about.js`, `src/images/me.JPEG`, hero copy | Opens by default after wake |
| `experience.app` | `content/jobs/*` | Jobs as processes: name, uptime from `range`, status `running` / `exited 0`; click to expand bullets as log lines |
| `projects/` | `content/featured/*` and `content/projects/*` | Finder-like folder. Featured projects are `.app` files with cover image, description, tech, links. Archive in `projects/archive/`. Filter by tag (AI, blockchain, fintech, web) and by company |
| `consult.cal` | `src/components/sections/booking.js` | Window framing the Google Calendar appointment iframe plus the existing copy |
| `pensieve` | `content/posts/*` (skip `draft: true`) | Notes-style app: list on the left, rendered markdown on the right, code highlighting |
| `messages` / "Page Waheed" | `src/config.js` email and socials | Contact window: email, socials, short message |
| `resume.pdf` | `static/resume.pdf` | Preview window plus download |
| `terminal` | none | Easter egg with a few commands: `help`, `ls`, `cat me.md`, `open <app>`, `sudo hire waheed`, `clear` |
| Settings → Models and tools | skills list in `about.js` | Skills as installed tools with toggles; purely visual |

- **Windows:** draggable, focus brings to front, minimise and close, open/close
  animation. Desktop windows only, no resizing needed for v1.

### 3. The agent
- **Prompt bar** at the bottom; also opened with ⌘K / Ctrl+K. Suggested prompt
  chips under it when empty.
- **Ghost cursor** (accent colour) animates to icons, "clicks" them, opens and
  arranges windows. User input interrupts the agent at any time.
- **`agent.log` window** shows steps live: `✓ reading experience.app`, etc.
- **Replies:** short text in a reply bubble near the prompt bar, streamed, plus
  actions on the desktop.
- **Let the agent drive:** a one-click guided tour of about 60 seconds that
  opens me.md, experience, featured projects and consult.cal in turn.
- **Memory:** in-browser only (localStorage). Remembers which apps a visitor
  opened and suggests unseen ones. "Memory" menu can clear it.

### 4. Combined agent logic
1. **Scripted intents first.** Around 30 intents (who are you, experience, AI
   work, blockchain work, fintech work, hire you, contact, resume, blog, skills,
   tour, specific project names, specific companies…). Matching by keywords and
   simple fuzzy match on the client. A match runs a pre-written action plan
   instantly with no network call.
2. **Gemini fallback.** No match goes to a server route. It sends Gemini a system
   prompt containing the portfolio content (generated from the markdown at build
   time) and a fixed set of tools the agent can call:
   `open_app(id)`, `close_app(id)`, `filter_projects(tag|company)`,
   `open_project(id)`, `open_post(id)`, `start_tour()`, `say(text)`.
   The client executes returned tool calls with the same cursor animations as
   scripted plans. The model only answers about Waheed and his work; off-topic
   questions get a polite redirect.
3. **Quota protection** (state in Supabase, accessed only from the server route).
   - Per-visitor cap: 5 Gemini questions per visitor per 24 hours, enforced on
     the server by a salted hash of the IP (never the raw IP). The browser also
     tracks the cap so it can show the remaining count without a request.
   - Answer cache: normalised question text to Gemini response (text plus tool
     calls), reused for 24 hours.
   - Global daily ceiling configurable in env, set just under the model's free
     daily limit, so the site switches to scripted mode before Google errors.
   - Short max output length.
   - On quota errors (HTTP 429), ceiling reached, or any failure: the agent says,
     in character, that its "neural core is cooling down" and falls back to the
     scripted menu.
4. **Question log** (so Waheed can see what people ask and add scripted intents).
   Every prompt is logged: question text, matched intent or "gemini", whether it
   was served from cache, timestamp. No IP or identifier. Kept indefinitely for
   now; Waheed will add a retention rule later.
5. **Data tables (Supabase):** `rate_limits` (ip hash, count, window start),
   `answer_cache` (question key, response JSON, created at), `question_log`
   (as above). A daily `pg_cron` job removes rate-limit and cache rows older
   than 24 hours; the question log is not cleaned up. Row-level security on with
   no public policies; only the server route's service key can read or write.
6. **Security.** Keys only in server environment variables. No notice in the
   prompt bar (Waheed's decision).

### 5. Phones (width under 768px)
AgentOS Mobile: status bar, home screen grid of the same apps, each app opens
full-screen with a back gesture/button. The agent lives in a bottom sheet; the
ghost cursor becomes a highlight pulse on the icon it taps.

### 6. Classic view and accessibility
- `/classic`: a fast, plain, server-rendered page with all content (about,
  experience, projects, posts list, booking link, contact). Linked from the
  menu bar and the lock screen, and the target for search engines.
- Blog posts keep real URLs (`/pensieve/<slug>`) that render server-side and
  open inside AgentOS when visited in the OS.
- Keyboard: Tab through icons, Enter to open, Esc to close a window, ⌘K for
  the agent. Windows are labelled dialogs.
- Reduced motion: no boot animation, no cursor travel, windows appear instantly.

### 7. Look and feel: premium glass (Waheed: "expensive and rich")
- **Glass:** menu bar, windows, dock and prompt bar are frosted, translucent
  panels (backdrop blur and saturation, hairline light border, soft deep
  shadows) over a rich wallpaper.
- **Wallpaper:** a slowly drifting, blurred colour field (violet, blue, warm
  orange) that is AgentOS's own. It reacts subtly while the agent thinks.
- **Clean UI:** generous spacing, large rounded corners, restrained colour
  inside windows, one violet accent for the agent (cursor, prompt bar,
  thinking shimmer).
- **Dock:** floating glass dock with AgentOS's own gradient app icons and a
  springy magnify-on-hover. The desktop icon grid stays for files like
  `me.md` and `resume.pdf`.
- **Motion:** spring physics for windows opening, closing, minimising into the
  dock and the agent cursor; nothing linear.
- **Sound:** a small sound set (wake chime, window open and close, click, dock
  bounce, agent "thinking" tone, notification). Starts after the first click
  (browsers block earlier audio). Mute toggle in the menu bar, remembered per
  visitor. Muted automatically with reduced motion.
- **Fonts:** Geist Sans (or Inter Display) for everything visible, Geist Mono
  only for `agent.log`, terminal and code.
- **Light and dark:** both, following the visitor's system setting, each with
  its own wallpaper. Toggle in the menu bar.

## Decided by Waheed

- Concept: AgentOS (after rejecting conventional theme options as too basic).
- Agent: combined scripted plus Gemini, free Gemini tier.
- Stack: Next.js.
- Hosting: Vercel.
- Store: Supabase, including a log of visitor questions.

## Calls made in this design (Waheed to confirm or change)

- Question log keeps no IP; rate-limit and cache rows are deleted after 24
  hours.
- Light and dark themes in v1, and the sound set, to meet the premium look.
- A daily Vercel Cron ping keeps the free Supabase project from pausing.
- Default Gemini model: the Flash model with the best free-tier daily limit at
  build time; model ID in an environment variable so it can change.
- Per-visitor cap of 5 Gemini questions; memory stored only in the browser.
- Google Calendar iframe kept for booking instead of building a slot picker.
- Analytics: the current Universal Analytics ID (`UA-45666519-2`) no longer
  collects data since Google shut UA down; replace with GA4 or Netlify
  Analytics only if Waheed provides an ID. Otherwise no analytics in v1.
- `/classic` route and server-rendered blog URLs for SEO.
- `/` server-renders all core content (about, experience, featured projects,
  contact) as semantic HTML that the OS then takes over, so search engines and
  screen readers get the content on the homepage itself. `/` stays its own
  canonical page; `/classic` is a fallback view, not the SEO target.
- Project tags (AI, blockchain, fintech, web) and a `company` field for featured
  projects are added as new frontmatter fields. The builder proposes values,
  Waheed reviews them. This is the only content change in v1.
- Next.js replaces Gatsby in this repo on this branch; the old site stays in git
  history. Old URLs (`/archive`, `/pensieve/tags/*`) redirect to their new
  homes, and the old offline service worker (`gatsby-plugin-offline`) is
  unregistered so returning visitors don't keep a cached Gatsby site.
- Menu-bar client time zones ship as placeholders in config (for example NYC
  and London); Waheed sets the real ones.
- No window resizing in v1.

## Left to the builder

- Component structure, state management for the window manager, styling
  approach (Tailwind recommended), animation details.
- Exact intent list and keyword sets, beyond the categories above.
- Terminal command set beyond the listed ones.
- Exact boot copy, icon artwork, and how project screenshots are processed.
- How portfolio content is packed into the Gemini system prompt.
- Testing approach (unit tests for intent matching and the tool-call executor
  at minimum).
