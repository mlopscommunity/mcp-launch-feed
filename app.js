const PLATFORM_LABELS = { linkedin: "LinkedIn", x: "X", blog: "Blog", podcast: "Podcast" };

const FILTERS = {
  all: () => true,
  event: post => post.category === "event",
  technical: post => post.category === "maintainer" || (post.platform === "blog" && post.category !== "press"),
  community: post => post.category === "community" || post.category === "endorsement",
  press: post => post.category === "press" || post.platform === "podcast",
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
  return score % 2 ? "var(--accent)" : "var(--lavender)";
};

function renderImpact(impact) {
  document.getElementById("recap-source").href = impact.meta.source;

  document.getElementById("impact-metrics").replaceChildren(...impact.metrics.map((metric, index) => {
    const item = document.createElement("article");
    item.className = `metric metric-${index + 1}`;
    item.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span><small>${metric.detail}</small>`;
    return item;
  }));

  document.getElementById("event-grid").replaceChildren(...impact.events.map(event => {
    const item = document.createElement("article");
    item.className = "event-card";
    item.innerHTML = `
      <div class="event-card-head"><span>${event.city}</span><small>${event.venue}</small></div>
      <div class="event-numbers">
        <p><strong>${event.registrations.toLocaleString()}</strong><span>registrations</span></p>
        ${event.attendees ? `<p><strong>${event.attendees}</strong><span>attendees</span></p>` : `<p><strong>2</strong><span>events</span></p>`}
      </div>
      <p class="event-note">${event.note}</p>`;
    return item;
  }));

  document.getElementById("press-grid").replaceChildren(...impact.press.map(item => {
    const article = document.createElement("article");
    article.innerHTML = `<h4>${item.name}</h4><p>${item.description}</p>`;
    return article;
  }));

  document.getElementById("channel-table").replaceChildren(...impact.channels.map(channel => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${channel.name}</th><td>${channel.posts}</td><td>${channel.impressions}</td><td>${channel.engagements}</td><td>${channel.role}</td>`;
    return row;
  }));

  document.getElementById("phase2-grid").replaceChildren(...impact.phase2.map(item => {
    const article = document.createElement("article");
    article.innerHTML = `<span>${item.number}</span><div><h3>${item.title}</h3><p>${item.description}</p></div>`;
    return article;
  }));
}

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
      button.textContent = "Read more";
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

function setUpFeed(posts) {
  const ordered = [...posts].sort((a, b) =>
    (a.posted ?? "9999").localeCompare(b.posted ?? "9999")
  );
  const template = document.getElementById("card-template");
  const feed = document.getElementById("feed");
  const resultCount = document.getElementById("result-count");

  const draw = filter => {
    const selected = ordered.filter(FILTERS[filter]);
    const fragment = document.createDocumentFragment();
    for (const post of selected) fragment.append(renderCard(post, template));
    feed.replaceChildren(fragment);
    resultCount.textContent = `${selected.length} ${selected.length === 1 ? "story" : "stories"}`;
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

async function main() {
  try {
    const [postsResponse, impactResponse] = await Promise.all([
      fetch("data/posts.json"),
      fetch("data/impact.json"),
    ]);
    if (!postsResponse.ok || !impactResponse.ok) throw new Error("Data unavailable");
    const [{ posts }, impact] = await Promise.all([postsResponse.json(), impactResponse.json()]);
    renderImpact(impact);
    setUpFeed(posts);
  } catch {
    document.getElementById("impact-metrics").innerHTML = '<p class="error">The campaign data could not be loaded.</p>';
    document.getElementById("feed").innerHTML = '<p class="error">The launch feed could not be loaded.</p>';
  }
}

main();
