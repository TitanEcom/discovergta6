/* Builds one indexable English HTML page per wiki entry. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const ORIGIN = "https://discovergta6.com";

function absolute(urlPath) {
  if (!urlPath || urlPath.startsWith("http")) return urlPath;
  return ORIGIN + urlPath;
}
const idMap = {
  verhaal: "story",
  botenwerf: "brians-boatyard",
  "duo-spelen": "switching",
  relatie: "relationship",
  lichaam: "body",
  weer: "weather",
  inwoners: "residents",
  "vrije-tijd": "free-time",
  "pc-versie": "pc",
  standaard: "standard-edition",
  "n-2022-dev": "development-confirmed",
  "n-2023-trailer": "first-trailer",
  "n-2025-trailer2": "second-trailer",
  "n-2025-delay": "release-date-november",
  "n-2026-editions": "cover-and-editions",
  "n-2026-preorder": "pre-orders-open",
  "n-2026-extended": "extended-look",
  "n-2026-album": "the-album",
  "n-2026-radio": "radio-preview",
  "n-2026-launch": "launch-trailer",
  "n-2026-preload": "preload",
  "n-2026-release": "release-day"
};

const folders = {
  personage: "characters",
  locatie: "locations",
  zaak: "businesses",
  voertuig: "vehicles",
  wapen: "weapons",
  radio: "radio",
  systeem: "gameplay",
  editie: "editions",
  nieuws: "news"
};

const sectionFor = {
  personage: ["/characters", "Characters", "characters"],
  locatie: ["/locations", "Locations", "locations"],
  zaak: ["/locations#businesses", "Businesses", "locations"],
  voertuig: ["/vehicles", "Vehicles", "vehicles"],
  wapen: ["/vehicles#weapons", "Weapons", "vehicles"],
  radio: ["/radio", "Radio", "radio"],
  systeem: ["/gameplay", "Gameplay", "gameplay"],
  editie: ["/editions", "Editions", "editions"],
  nieuws: ["/news", "News", "news"]
};

const pageMap = [
  ["/personages", "/characters"],
  ["/locaties", "/locations"],
  ["/voertuigen", "/vehicles"],
  ["/edities", "/editions"],
  ["/nieuws", "/news"],
  ["/archief", "/archive"],
  ["/bronnen", "/sources"],
  ["/voorwaarden", "/terms"]
];

const navMap = {
  personages: "characters",
  locaties: "locations",
  voertuigen: "vehicles",
  edities: "editions",
  nieuws: "news",
  archief: "archive",
  bronnen: "sources",
  voorwaarden: "terms"
};

const hubRename = {
  "personages.html": "characters.html",
  "locaties.html": "locations.html",
  "voertuigen.html": "vehicles.html",
  "edities.html": "editions.html",
  "nieuws.html": "news.html",
  "archief.html": "archive.html",
  "bronnen.html": "sources.html",
  "voorwaarden.html": "terms.html"
};

const hubCanonical = {
  "index.html": "/",
  "characters.html": "/characters",
  "locations.html": "/locations",
  "vehicles.html": "/vehicles",
  "editions.html": "/editions",
  "news.html": "/news",
  "archive.html": "/archive",
  "sources.html": "/sources",
  "terms.html": "/terms",
  "privacy.html": "/privacy",
  "radio.html": "/radio",
  "media.html": "/media",
  "gameplay.html": "/gameplay",
  "contact.html": "/contact"
};

function renameIds(text) {
  const pairs = Object.entries(idMap).sort((a, b) => b[0].length - a[0].length);
  for (const [oldId, newId] of pairs) {
    text = text.split(`"${oldId}"`).join(`"${newId}"`);
    const key = newId.includes("-") ? `"${newId}"` : newId;
    const re = new RegExp(`(^|[\\s{,])${oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "g");
    text = text.replace(re, `$1${key}:`);
  }
  return text;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function extractValue(src, name) {
  const token = `const ${name} = `;
  const start = src.indexOf(token);
  if (start < 0) throw new Error(`missing ${name}`);
  let i = start + token.length;
  let depth = 0;
  let started = false;
  let inStr = false;
  let quote = "";
  for (let end = i; end < src.length; end += 1) {
    const c = src[end];
    if (inStr) {
      if (c === "\\") {
        end += 1;
        continue;
      }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = true;
      quote = c;
      continue;
    }
    if (c === "{" || c === "[") {
      depth += 1;
      started = true;
    } else if (c === "}" || c === "]") {
      depth -= 1;
      if (started && depth === 0) return src.slice(i, end + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

function sortItems(list, mode) {
  const copy = list.slice();
  if (mode === "nieuws") {
    copy.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return copy;
  }
  const typeRank = { personage: 1, locatie: 2, zaak: 3, voertuig: 4, wapen: 5, radio: 6, systeem: 7, editie: 8, nieuws: 9 };
  if (mode === "all" || mode === "mixed") {
    copy.sort((a, b) => (typeRank[a.type] || 50) - (typeRank[b.type] || 50) || (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name, "en"));
    return copy;
  }
  copy.sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name, "en"));
  return copy;
}

function formatDate(item) {
  if (item.dateLabel) return item.dateLabel;
  if (!item.date) return item.status || "";
  const [year, month, day] = item.date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

fs.writeFileSync(path.join(root, "js", "data.js"), renameIds(fs.readFileSync(path.join(root, "js", "data.js"), "utf8")));
fs.writeFileSync(path.join(root, "js", "site.js"), renameIds(fs.readFileSync(path.join(root, "js", "site.js"), "utf8")));

const dataSrc = fs.readFileSync(path.join(root, "js", "data.js"), "utf8");
const siteSrc = fs.readFileSync(path.join(root, "js", "site.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(dataSrc, context);
const entries = context.window.ENTRIES;
const photos = vm.runInNewContext(`(${extractValue(siteSrc, "photos")})`);
const focusFor = vm.runInNewContext(`(${extractValue(siteSrc, "focusFor")})`);
const zoomFor = vm.runInNewContext(`(${extractValue(siteSrc, "zoomFor")})`);
const fallbacks = vm.runInNewContext(`(${extractValue(siteSrc, "fallbacks")})`);

function art(file) {
  return `https://www.rockstargames.com/VI/_next/static/media/${file}?akim=1&imdensity=1&imwidth=1400`;
}

function stillFor(id) {
  if (photos[id]) return art(photos[id]);
  let index = 0;
  const key = String(id || "");
  for (let i = 0; i < key.length; i += 1) index = (index + key.charCodeAt(i)) % fallbacks.length;
  return art(fallbacks[index]);
}

function entryPath(item) {
  return `/${folders[item.type] || "archive"}/${item.id}`;
}

const pathById = {};
entries.forEach((item) => {
  pathById[item.id] = entryPath(item);
});

function card(item) {
  const meta = item.type === "nieuws" ? formatDate(item) : item.status;
  const image = stillFor(item.id);
  const focus = focusFor[item.id] || item.focus || "center";
  const zoom = zoomFor[item.id] || "cover";
  return `<a class="card" href="${esc(entryPath(item))}">
      <span class="card-media" style="background-image:url('${esc(image)}');background-position:${esc(focus)};background-size:${esc(zoom)}"></span>
      <span class="card-body">
        <span class="kicker">${esc(item.typeLabel)} · ${esc(meta)}</span>
        <strong>${esc(item.name)}</strong>
        <em>${esc(item.summary)}</em>
      </span>
    </a>`;
}

function rewriteLinks(html) {
  let next = html;
  next = next.replace(/\/artikel\?id=([a-z0-9-]+)/g, (_, id) => {
    const mapped = idMap[id] || id;
    if (!pathById[mapped]) throw new Error(`no path for ${id}`);
    return pathById[mapped];
  });
  for (const [from, to] of pageMap) next = next.split(from).join(to);
  for (const [from, to] of Object.entries(navMap)) {
    next = next.split(`data-nav="${from}"`).join(`data-nav="${to}"`);
    next = next.split(`data-navlink="${from}"`).join(`data-navlink="${to}"`);
  }
  next = next.replace(/href="css\//g, 'href="/css/');
  next = next.replace(/href="favicon\.svg"/g, 'href="/favicon.svg"');
  next = next.replace(/src="js\//g, 'src="/js/');
  next = next.replace(/<noscript><p>Turn on JavaScript to load[^<]*<\/p><\/noscript>\s*/g, "");
  next = next.replace('<h2 style="margin-top:2.6rem">Businesses</h2>', '<h2 id="businesses" style="margin-top:2.6rem">Businesses</h2>');
  next = next.replace('<h2 style="margin-top:2.4rem">Weapons</h2>', '<h2 id="weapons" style="margin-top:2.4rem">Weapons</h2>');
  return next;
}

