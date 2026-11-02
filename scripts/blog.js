/* Publishes blog posts from content/blog/posts.js whose date has arrived (Europe/Amsterdam).
   Builds /blog/<slug>, /blog, the "New on the blog" topbar on every page, menu and footer links,
   and the blog entries in sitemap.xml. Safe to run any number of times.
   Usage: node scripts/blog.js            (uses today's date)
          BLOG_TODAY=2026-11-05 node scripts/blog.js */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ORIGIN = "https://discovergta6.com";
const BRAND = "DiscoverGTA6";
const EMAIL = "contact@discovergta6.com";
const today = process.env.BLOG_TODAY || new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (obj) => `<script type="application/ld+json">\n  ${JSON.stringify(obj, null, 2).replace(/</g, "\\u003c")}\n  </script>`;
const longDate = (d) => { const [y, m, day] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
const shortDate = (d) => { const [y, m, day] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const minutes = (post) => Math.max(2, Math.round(post.body.join(" ").replace(/<[^>]+>/g, " ").split(/\s+/).length / 220));

const posts = require(path.join(root, "content/blog/posts.js"));
const published = posts.filter((p) => p.date <= today).sort((a, b) => b.date.localeCompare(a.date));
for (const p of posts) {
  const t = `${p.seoTitle} - ${BRAND}`;
  if (t.length > 60 || /:/.test(t) || /:/.test(p.description) || p.description.length > 160) throw new Error(`meta rules broken for ${p.slug}`);
}

const ORG = { "@type": "Organization", "@id": `${ORIGIN}/#org`, name: BRAND, alternateName: "Discover GTA 6", url: `${ORIGIN}/`, logo: `${ORIGIN}/logo/discover-gta6-avatar.png`, email: EMAIL };
const SITE = { "@type": "WebSite", "@id": `${ORIGIN}/#website`, name: BRAND, alternateName: "Discover GTA 6", url: `${ORIGIN}/`, inLanguage: "en", publisher: { "@id": `${ORIGIN}/#org` } };
const crumbs = (list) => ({ "@type": "BreadcrumbList", itemListElement: list.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: ORIGIN + url })) });

// page shell from the About page
const shell = read("about.html");
const shellHead = shell.slice(0, shell.indexOf("</head>"));
const shellHeader = shell.slice(shell.indexOf("<body"), shell.indexOf("<main"));
const shellFooter = shell.slice(shell.indexOf("<footer"));

