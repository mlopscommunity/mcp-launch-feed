# MCP Launch Feed — Design

**Date:** 2026-08-04
**Status:** Approved by Demetrios

## What we are building

A public, standalone web page that looks like a social media "for you" feed. It shows all the social posts, blog posts, and podcast coverage created for the MCP spec release of 2026-07-28. The page tells two stories at once: what shipped, and how the community showed up for it.

Source data: the "MCP Launch — Social Shares" Google Sheet
(`1E4Oh808bMSPgEPbAT3A62KikYbjuc57fR98GOo6K-xU`), currently 47 entries:
LinkedIn posts, X posts, two blogs (Angie Jones on aaif.io, Simon Willison), and one podcast episode.

## Decisions made

- **Audience and home:** public standalone page, shared as a link. Hosted on GitHub Pages.
- **Content approach:** native cards rendered from extracted data, not embeds and not screenshots.
- **Data collection:** use Demetrios' logged-in Chrome via browser automation to open each post URL and extract the real post text, author details, avatar, and images.
- **Layout:** three-column, like LinkedIn. Center scroll feed, sticky context panels left and right.
- **No hashtag callout** in the panels (no #mcp728 promotion).
- **Branding:** AAIF. Instrument Sans, black/white base with coral/lilac accents, AAIF logo, "Where the agentic stack is being built."
- **Hosting:** new GitHub repo `mcp-launch-feed`, GitHub Pages from main.

## Part 1: Data pipeline

One repo containing the collected data and the static site. Enrichment is a one-time batch, not a live pipeline.

1. **Sheet export.** Export the Google Sheet once into `data/posts.json`. Fields per post: id, author, platform, url, category, posted timestamp, hook/title, notes.
2. **Browser enrichment.** Using the logged-in Chrome session, visit each of the ~45 social post URLs and extract:
   - full post text
   - author headline (job title)
   - author avatar URL
   - post image(s), if any
   Merge into `posts.json`. Download avatars and images into `assets/` so the page never hotlinks LinkedIn's CDN (those URLs expire).
3. **Blogs and podcast.** Fetch normally (no browser needed). Cards get title + excerpt + link.
4. **Graceful degradation.** Any post that cannot be read (X login walls, deleted posts) keeps a sparse card: author, hook line from the sheet, platform icon, link out.
5. **Write-back.** Findings that resolve the sheet's unknowns (the two mystery X posts, the raw LinkedIn activity URL, hashtag-led posts with no hook captured) get written back to the Google Sheet so the tracker is fixed too.
6. **Updates.** If new posts are added to the sheet later, rerun the enrichment for just the new rows and commit the updated `posts.json`.

## Part 2: The page

Plain static site: one HTML file, one CSS file, one JS file that fetches and renders `posts.json`. No framework, no build step.

### Desktop layout (three columns)

- **Left panel (sticky): "The release."**
  - What shipped on 2026-07-28, with stateless MCP as the headline change
  - Short what-changed bullet list
  - Links: official MCP blog post, the spec, Angie Jones' aaif.io post
- **Center: the feed.**
  - Single column of post cards, ordered chronologically so scrolling replays launch week: pre-launch buzz, launch day, party recaps, analyst deep-dives
  - Filter chips at top: All, LinkedIn, X, Blogs/Press, Events
  - Card contents: avatar, author name, author headline, platform icon, timestamp, full post text (line-clamped with a "see more" expander), post image if present, "View original" link
  - Sparse cards (failed extraction) show author, hook line, platform icon, link out
- **Right panel (sticky): "How the community showed up."**
  - Stat blocks computed from the data: total posts, release-party cities (SF, Seattle, NY, Amsterdam, London), blog/podcast/press counts
  - Mini launch-week timeline
  - AAIF tagline and link to aaif.io

### Mobile

Panels stack: release context on top, feed below, community stats at the bottom (collapsible sections). Cards go full width.

### Details

- Light and dark theme via `prefers-color-scheme`
- No analytics, no cookies
- Page title: "MCP Launch Week: the feed" (working title)

## Error handling

- Extraction failures fall back to sparse cards; the page never renders a broken card.
- Missing avatar: render initials in a colored circle.
- Missing image: card is text-only.
- `posts.json` fetch failure: page shows a plain error message with a link to the Google Sheet.

## Testing

- Verify `posts.json` validates against the expected shape (a small check script).
- Open the page locally and confirm: all posts render, filters work, both themes look right, mobile layout stacks correctly.
- Spot-check ~5 cards against the original posts for text fidelity.
- After deploy, check the GitHub Pages URL on desktop and phone.

## Out of scope (YAGNI)

- Live syncing from the sheet or from social platforms
- Like/comment counts (unreliable to capture, immediately stale)
- Search, infinite-scroll virtualization, or pagination (45 posts render fine at once)
- CMS or admin UI
