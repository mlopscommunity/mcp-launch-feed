# MCP Launch Week: the feed

A static archive of community posts, articles, and podcast coverage around the MCP 2026-07-28 specification release.

The site is plain HTML, CSS, and JavaScript. It has no build step, analytics, cookies, or external JavaScript. Google Fonts is the only external page request. Post data lives in `data/posts.json`, and any post assets referenced by the dataset must be stored locally under `assets/`.

## Run locally

From the repository root:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Validate the dataset with:

```sh
node scripts/check-data.mjs
```

## Update the archive

1. Add or update rows in the launch tracker Google Sheet.
2. Export the relevant fields into `data/posts.json` using the documented schema.
3. Revisit new source URLs in a signed-in browser, then add the verified author, headline, and full post text.
4. Cache any avatars or post images under `assets/` before referencing them. Never hotlink post media.
5. Run `node scripts/check-data.mjs`, review the site locally, and commit the changes.

The interface is intentionally framework-free so GitHub Pages can serve the repository root directly.