function head({ title, desc, url, image, type, graph, published }) {
  let h = shellHead
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${ORIGIN}${url}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${type}">`)
    .replace(/<meta (property="og:title"|name="twitter:title") content="[^"]*">/g, (m, a) => `<meta ${a} content="${esc(title)}">`)
    .replace(/<meta (property="og:description"|name="twitter:description") content="[^"]*">/g, (m, a) => `<meta ${a} content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${ORIGIN}${url}">`)
    .replace(/<meta (property="og:image"|name="twitter:image") content="[^"]*">/g, (m, a) => `<meta ${a} content="${esc(image)}">`)
    .replace(/<meta property="article:published_time" content="[^"]*">\s*/g, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ld({ "@context": "https://schema.org", "@graph": graph }));
  if (!/og:image/.test(h)) h = h.replace(/(<meta property="og:url" content="[^"]*">)/, `$1\n  <meta property="og:image" content="${esc(image)}">`);
  if (published) h = h.replace(/(<meta property="og:url" content="[^"]*">)/, `$1\n  <meta property="article:published_time" content="${published}">`);
  return h + "</head>\n";
}
const header = (nav) => shellHeader.replace(/<body[^>]*>/, `<body data-nav="${nav}">`);

function card(post) {
  return `<a class="card" href="/blog/${post.slug}">
      <span class="card-media" style="background-image:url('${esc(post.image)}');background-position:center;background-size:cover"></span>
      <span class="card-body">
        <span class="kicker">Blog · ${esc(shortDate(post.date))}</span>
        <strong>${esc(post.title)}</strong>
        <em>${esc(post.description)}</em>
      </span>
    </a>`;
}

// FAQ block and schema node, shared by posts and the index
function faqBlock(qs) {
  if (!qs || !qs.length) return "";
  return `<!--page-faq--><section class="page-faq" aria-labelledby="page-faq-title">
      <h2 id="page-faq-title">Frequently asked questions</h2>
      <div class="faq-list">
        ${qs.map(([q, a], i) => `<details class="faq-acc"${i === 0 ? " open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n        ")}
      </div>
    </section><!--/page-faq-->`;
}
const faqNode = (qs, url) => ({ "@type": "FAQPage", "@id": `${ORIGIN}${url}#faq`, url: ORIGIN + url,
  mainEntity: qs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const INDEX_FAQ = [
  ["How often is there a new blog post?", "Every day in the run-up to the November 19, 2026 launch."],
  ["Can I suggest a topic?", "Yes. Send it through the contact form."]
];

// posts
const keep = new Set();
for (const post of published) {
  const url = `/blog/${post.slug}`;
  const title = `${post.seoTitle} - ${BRAND}`;
  const graph = [
    {
      "@type": "BlogPosting", "@id": `${ORIGIN}${url}#post`, headline: post.title, description: post.description,
      image: [post.image], datePublished: post.date, dateModified: post.date, inLanguage: "en",
      url: ORIGIN + url, mainEntityOfPage: ORIGIN + url, author: { "@id": `${ORIGIN}/#org` }, publisher: { "@id": `${ORIGIN}/#org` },
      isPartOf: { "@id": `${ORIGIN}/#website` }, about: { "@type": "VideoGame", name: "Grand Theft Auto VI", alternateName: ["GTA 6", "GTA VI"] },
      citation: post.sources.map((s) => s[1])
    },
    crumbs([["Home", "/"], ["Blog", "/blog"], [post.title, url]]), ORG, SITE
  ];
  if (post.faq && post.faq.length) graph.push(faqNode(post.faq, url));
  const more = published.filter((p) => p.slug !== post.slug).slice(0, 3);
  const sources = post.sources.map(([label, href]) => `<a href="${esc(href)}" rel="noopener noreferrer">${esc(label)}</a>`).join(", ");
  const html = `${head({ title, desc: post.description, url, image: post.image, type: "article", graph, published: post.date })}${header("blog")}<main id="inhoud" class="article-page blog-post">
    <nav class="kicker" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a></nav>
    <h1>${esc(post.title)}</h1>
    <p class="lede">${esc(post.lede)}</p>
    <p class="post-meta"><time datetime="${post.date}">${esc(longDate(post.date))}</time> · ${minutes(post)} min read · By DiscoverGTA6</p>
    <figure class="hero-figure">
      <img src="${esc(post.image)}" alt="${esc(post.imageAlt)}" width="1400" height="788" fetchpriority="high" decoding="async">
    </figure>
    <article class="prose post-body">
      ${post.body.join("\n      ")}
      <p class="fine">Sources: ${sources}. Spotted a mistake? <a href="/contact">Let us know</a>.</p>
    </article>
    ${faqBlock(post.faq)}
    ${more.length ? `<h2>More from the blog</h2><div class="catalog">${more.map(card).join("")}</div>` : ""}
  </main>
  ${shellFooter}`;
  write(`blog/${post.slug}.html`, html);
  keep.add(`${post.slug}.html`);
}
if (fs.existsSync(path.join(root, "blog"))) {
  for (const f of fs.readdirSync(path.join(root, "blog"))) if (f.endsWith(".html") && !keep.has(f)) fs.unlinkSync(path.join(root, "blog", f));
}

// blog index
{
  const title = `GTA 6 Blog? Read the latest news and guides - ${BRAND}`;
  const desc = "The DiscoverGTA6 blog covers GTA 6 news, launch guides and explainers. What happened this week and what is next? Read the latest posts here.";
  const image = published[0] ? published[0].image : "";
  const graph = [
    { "@type": "CollectionPage", "@id": `${ORIGIN}/blog#webpage`, url: `${ORIGIN}/blog`, name: title, description: desc, inLanguage: "en", isPartOf: { "@id": `${ORIGIN}/#website` },
      mainEntity: { "@type": "ItemList", itemListElement: published.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${ORIGIN}/blog/${p.slug}`, name: p.title })) } },
    crumbs([["Home", "/"], ["Blog", "/blog"]]), ORG, SITE, faqNode(INDEX_FAQ, "/blog")
  ];
  write("blog.html", `${head({ title, desc, url: "/blog", image, type: "website", graph })}${header("blog")}<main id="inhoud">
    <header class="page-hero">
      <p class="kicker">News and guides</p>
      <h1>GTA 6 Blog</h1>
      <p class="lede">News, launch guides, and explainers about Grand Theft Auto VI, with a source behind every claim. A new post every day in the run-up to November 19.</p>
    </header>
    <div class="page-main">
      <div class="catalog">${published.map(card).join("")}</div>
      ${faqBlock(INDEX_FAQ)}
    </div>
  </main>
  ${shellFooter}`);
}

// every page: topbar, Blog in menu and footer
const latest = published[0];
const topbar = latest
  ? `<!--topbar--><div class="topbar"><div class="topbar-inner"><span class="topbar-label">New on the blog</span><a class="topbar-link" href="/blog/${latest.slug}">${esc(latest.title)}</a><a class="topbar-all" href="/blog">All posts</a></div></div><!--/topbar-->`
  : "";
const files = [];
(function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if ([".git", "node_modules", "content", "scripts", ".github"].includes(n)) continue; if (fs.statSync(p).isDirectory()) walk(p); else if (n.endsWith(".html")) files.push(p); } })(root);
for (const f of files) {
  let h = fs.readFileSync(f, "utf8");
  const before = h;
  if (h.includes("<!--topbar-->")) h = h.replace(/<!--topbar-->[\s\S]*?<!--\/topbar-->/, topbar);
  else h = h.replace(/(<a class="skip" href="#inhoud">Skip to content<\/a>)/, `$1\n  ${topbar}`);
  if (!h.includes('data-navlink="blog"')) h = h.replace(/(<a href="\/news" data-navlink="news">News<\/a>)(\s*)/, `$1$2<a href="/blog" data-navlink="blog">Blog</a>$2`);
  if (!h.includes('<a href="/blog">Blog</a>')) h = h.replace(/(<a href="\/news">News<\/a>)(\s*)/, `$1$2<a href="/blog">Blog</a>$2`);
  if (h.includes("<!--home-blog-->")) h = h.replace(/<!--home-blog-->[\s\S]*?<!--\/home-blog-->/, `<!--home-blog--><div class="catalog catalog-3">${published.slice(0, 3).map(card).join("")}</div><!--/home-blog-->`);
  if (h !== before) fs.writeFileSync(f, h);
}

// sitemap
let sitemap = read("sitemap.xml").replace(/\r\n/g, "\n").split("\n").filter((l) => !l.includes(`${ORIGIN}/blog`)).join("\n");
const blogLocs = [`  <url><loc>${ORIGIN}/blog</loc><lastmod>${published[0] ? published[0].date : today}</lastmod></url>`,
  ...published.map((p) => `  <url><loc>${ORIGIN}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod></url>`)];
sitemap = sitemap.replace("</urlset>", `${blogLocs.join("\n")}\n</urlset>`);
write("sitemap.xml", sitemap);

console.log(`today ${today}: ${published.length} of ${posts.length} posts live, latest "${latest ? latest.slug : "none"}"`);
