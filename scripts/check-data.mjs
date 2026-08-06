import { readFileSync } from "node:fs";

const PLATFORMS = new Set(["linkedin", "x", "blog", "podcast"]);
const CATEGORIES = new Set(["event", "endorsement", "maintainer", "community", "press"]);

const { meta, posts } = JSON.parse(readFileSync("data/posts.json", "utf8"));
const impact = JSON.parse(readFileSync("data/impact.json", "utf8"));
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

if (!impact.meta?.as_of || !/^https:\/\//.test(impact.meta?.source ?? "")) {
  errors.push("impact meta.as_of/source missing");
}
if (impact.metrics?.length !== 7) errors.push("impact must contain seven headline metrics");
if (impact.events?.length !== 6) errors.push("impact must contain six event cities");
if (impact.virtual_event?.attendees !== "100+" || impact.virtual_event?.duration !== "4 hours") {
  errors.push("virtual event attendance/duration missing");
}
if (impact.cakes?.length !== 4 || impact.cakes.some(cake => !cake.image?.startsWith("assets/cakes/") || !cake.alt)) {
  errors.push("cake gallery must contain four local images with alt text");
}
if (impact.channels?.reduce((sum, channel) => sum + channel.posts, 0) !== 247) {
  errors.push("impact channel post totals must equal 247");
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${posts.length} stories, ${impact.metrics.length} metrics, ${impact.events.length} cities`);
