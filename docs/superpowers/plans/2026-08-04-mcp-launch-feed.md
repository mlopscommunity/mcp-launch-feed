# MCP Launch Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **EXCEPTION:** Task 2 (browser enrichment) MUST run in the main session — it drives the user's logged-in Chrome via the Control Chrome MCP, which subagents cannot share safely. Tasks 1, 3, 4, 5 are normal tasks.

**Goal:** A public GitHub Pages site that renders the MCP 2026-07-28 launch coverage (47 posts/blogs/podcast) as a three-column social-style feed with AAIF branding.

**Architecture:** Static site (index.html + styles.css + app.js) that fetches `data/posts.json` and renders cards client-side. Data is produced once: sheet export merged with browser-extracted post content; images cached locally in `assets/`. No framework, no build step.

**Tech Stack:** Vanilla HTML/CSS/JS, Node (for the data check script only), git + GitHub Pages. Browser extraction via Control Chrome MCP tools in the main session.

## Global Constraints

- Repo root: `/Users/demetrios/Documents/GitHub/mcp-launch-feed`
- No em dashes in any user-facing copy (user rule). Use commas, colons, periods.
- No emojis in page copy.
- Plain, grounded copy: no hype words, no "biggest launch ever" framing in OUR text (quotes from posts stay verbatim).
- No hashtag callout in the side panels (no #mcp728 promotion).
- AAIF branding: Instrument Sans (Google Fonts), black/white base, coral `#FF6B5E` and lilac `#C5B4E3` accents. Brand CSS reference exists at `~/carousels/logs-are-all-you-need/_brand/` (from MLOps brand memory; verify coral/lilac hex values against it and prefer its values if they differ).
- Final slide of AAIF materials rule does not apply here, but the right panel must say "Where the agentic stack is being built" with a link to https://aaif.io.
- No analytics, no cookies, no external JS. Google Fonts is the only external request.
- Light and dark theme via `prefers-color-scheme`.
- All post images and avatars served from local `assets/`, never hotlinked.

---

## File Structure

```
mcp-launch-feed/
├── index.html              # page shell: header, 3 columns, templates
├── styles.css              # all styling, both themes, responsive
├── app.js                  # fetch posts.json, render cards, filters
├── data/
│   └── posts.json          # the dataset (sheet export + enrichment)
├── assets/
│   ├── aaif-logo.svg       # brand logo
│   ├── avatars/<id>.jpg    # downloaded author avatars
│   └── images/<id>-1.jpg   # downloaded post images
├── scripts/
│   └── check-data.mjs      # validates posts.json shape; exits non-zero on bad data
└── docs/superpowers/...    # spec + this plan
```

---

### Task 1: Data schema, sheet export, and check script

**Files:**
- Create: `data/posts.json`
- Create: `scripts/check-data.mjs`

**Interfaces:**
- Produces: `data/posts.json` as `{ "meta": {...}, "posts": Post[] }` where `Post` is:

```jsonc
{
  "id": "katelyn-lesse",            // kebab-case slug, unique
  "author": "Katelyn Lesse",         // "" if unknown (to be resolved in Task 2)
  "headline": null,                  // author job title; null until enriched
  "avatar": null,                    // "assets/avatars/<id>.jpg" or null
  "platform": "linkedin",            // "linkedin" | "x" | "blog" | "podcast"
  "url": "https://www.linkedin.com/posts/...",
  "category": "endorsement",         // "event" | "endorsement" | "maintainer" | "community" | "press"
  "posted": "2026-07-28T22:49:00+02:00",  // ISO 8601 CET/CEST; null if unknown
  "hook": "Today marks the biggest upgrade to the MCP...", // from sheet col A quote or ""
  "text": null,                      // full post text; null until enriched
  "images": [],                      // ["assets/images/<id>-1.jpg", ...]
  "sparse": true                     // true until enrichment succeeds
}
```

- `meta`: `{ "title": "MCP Launch Week: the feed", "release_date": "2026-07-28", "generated": "<ISO date>" }`

**Steps:**

- [ ] **Step 1: Write `data/posts.json`** from the sheet contents already fetched (spreadsheet `1E4Oh808bMSPgEPbAT3A62KikYbjuc57fR98GOo6K-xU`, rows 2-48). Map columns: A → hook (the quoted part after the em dash, if any) and author name (the part before it), C → platform (lowercased; "Blog"→"blog", "Podcast"→"podcast", "X"→"x", "LinkedIn"→"linkedin"), D hyperlink formula → url (extract the first quoted URL from `=HYPERLINK("...","...")`), E → category (map: "Event promo"→"event", "Congrats / endorsement"→"endorsement", "Maintainer / contributor"→"maintainer", "Community"→"community", "Press / analyst"→"press"), F → posted (convert "2026-07-28 16:31" to "2026-07-28T16:31:00+02:00"; the sheet header says CET/CEST and all dates are July/August, so +02:00 throughout; date-only values like the podcast get "T00:00:00+02:00"; the "~2026-07-28 to 07-31" blog gets "2026-07-29T12:00:00+02:00" as a placed estimate). Unknown-author rows ("X post — author to confirm", "MCP728 (author unclear)", "LinkedIn post — author/content to confirm") get `author: ""` and ids `x-unknown-1`, `x-unknown-2`, `mcp728-page`, `li-unknown-1`. All rows start `"sparse": true`, `"text": null`, `"headline": null`, `"avatar": null`, `"images": []`.

- [ ] **Step 2: Write `scripts/check-data.mjs`:**

```js
import { readFileSync } from "node:fs";

const PLATFORMS = new Set(["linkedin", "x", "blog", "podcast"]);
const CATEGORIES = new Set(["event", "endorsement", "maintainer", "community", "press"]);

const { meta, posts } = JSON.parse(readFileSync("data/posts.json", "utf8"));
const errors = [];

if (!meta?.title || !meta?.release_date) errors.push("meta.title/release_date missing");

const ids = new Set();
for (const p of posts) {
  const where = p.id ?? JSON.stringify(p).slice(0, 60);
  if (!p.id) errors.push(`missing id: ${where}`);
  if (ids.has(p.id)) errors.push(`duplicate id: ${p.id}`);
  ids.add(p.id);
  if (!PLATFORMS.has(p.platform)) errors.push(`${where}: bad platform ${p.platform}`);
  if (!CATEGORIES.has(p.category)) errors.push(`${where}: bad category ${p.category}`);
  if (!/^https?:\/\//.test(p.url ?? "")) errors.push(`${where}: bad url`);
  if (p.posted !== null && isNaN(Date.parse(p.posted))) errors.push(`${where}: bad posted ${p.posted}`);
  if (p.sparse === false && !p.text) errors.push(`${where}: enriched but no text`);
  for (const img of p.images ?? []) {
    if (!img.startsWith("assets/")) errors.push(`${where}: non-local image ${img}`);
  }
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${posts.length} posts`);
```

- [ ] **Step 3: Run it, expect failure-free output**

Run: `node scripts/check-data.mjs`
Expected: `OK: 47 posts`
If it errors, fix `posts.json` until clean.

- [ ] **Step 4: Commit**

```bash
git add data/posts.json scripts/check-data.mjs
git commit -m "feat: add posts dataset from launch tracker sheet with validation script"
```

---

### Task 2: Browser enrichment (MAIN SESSION ONLY)

**Files:**
- Modify: `data/posts.json` (fill text, headline, avatar, images, sparse=false)
- Create: `assets/avatars/*.jpg`, `assets/images/*.jpg`

**Interfaces:**
- Consumes: `data/posts.json` from Task 1.
- Produces: the same file with enriched posts. No schema change: enrichment only fills nulls and flips `sparse`.

**Procedure (repeat per post, LinkedIn first, ~40 posts):**

- [ ] **Step 1: Confirm Chrome session.** Use Control Chrome MCP: `get_current_tab`. Ask the user to be logged into LinkedIn if not already. Do NOT log in on their behalf (credential rule).

- [ ] **Step 2: For each LinkedIn post:** `open_url` the post URL → `get_page_content`. Extract: full post text (strip "…see more" artifacts and trailing "Like Comment Share" chrome), author name (verify against sheet), author headline (the line under the name), and note any image. For avatar and image URLs run `execute_javascript`:

```js
JSON.stringify({
  avatar: document.querySelector(".update-components-actor__avatar-image, img[class*='EntityPhoto']")?.src ?? null,
  images: [...document.querySelectorAll(".update-components-image img, .feed-shared-update-v2 img[class*='update-components-image']")].map(i => i.src)
})
```

Selectors WILL drift; if they return null, fall back to reading likely `img` tags and judge by URL (media.licdn.com) and size. Download each found URL with `curl -o assets/avatars/<id>.jpg "<url>"` (these CDN URLs work without auth once you have them; verify file is a real image with `file assets/avatars/<id>.jpg`, delete if HTML).

- [ ] **Step 3: X posts (2):** `open_url` → read author handle and text if visible without login. If a login wall blocks it, leave sparse and move on.

- [ ] **Step 4: Blogs + podcast (3):** fetch with WebFetch (no browser needed): aaif.io post, simonwillison.net post, packetpushers.net episode page. Store title as `hook`, first ~2 paragraphs as `text`, `sparse: false`, no avatar needed (render initials).

- [ ] **Step 5: After each batch of ~10, update `posts.json`** and run `node scripts/check-data.mjs` (expect `OK: 47 posts`), then commit:

```bash
git add data/posts.json assets/
git commit -m "data: enrich posts batch N"
```

- [ ] **Step 6: Resolve sheet unknowns.** Whatever was learned about the unknown-author rows, write author/hook back to the Google Sheet via the GoogleSheets_UpdateCells tool, and update `posts.json` ids/authors to match. Propose the exact cell updates to the user before writing (sheet write requires their OK).

- [ ] **Step 7: Final tally.** Report enriched vs sparse counts to the user (target: all LinkedIn posts enriched; X posts best-effort).

---

### Task 3: Static site markup and styling

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `assets/aaif-logo.svg` (copy from `~/carousels/logs-are-all-you-need/_brand/`; if absent there, recreate from the Figma brand file per the MLOps brand memory)

**Interfaces:**
- Consumes: nothing at runtime yet (app.js comes in Task 4).
- Produces: DOM contract for Task 4: `#feed` (card container), `#filters` (chip container with `button[data-filter]` children: values `all|linkedin|x|press|event`), `#stat-posts`, `#stat-cities`, `#stat-press` (stat number slots), `<template id="card-template">` with slots `.card-avatar`, `.card-author`, `.card-headline`, `.card-platform`, `.card-time`, `.card-text`, `.card-media`, `.card-link`.

**Steps:**

- [ ] **Step 1: Write `index.html`.** Structure:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MCP Launch Week: the feed</title>
  <meta name="description" content="The posts, blogs, and podcasts the community created for the MCP release of July 28, 2026.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <img src="assets/aaif-logo.svg" alt="Agentic AI Foundation" class="logo">
    <h1>MCP Launch Week: the feed</h1>
  </header>
  <main class="layout">
    <aside class="panel panel-left">
      <h2>The release</h2>
      <!-- release copy: 2026-07-28 spec release, stateless MCP headline,
           3-4 what-changed bullets, links to modelcontextprotocol.io blog,
           the spec, and https://aaif.io/blog/mcp-is-growing-up/ -->
    </aside>
    <section class="feed-col">
      <nav id="filters" aria-label="Filter posts">
        <button data-filter="all" class="chip active">All</button>
        <button data-filter="linkedin" class="chip">LinkedIn</button>
        <button data-filter="x" class="chip">X</button>
        <button data-filter="press" class="chip">Blogs and press</button>
        <button data-filter="event" class="chip">Events</button>
      </nav>
      <div id="feed" aria-live="polite"></div>
    </section>
    <aside class="panel panel-right">
      <h2>How the community showed up</h2>
      <div class="stats">
        <div class="stat"><span id="stat-posts">–</span><label>posts and articles</label></div>
        <div class="stat"><span id="stat-cities">5</span><label>cities with release events</label></div>
        <div class="stat"><span id="stat-press">–</span><label>blogs, podcasts, and press</label></div>
      </div>
      <!-- mini timeline: Jul 27 pre-launch buzz / Jul 28 launch day /
           Jul 28-29 release parties in SF, Seattle, NY, Amsterdam, London /
           Jul 31+ analyst deep dives -->
      <p class="tagline">Agentic AI Foundation: where the agentic stack is being built. <a href="https://aaif.io">aaif.io</a></p>
    </aside>
  </main>
  <template id="card-template">
    <article class="card">
      <div class="card-head">
        <img class="card-avatar" alt="">
        <div>
          <span class="card-author"></span>
          <span class="card-headline"></span>
          <span class="card-time"></span>
        </div>
        <span class="card-platform" aria-label=""></span>
      </div>
      <p class="card-text"></p>
      <div class="card-media"></div>
      <a class="card-link" target="_blank" rel="noopener">View original</a>
    </article>
  </template>
  <script src="app.js"></script>
</body>
</html>
```

Fill the two comment blocks with real copy (plain style, no em dashes, no hype). Release bullets: stateless operation as the headline change, plus 2-3 other spec changes verified from the official release notes at the time of writing; link each claim to its source.

- [ ] **Step 2: Write `styles.css`.** Requirements:
  - CSS vars in `:root`: `--bg`, `--card-bg`, `--text`, `--muted`, `--accent` (coral), `--accent-2` (lilac), `--border`; dark overrides inside `@media (prefers-color-scheme: dark)`.
  - `body { font-family: "Instrument Sans", system-ui, sans-serif; }`
  - `.layout`: `display: grid; grid-template-columns: 280px minmax(0,1fr) 300px; gap: 24px; max-width: 1200px; margin: 0 auto; padding: 24px;`
  - `.panel { position: sticky; top: 24px; align-self: start; }`
  - `.card`: white/dark card, 12px radius, 1px border, 16px padding, 16px gap between cards. `.card-avatar`: 48px circle. Avatar fallback class `.card-avatar--initials` (colored circle with initials, background alternates accent/accent-2 by id hash).
  - `.card-text` clamped: `display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;` with `.expanded { -webkit-line-clamp: unset; }`; a `.see-more` button styled as a link.
  - `.chip`: pill buttons; `.chip.active { background: var(--accent); color: #fff; }`
  - Responsive: `@media (max-width: 980px)` → `grid-template-columns: 1fr`, order: left panel, feed, right panel; panels not sticky.
  - `.card img, .card-media img { max-width: 100%; border-radius: 8px; }`

- [ ] **Step 3: Visual check.** Serve locally: `python3 -m http.server 8080` and open `http://localhost:8080` via the Claude Browser preview. The page will show empty feed (app.js not written): verify header, both panels, fonts, both themes (`resize_window` with `colorScheme: "dark"`), and mobile at 375px width.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css assets/aaif-logo.svg
git commit -m "feat: page shell, three-column layout, AAIF styling"
```

---

### Task 4: Feed rendering and filters

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes: DOM contract from Task 3; `data/posts.json` shape from Task 1.
- Produces: the working page.

**Steps:**

- [ ] **Step 1: Write `app.js`:**

```js
const PLATFORM_LABELS = { linkedin: "LinkedIn", x: "X", blog: "Blog", podcast: "Podcast" };

// filter chip -> predicate. "press" and "event" cut across platforms/categories.
const FILTERS = {
  all: () => true,
  linkedin: p => p.platform === "linkedin",
  x: p => p.platform === "x",
  press: p => p.platform === "blog" || p.platform === "podcast" || p.category === "press",
  event: p => p.category === "event",
};

const fmtTime = iso => iso
  ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })
  : "";

const initials = name => name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

function renderCard(p, tpl) {
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector(".card");
  card.dataset.platform = p.platform;
  card.dataset.category = p.category;

  const avatar = node.querySelector(".card-avatar");
  if (p.avatar) { avatar.src = p.avatar; avatar.alt = p.author; }
  else {
    const span = document.createElement("span");
    span.className = "card-avatar card-avatar--initials";
    span.textContent = initials(p.author || "?");
    avatar.replaceWith(span);
  }

  node.querySelector(".card-author").textContent = p.author || "Author unknown";
  node.querySelector(".card-headline").textContent = p.headline ?? "";
  node.querySelector(".card-time").textContent = fmtTime(p.posted);
  const plat = node.querySelector(".card-platform");
  plat.textContent = PLATFORM_LABELS[p.platform];
  plat.setAttribute("aria-label", PLATFORM_LABELS[p.platform]);

  const textEl = node.querySelector(".card-text");
  textEl.textContent = p.text ?? p.hook ?? "";
  // add see-more only if clamped; check after insertion via requestAnimationFrame
  requestAnimationFrame(() => {
    if (textEl.scrollHeight > textEl.clientHeight + 2) {
      const btn = document.createElement("button");
      btn.className = "see-more";
      btn.textContent = "see more";
      btn.onclick = () => { textEl.classList.add("expanded"); btn.remove(); };
      textEl.after(btn);
    }
  });

  const media = node.querySelector(".card-media");
  for (const src of p.images ?? []) {
    const img = document.createElement("img");
    img.src = src; img.loading = "lazy"; img.alt = "";
    media.append(img);
  }
  if (!(p.images ?? []).length) media.remove();

  node.querySelector(".card-link").href = p.url;
  return node;
}

async function main() {
  let data;
  try {
    data = await (await fetch("data/posts.json")).json();
  } catch {
    document.getElementById("feed").innerHTML =
      '<p class="error">Could not load the feed. See the source tracker: <a href="https://docs.google.com/spreadsheets/d/1E4Oh808bMSPgEPbAT3A62KikYbjuc57fR98GOo6K-xU/">Google Sheet</a></p>';
    return;
  }
  const posts = [...data.posts].sort((a, b) => (a.posted ?? "9999") < (b.posted ?? "9999") ? -1 : 1);

  document.getElementById("stat-posts").textContent = posts.length;
  document.getElementById("stat-press").textContent =
    posts.filter(FILTERS.press).length;

  const tpl = document.getElementById("card-template");
  const feed = document.getElementById("feed");
  const draw = filter => {
    feed.replaceChildren();
    for (const p of posts.filter(FILTERS[filter])) feed.append(renderCard(p, tpl));
  };
  draw("all");

  document.getElementById("filters").addEventListener("click", e => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    document.querySelectorAll("#filters .chip").forEach(c => c.classList.toggle("active", c === btn));
    draw(btn.dataset.filter);
  });
}

main();
```

- [ ] **Step 2: Verify in browser.** With `python3 -m http.server 8080` running, reload the preview. Check: all 47 cards render, chronological order (Craig McLuckie's Jul 27 post near top), each filter chip shows a sensible subset and counts, sparse cards render hook + "Author unknown" where applicable, see-more expands long posts, images load, no console errors (`read_console_messages`).

- [ ] **Step 3: Spot-check fidelity.** Pick 5 enriched cards, compare text against the live posts (already open from Task 2 or reopen), confirm no truncation or chrome text ("Like Comment Share") leaked in.

- [ ] **Step 4: Mobile + dark check.** `resize_window` mobile preset and dark scheme; verify stacking order and readability.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: render feed cards with filters from posts.json"
```

---

### Task 5: Deploy to GitHub Pages

**Files:**
- Create: `README.md` (what this is, how data was collected, how to update: edit sheet → rerun enrichment for new rows → commit posts.json)
- Create: `.nojekyll` (empty file so Pages serves as-is)

**Steps:**

- [ ] **Step 1: Ask the user** whether the repo goes under `mlopscommunity` or their personal GitHub account, and confirm the name `mcp-launch-feed`. (Left open in the spec.)

- [ ] **Step 2: Write `README.md` and `.nojekyll`, commit.**

```bash
git add README.md .nojekyll
git commit -m "docs: readme and pages config"
```

- [ ] **Step 3: Create repo and push** (public repo; confirm with user before pushing since it publishes the content):

```bash
gh repo create <owner>/mcp-launch-feed --public --source . --push
```

- [ ] **Step 4: Enable Pages on main root:**

```bash
gh api repos/<owner>/mcp-launch-feed/pages -X POST -f 'source[branch]=main' -f 'source[path]=/'
```

Expected: JSON response with `"status"`; site at `https://<owner>.github.io/mcp-launch-feed/` within a few minutes.

- [ ] **Step 5: Verify the live URL** in the browser preview: cards, images, filters, dark mode. Confirm `data/posts.json` and assets load over Pages (paths are relative, so they should).

- [ ] **Step 6: Send the user the link.**

---

## Self-review notes

- Spec coverage: sheet export (T1), enrichment + write-back + graceful degradation (T2), three-column page, branding, themes, mobile (T3), feed, filters, stats, error fallback (T4), deploy + README update path (T5). Timeline and release copy are inside T3 Step 1.
- Types consistent: `Post` shape defined once in T1 and consumed unchanged in T2/T4; DOM contract defined in T3 and consumed in T4.
- Known judgment points left explicit: LinkedIn DOM selectors will drift (T2 Step 2 fallback), X posts are best-effort, repo owner asked in T5 Step 1.