function decorateHead(html, canonical, robots) {
  if (!html.includes('name="robots"')) {
    html = html.replace("</title>", `</title>\n  <meta name="robots" content="${robots}">\n  <link rel="canonical" href="${absolute(canonical)}">`);
  }
  return html;
}

function fillCatalogs(html) {
  return html.replace(/<div class="catalog"([^>]*)>\s*<\/div>/g, (full, attrs) => {
    const home = /data-home="([^"]+)"/.exec(attrs);
    const catalog = /data-catalog="([^"]+)"/.exec(attrs);
    let items = [];
    if (home) {
      const limit = Number((/data-limit="(\d+)"/.exec(attrs) || [])[1] || 6);
      const skip = Number((/data-skip="(\d+)"/.exec(attrs) || [])[1] || 0);
      items = sortItems(entries.filter((item) => item.type === home[1]), home[1]).slice(skip, skip + limit);
    } else if (catalog) {
      const types = catalog[1].split(",").map((part) => part.trim());
      const matched = entries.filter((item) => types.includes("all") || types.includes(item.type));
      const mode = types.includes("all") ? "all" : (types.length === 1 ? types[0] : "mixed");
      items = sortItems(matched, mode);
    } else {
      return full;
    }
    return `<div class="catalog"${attrs}>${items.map(card).join("")}</div>`;
  });
}

