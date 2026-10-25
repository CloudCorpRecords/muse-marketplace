// Muse Marketplace — zero-build site. Loads data.json (generated from registry/index.json),
// renders a searchable/filterable grid, and a detail view with an animated mode switcher.
const state = { data: null, kind: "", tag: "", query: "", current: null, mode: null };

const $ = (id) => document.getElementById(id);
const assetUrl = (listing, path) => `${listing.assetBase}${path}`;

function matches(l) {
  if (state.kind && l.kind !== state.kind) return false;
  if (state.tag && !l.tags.includes(state.tag)) return false;
  if (state.query) {
    const hay = [l.slug, l.name, l.description, l.longDescription, l.author.name, l.author.handle, ...l.tags].join(" ").toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function renderTags() {
  const tags = [...new Set(state.data.listings.flatMap((l) => l.tags))].sort();
  $("tag-filters").innerHTML = "";
  for (const t of tags) {
    const b = document.createElement("button");
    b.className = "chip" + (state.tag === t ? " active" : "");
    b.textContent = t;
    b.onclick = () => { state.tag = state.tag === t ? "" : t; render(); };
    $("tag-filters").appendChild(b);
  }
}

function render() {
  renderTags();
  const items = state.data.listings.filter(matches);
  $("count").textContent = `${items.length} of ${state.data.listings.length} listings`;
  $("empty").hidden = items.length > 0;
  const grid = $("grid");
  grid.innerHTML = "";
  for (const l of items) {
    const card = document.createElement("button");
    card.className = "card";
    card.innerHTML = `
      <img src="${assetUrl(l, l.preview.static)}" alt="${l.name} preview" loading="lazy">
      <div class="body">
        <h3>${l.name}</h3>
        <p>${l.description}</p>
        <div class="badges">
          <span class="badge kind">${l.kind}</span>
          <span class="badge">v${l.version}</span>
          <span class="badge ${l.safety.vetted ? "vetted" : "unvetted"}">${l.safety.vetted ? "✓ Vetted" : "○ Unvetted"}</span>
        </div>
      </div>`;
    card.onclick = () => openDetail(l);
    grid.appendChild(card);
  }
}

function openDetail(l) {
  state.current = l;
  state.mode = l.modes && l.modes.length ? l.modes[0].id : null;
  $("d-name").textContent = `${l.name}`;
  $("d-meta").textContent = `${l.kind} · v${l.version} · by ${l.author.name} (${l.author.handle}) · ${l.license} · ${l.safety.vetted ? "✓ Vetted" : "○ Unvetted"} · Muse ${l.compatibility.muse}`;
  $("d-long").textContent = l.longDescription;
  $("d-extra").textContent = [
    `Tags: ${l.tags.join(", ")}`,
    l.bundleContents ? `Bundle contents: ${l.bundleContents.join(", ")}` : null,
    `Safety: ${l.safety.notes}`,
  ].filter(Boolean).join("\n");
  $("d-install").textContent = `npx @reneturcios/muse-marketplace install ${l.slug}`;
  const tabs = $("d-modes");
  tabs.innerHTML = "";
  if (l.modes && l.modes.length) {
    for (const m of l.modes) {
      const b = document.createElement("button");
      b.textContent = m.label;
      b.className = m.id === state.mode ? "active" : "";
      b.setAttribute("role", "tab");
      b.onclick = () => { state.mode = m.id; setDetailImage(); [...tabs.children].forEach((c) => c.classList.toggle("active", c === b)); };
      tabs.appendChild(b);
    }
  } else {
    tabs.innerHTML = '<span class="meta">No modes — this is not an avatar listing.</span>';
  }
  setDetailImage();
  $("detail").hidden = false;
}

function setDetailImage() {
  const l = state.current;
  if (!l) return;
  const mode = (l.modes || []).find((m) => m.id === state.mode);
  $("d-img").src = assetUrl(l, mode ? mode.asset : l.preview.animated);
  $("d-img").alt = `${l.name}${mode ? " — " + mode.label + " mode" : ""} preview`;
}

$("d-close").onclick = () => { $("detail").hidden = true; };
$("detail").addEventListener("click", (e) => { if (e.target === $("detail")) $("detail").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("detail").hidden = true; });
$("d-copy").onclick = async () => {
  try { await navigator.clipboard.writeText($("d-install").textContent); $("d-copy").textContent = "Copied ✓"; }
  catch { $("d-copy").textContent = "Select + copy"; }
  setTimeout(() => { $("d-copy").textContent = "Copy"; }, 1600);
};
$("search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); render(); });
$("kind-filters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  state.kind = b.dataset.kind;
  [...$("kind-filters").children].forEach((c) => c.classList.toggle("active", c === b));
  render();
});

fetch("data.json")
  .then((r) => { if (!r.ok) throw new Error("data.json missing — run the generator (see README)"); return r.json(); })
  .then((data) => { state.data = data; render(); })
  .catch((err) => { $("count").textContent = `Could not load marketplace data: ${err.message}`; });
