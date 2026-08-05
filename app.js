const PLATFORM_LABELS = { linkedin: "LinkedIn", x: "X", blog: "Blog", podcast: "Podcast" };

const FILTERS = {
  all: () => true,
  linkedin: post => post.platform === "linkedin",
  x: post => post.platform === "x",
  press: post => post.platform === "blog" || post.platform === "podcast" || post.category === "press",
  event: post => post.category === "event",
};

const fmtTime = iso => iso
  ? new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    })
  : "";

const initials = name => name
  .split(/\s+/)
  .map(word => word[0])
  .filter(Boolean)
  .slice(0, 2)
  .join("")
  .toUpperCase() || "?";

const colorFor = id => {
  const score = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return score % 2 ? "var(--accent)" : "var(--accent-2)";
};

function renderCard(post, template) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".card");
  card.dataset.platform = post.platform;
  card.dataset.category = post.category;

  const avatar = node.querySelector(".card-avatar");
  if (post.avatar) {
    avatar.src = post.avatar;
    avatar.alt = post.author;
  } else {
    const fallback = document.createElement("span");
    fallback.className = "card-avatar card-avatar--initials";
    fallback.textContent = initials(post.author || "?");
    fallback.style.background = colorFor(post.id);
    fallback.setAttribute("aria-hidden", "true");
    avatar.replaceWith(fallback);
  }

  node.querySelector(".card-author").textContent = post.author || "Author unknown";
  node.querySelector(".card-headline").textContent = post.headline ?? "";
  node.querySelector(".card-time").textContent = fmtTime(post.posted);

  const platform = node.querySelector(".card-platform");
  platform.textContent = PLATFORM_LABELS[post.platform];
  platform.setAttribute("aria-label", `Platform: ${PLATFORM_LABELS[post.platform]}`);

  const text = node.querySelector(".card-text");
  text.textContent = post.text ?? post.hook ?? "";
  requestAnimationFrame(() => {
    if (text.scrollHeight > text.clientHeight + 2) {
      const button = document.createElement("button");
      button.className = "see-more";
      button.type = "button";
      button.textContent = "See more";
      button.addEventListener("click", () => {
        text.classList.add("expanded");
        button.remove();
      });
      text.after(button);
    }
  });

  const media = node.querySelector(".card-media");
  for (const src of post.images ?? []) {
    const image = document.createElement("img");
    image.src = src;
    image.loading = "lazy";
    image.alt = "";
    media.append(image);
  }
  if (!(post.images ?? []).length) media.remove();

  node.querySelector(".card-link").href = post.url;
  return node;
}

async function main() {
  let data;
  try {
    const response = await fetch("data/posts.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch {
    document.getElementById("feed").innerHTML =
      '<p class="error">Could not load the feed. See the source tracker in the <a href="https://docs.google.com/spreadsheets/d/1E4Oh808bMSPgEPbAT3A62KikYbjuc57fR98GOo6K-xU/">Google Sheet</a>.</p>';
    return;
  }

  const posts = [...data.posts].sort((a, b) =>
    (a.posted ?? "9999").localeCompare(b.posted ?? "9999")
  );

  document.getElementById("stat-posts").textContent = posts.length;
  document.getElementById("stat-press").textContent = posts.filter(FILTERS.press).length;

  const template = document.getElementById("card-template");
  const feed = document.getElementById("feed");
  const resultCount = document.getElementById("result-count");

  const draw = filter => {
    const selected = posts.filter(FILTERS[filter]);
    feed.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const post of selected) fragment.append(renderCard(post, template));
    feed.append(fragment);
    resultCount.textContent = `${selected.length} ${selected.length === 1 ? "item" : "items"}`;
  };

  draw("all");

  document.getElementById("filters").addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    document.querySelectorAll("#filters .chip").forEach(chip => {
      const active = chip === button;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    draw(button.dataset.filter);
  });
}

main();