const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith(".html") && name !== "artikel.html");
const written = new Map();
for (const name of htmlFiles) {
  let html = rewriteLinks(fs.readFileSync(path.join(root, name), "utf8"));
  const target = hubRename[name] || name;
  const canonical = hubCanonical[target];
  if (target === "404.html") html = decorateHead(html, "/404", "noindex");
  else if (canonical) html = decorateHead(html, canonical, "index, follow");
  written.set(target, html);
}
for (const name of Object.keys(hubRename)) fs.unlinkSync(path.join(root, name));
if (fs.existsSync(path.join(root, "artikel.html"))) fs.unlinkSync(path.join(root, "artikel.html"));

const shell = written.get("characters.html");
const headEnd = shell.indexOf("</head>");
const bodyStart = shell.indexOf("<body");
const mainStart = shell.indexOf("<main");
const footerStart = shell.indexOf("<footer");
const head = shell.slice(0, headEnd);
const header = shell.slice(bodyStart, mainStart);
const footer = shell.slice(footerStart);

function articleHtml(item) {
  const section = sectionFor[item.type] || ["/archive", "Archive", "archive"];
  const same = sortItems(entries.filter((entry) => entry.type === item.type), item.type);
  const index = same.findIndex((entry) => entry.id === item.id);
  const prev = index > 0 ? same[index - 1] : null;
  const next = index < same.length - 1 ? same[index + 1] : null;
  const related = (item.related || []).map((id) => entries.find((entry) => entry.id === id)).filter(Boolean);
  const image = stillFor(item.id);
  const focus = focusFor[item.id] || item.focus || "center";
  const facts = (item.facts || []).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  const paragraphs = (item.body || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
  const url = entryPath(item);
  const description = item.summary.length > 155 ? `${item.summary.slice(0, 152).trim()}...` : item.summary;
  let pageHead = head
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(item.name)} | GTA Wiki</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${absolute(url)}">`);
  if (prev) pageHead += `\n  <link rel="prev" href="${esc(absolute(entryPath(prev)))}">`;
  if (next) pageHead += `\n  <link rel="next" href="${esc(absolute(entryPath(next)))}">`;
  const ld = {
    "@context": "https://schema.org",
    "@type": item.type === "nieuws" ? "NewsArticle" : "Article",
    headline: item.name,
    description: item.summary,
    inLanguage: "en",
    url: absolute(url),
    articleSection: item.typeLabel,
    isPartOf: { "@type": "WebSite", name: "GTA Wiki", url: `${ORIGIN}/` }
  };
  if (item.date) ld.datePublished = item.date;
  pageHead += `\n  <script type="application/ld+json">\n  ${JSON.stringify(ld, null, 2).replace(/</g, "\\u003c")}\n  </script>\n</head>`;
  const body = header.replace(/<body[^>]*>/, `<body data-nav="${section[2]}" data-entry="${esc(item.id)}">`);
  return `${pageHead}
${body}<main id="inhoud" class="article-page">
    <p class="kicker"><a href="${esc(section[0])}">${esc(section[1])}</a></p>
    <h1>${esc(item.name)}</h1>
    <p class="lede">${esc(item.summary)}</p>
    <figure class="hero-figure">
      <img src="${esc(image)}" alt="${esc(item.name)}" style="object-position:${esc(focus)}">
    </figure>
    <div class="article-grid">
      <article class="prose">
        ${paragraphs}
        <p><a href="/contact?entry=${encodeURIComponent(item.id)}">Send a correction</a></p>
      </article>
      <aside class="facts">
        <span class="badge" data-status="${esc(item.status)}">${esc(item.status)}</span>
        <dl>${facts}</dl>
        <p class="fine">${esc(item.source || "Summarized from public announcements and reporting through October 25, 2026.")}</p>
      </aside>
    </div>
    ${related.length ? `<h2>Related</h2><div class="catalog">${related.map(card).join("")}</div>` : ""}
    <nav class="pager">
      ${prev ? `<a href="${esc(entryPath(prev))}"><span>Previous</span>${esc(prev.name)}</a>` : "<span></span>"}
      ${next ? `<a href="${esc(entryPath(next))}"><span>Next</span>${esc(next.name)}</a>` : ""}
    </nav>
  </main>
  ${footer}`;
}

for (const item of entries) {
  const url = entryPath(item);
  const file = path.join(root, `${url.slice(1)}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, articleHtml(item));
}

for (const [name, html] of written) {
  fs.writeFileSync(path.join(root, name), fillCatalogs(html));
}

const hubs = Object.values(hubCanonical);
const locs = [...hubs, ...entries.map(entryPath)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((loc) => `  <url><loc>${absolute(loc)}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

const entryRedirects = {};
for (const [oldId, newId] of Object.entries(idMap)) entryRedirects[oldId] = pathById[newId];
for (const item of entries) entryRedirects[item.id] = pathById[item.id];
const pages = {};
for (const [from, to] of pageMap) pages[from] = to;
fs.writeFileSync(path.join(root, "redirects.json"), JSON.stringify({ pages, entries: entryRedirects }, null, 2));

console.log(`entries ${entries.length}`);
console.log(`pages ${locs.length}`);
console.log(pathById["lucia-caminos"]);
console.log(pathById.story);
console.log(pathById["launch-trailer"]);
