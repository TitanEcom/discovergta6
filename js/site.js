(function () {
  const entries = () => window.ENTRIES || [];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function norm(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function byId(id) {
    return entries().find((item) => item.id === id);
  }

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

  function entryPath(item) {
    const folder = folders[item.type] || "archive";
    return `/${folder}/${item.id}`;
  }

  const sectionFor = {
    personage: ["/characters", "Characters"],
    locatie: ["/locations", "Locations"],
    zaak: ["/locations#businesses", "Businesses"],
    voertuig: ["/vehicles", "Vehicles"],
    wapen: ["/vehicles#weapons", "Weapons"],
    radio: ["/radio", "Radio"],
    systeem: ["/gameplay", "Gameplay"],
    editie: ["/editions", "Editions"],
    nieuws: ["/news", "News"]
  };

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

  function haystack(item) {
    return norm([
      item.name,
      item.kicker,
      item.summary,
      item.status,
      item.typeLabel,
      ...(item.tags || []),
      ...(item.body || []),
      ...((item.facts || []).flat())
    ].join(" "));
  }

  function matches(item, query) {
    const parts = norm(query).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return true;
    const text = haystack(item);
    return parts.every((part) => text.includes(part));
  }

  const rockstar = "https://www.rockstargames.com/VI/_next/static/media/";
  function art(file) {
    return rockstar + file + "?akim=1&imdensity=1&imwidth=1400";
  }
  const photos = {
    story: "Jason_and_Lucia_04.0m7i~huzhskdw.jpg",
    "jason-duval": "Jason_Duval_01.07m377xeb6jhq.jpg",
    "lucia-caminos": "Lucia_Caminos_01.0a7yqvewctkfp.jpg",
    "cal-hampton": "Cal_Hampton_portrait.179.1dxrk8_d5.jpg",
    "boobie-ike": "Boobie_Ike_portrait.0b-b3v7-sqc-7.jpg",
    "brian-heder": "Brian_Heder_portrait.0v7u682b~2ih1.jpg",
    lori: "Leonida_Keys_Postcard_portrait.11srv9iz6mz07.jpg",
    "drequan-priest": "DreQuan_Priest_portrait.06zwxhaq3-ul3.jpg",
    "real-dimez": "Real_Dimez_portrait.08x5fz2k.zqrd.jpg",
    "bae-luxe": "Real_Dimez_01.0djwwboo8-glx.jpg",
    roxy: "Real_Dimez_03.02o2si7.op.ye.jpg",
    "raul-bautista": "Raul_Bautista_portrait.01w3r6er0z2t9.jpg",
    macca: "ULTIMATE_EDITION_GOODTIME_GEAR_01.0t7de8dow381q.jpg",
    leonida: "onlyInLeonidaDesktop.15y2n40f3axwo.jpg",
    "vice-city": "Vice_City_01.135x56yoeu.6t.jpg",
    "leonida-keys": "Leonida_Keys_01.0zgz7tveur6y8.jpg",
    grassrivers: "Grassrivers_01.1096rw4lbjur_.jpg",
    "port-gellhorn": "Port_Gellhorn_01.0fmisvza-5-cq.jpg",
    ambrosia: "Ambrosia_01.0rqphs0gazkm..jpg",
    "mount-kalaga": "Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg",
    "leonida-penitentiary": "Lucia_Caminos_06.0fxbjfk0jakb3.jpg",
    "shore-drive": "ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg",
    "washington-beach": "ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg",
    "gambit-bay": "ULTIMATE_EDITION_SQUALO_02.09qplkj.rjnk7.jpg",
    "watson-bay": "ULTIMATE_EDITION_VAPID_BUGGY_02.0tf15jp~61bkj.jpg",
    stockyard: "ULTIMATE_EDITION_STOCK_305_01.0vuq0m5_1j-17.jpg",
    southside: "Vice_City_12.0qdgemgi_uypg.jpg",
    "lake-leonida": "Grassrivers_03.14cuv-vg9orw4.jpg",
    "liberty-city": "Vice_City_09.0~ng.c8ack3fp.jpg",
    "stanier-55": "VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg",
    "cheetah-95": "ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg",
    ganado: "ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg",
    enduro: "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_01.0wv6pw3t-mky3.jpg",
    "crest-kayak": "ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_02.0-2n5rm9n8.rq.jpg",
    squalo: "ULTIMATE_EDITION_SQUALO_03.0quncwrsw97j1.jpg",
    "dominator-buggy": "ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg",
    morgan: "ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg",
    "girardi-es9": "ULTIMATE_EDITION_WEAPON_VARIANTS_01.12licq0_o7mb5.jpg",
    "klose-k17": "ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_02.04e_9jco7lluf.jpg",
    "flash-fm": "Vice_City_03.0nqz~lrqdmlze.jpg",
    "cocoteo-fm": "Vice_City_06.0_tdmr3u9w84x.jpg",
    "afro-bank": "Vice_City_08.0bbg_xp4hqdvz.jpg",
    "the-chamber": "Port_Gellhorn_03.00c2b0eh7sm~q.jpg",
    "dirty-south": "Vice_City_10.0f1q-xa_4q8r2.jpg",
    "back-country": "Grassrivers_02.0teqs5xe2pem1.jpg",
    "only-raw": "DreQuan_Priest_01.0_0~wi-ipdj35.jpg",
    "jack-of-hearts": "Boobie_Ike_02.0sp9mtc.1cdzs.jpg",
    "brians-boatyard": "Leonida_Keys_03.0v_3~-9ceyixc.jpg",
    "paradise-garage": "ULTIMATE_EDITION_VAPID_BUGGY_03.0s2rbkg98-0ac.jpg",
    "stanier-garage": "VINTAGE_VICE_CITY_PACK_VAPID_STANIER_02.0s2wun4_vzld2.jpg",
    "stock-305": "ULTIMATE_EDITION_STOCK_305_02.0va5ldrhsejht.jpg",
    "saras-salon": "ULTIMATE_EDITION_SARAS_SALON_01.0gn7dwlvcgz17.jpg",
    "electric-fang": "ULTIMATE_EDITION_ELECTRIC_FANG_01.04tsytu7qp2b-.jpg",
    rideout: "ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg",
    "one-eyed-willie": "ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.jpg",
    "ptt-youngin": "ULTIMATE_EDITION_PTT_STORE_01.0seuocb~7b1-q.jpg",
    "switching": "Jason_and_Lucia_05.0ypw_.fz.~4k0.jpg",
    relationship: "Jason_and_Lucia_06.1035xf1yo78.b.jpg",
    "criminal-profile": "Jason_and_Lucia_07.1699ivog8~w1n.jpg",
    body: "Lucia_Caminos_03.14xgd2y_ymmeg.jpg",
    snapmatic: "Vice_City_04.06evqutgh7624.jpg",
    weather: "Grassrivers_04.01ckpqbhxyz76.jpg",
    residents: "Vice_City_02.0c5.7qx17u9kl.jpg",
    "free-time": "Leonida_Keys_04.0hce1rw1s8pd9.jpg",
    singleplayer: "Jason_and_Lucia_08.0.bq0bdrl6g5y.jpg",
    framerate: "Jason_Duval_03.0-1vum7x-3vtp.jpg",
    "pc": "Vice_City_11.09paum3g942sc.jpg",
    "standard-edition": "GTAVI_FOB_StandardEdition_Desktop.09clbpu8-nv8i.jpg",
    ultimate: "ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg",
    "vintage-pack": "VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.jpg",
    "launch-trailer": "launch-trailer.0_q-sdrgufc.s.jpg",
    "extended-look": "an-extended-look.0ijbsha5fo1te.jpg",
    "second-trailer": "t2.03tjzfo3b31.y.jpg",
    "first-trailer": "t1.11adbh~jn5-gy.jpg",
    "the-album": "The_Album_Cover_Art_landscape.000ifb9a.j-gp.jpg",
    "radio-preview": "musicDesktop.0zwcbzhynnsc-.jpg",
    "cover-and-editions": "GTAVI_FOB_UltimateEdition_Desktop_en_us.04i20kdr.r_mm.jpg",
    "pre-orders-open": "Jason_and_Lucia_01_landscape.12x2gvspcm_3m.jpg",
    "release-day": "Vice_City_05.0~r~o0jzpp4a-.jpg",
    "preload": "VINTAGE_VICE_CITY_PACK_02.14mvx9a15z8jv.jpg"
  };
  const focusFor = {
    "jason-duval": "68% 20%",
    "lucia-caminos": "center 28%",
    "cal-hampton": "center 20%",
    "boobie-ike": "center 15%",
    "brian-heder": "center 18%",
    "drequan-priest": "center 18%",
    "real-dimez": "center 22%",
    "bae-luxe": "center 22%",
    roxy: "center 28%",
    macca: "16% 42%",
    "raul-bautista": "center 18%"
  };
  const zoomFor = {
    macca: "420%"
  };
  const fallbacks = [
    "Jason_and_Lucia_09.11_dlvb_8svuu.jpg",
    "Jason_and_Lucia_10.0cauoz34524-..jpg",
    "Jason_and_Lucia_11.13lmeyci.i-yw.jpg",
    "Jason_and_Lucia_12.04brpvymc~09q.jpg",
    "Jason_Duval_04.16d-z2wa2s~bk.jpg",
    "Lucia_Caminos_04.04kb_~4ubn3wn.jpg",
    "Vice_City_07.0b3mhak4k78oh.jpg",
    "Ambrosia_02.0wtqs05ozl.ym.jpg",
    "Port_Gellhorn_02.00e7cz6lwrup-.jpg",
    "Mount_Kalaga_National_Park_02.0f24dhopdprvx.jpg",
    "Leonida_Keys_05.0yerhvjhto-h..jpg",
    "Grassrivers_05.0.dx9~67tljry.jpg"
  ];

  function stillFor(id) {
    const file = photos[id];
    if (file) return art(file);
    let index = 0;
    const key = String(id || "");
    for (let i = 0; i < key.length; i += 1) index = (index + key.charCodeAt(i)) % fallbacks.length;
    return art(fallbacks[index]);
  }

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

  function score(item, query) {
    const text = norm(query).trim();
    if (!text) return 0;
    const name = norm(item.name);
    let value = 0;
    if (name === text) value += 100;
    if (name.includes(text)) value += 40;
    text.split(/\s+/).forEach((part) => {
      if (name.includes(part)) value += 20;
      if (norm(item.kicker).includes(part)) value += 8;
      if ((item.tags || []).some((tag) => norm(tag).includes(part))) value += 6;
    });
    return value;
  }

  function filtered(types, query) {
    let list = entries();
    if (types && types.length && !types.includes("all")) {
      list = list.filter((item) => types.includes(item.type));
    }
    if (query) list = list.filter((item) => matches(item, query));
    const mode = types && types.length === 1 ? types[0] : "mixed";
    const sorted = sortItems(list, mode);
    if (norm(query).trim()) sorted.sort((a, b) => score(b, query) - score(a, query));
    return sorted;
  }

  function renderCatalog() {
    const search = document.querySelector("#page-search");
    const query = search ? search.value : "";
    document.querySelectorAll("[data-catalog]").forEach((root) => {
      const types = (root.dataset.catalog || "all").split(",").map((part) => part.trim());
      const items = filtered(types, root.dataset.search === "off" ? "" : query);
      const count = document.querySelector("[data-count]");
      if (count && root.id === "catalog") {
        count.textContent = `${items.length} ${items.length === 1 ? "entry" : "entries"}`;
      }
      root.innerHTML = items.length
        ? items.map(card).join("")
        : '<p class="empty">Nothing matches. Try another name, or clear the search.</p>';
    });
  }

  function renderHome() {
    document.querySelectorAll("[data-home]").forEach((root) => {
      const type = root.dataset.home;
      const limit = Number(root.dataset.limit || 6);
      const skip = Number(root.dataset.skip || 0);
      const items = sortItems(entries().filter((item) => item.type === type), type).slice(skip, skip + limit);
      root.innerHTML = items.map(card).join("");
    });
  }

  function remember(id) {
    try {
      const key = "gtawiki-recent";
      const ids = JSON.parse(localStorage.getItem(key) || "[]").filter((item) => item !== id);
      ids.unshift(id);
      localStorage.setItem(key, JSON.stringify(ids.slice(0, 6)));
    } catch (error) {
      /* this browser may block storage */
    }
  }

  function renderArticle() {
    const staticId = document.body.dataset.entry;
    if (staticId) {
      remember(staticId);
      return;
    }
    const root = document.querySelector("#article");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const item = id && byId(id);
    if (!item) {
      document.title = "Not found | GTA Wiki";
      root.innerHTML = '<p class="kicker">Archive</p><h1>This entry does not exist</h1><p class="lede">The link is incomplete, or the topic is not in the archive yet.</p><p><a class="pill" href="/archive">Learn More</a></p>';
      return;
    }
    document.title = `${item.name} | GTA Wiki`;
    remember(item.id);
    const facts = (item.facts || []).map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    const paragraphs = (item.body || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
    const same = sortItems(entries().filter((entry) => entry.type === item.type), item.type);
    const index = same.findIndex((entry) => entry.id === item.id);
    const prev = index > 0 ? same[index - 1] : null;
    const next = index < same.length - 1 ? same[index + 1] : null;
    const related = (item.related || []).map(byId).filter(Boolean);
    const image = stillFor(item.id);
    const focus = focusFor[item.id] || "center";
    root.innerHTML = `
      <p class="kicker"><a href="${esc((sectionFor[item.type] || ["/archive", item.typeLabel])[0])}">${esc((sectionFor[item.type] || ["/archive", item.typeLabel])[1])}</a></p>
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
      </nav>`;
  }

  function renderRecent() {
    const root = document.querySelector("#recent");
    if (!root) return;
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem("gtawiki-recent") || "[]");
    } catch (error) {
      ids = [];
    }
    const items = ids.map(byId).filter(Boolean);
    if (!items.length) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    root.innerHTML = `<h2>Recently viewed</h2><div class="catalog">${items.map(card).join("")}</div>`;
  }

  function initNav() {
    const current = document.body.dataset.nav;
    document.querySelectorAll("[data-navlink]").forEach((link) => {
      if (link.dataset.navlink === current) link.setAttribute("aria-current", "page");
    });
    const burger = document.querySelector("#burger");
    const nav = document.querySelector("#nav");
    if (burger && nav) {
      const setOpen = (open) => {
        nav.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Close Navigation Menu" : "Expand Navigation Menu");
        document.body.classList.toggle("nav-open", open);
        nav.inert = !open;
      };
      setOpen(false);
      burger.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
          burger.setAttribute("aria-label", "Expand Navigation Menu");
          document.body.classList.remove("nav-open");
          nav.inert = true;
        });
      });
    }
    const top = document.querySelector("#top");
    if (top && document.body.classList.contains("home")) {
      const onScroll = () => top.classList.toggle("is-solid", window.scrollY > 20);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function initCountdown() {
    const clocks = document.querySelectorAll("[data-countdown]");
    if (!clocks.length) return;
    const targets = {
      release: new Date(2026, 10, 19, 0, 0, 0),
      preload: new Date(2026, 10, 12, 0, 0, 0)
    };
    const tick = () => {
      const now = Date.now();
      clocks.forEach((clock) => {
        const target = targets[clock.dataset.countdown];
        const live = clock.querySelector("[data-live]");
        const done = clock.querySelector("[data-done]");
        if (!target) return;
        const diff = target.getTime() - now;
        if (diff <= 0) {
          clock.classList.add("is-live");
          ["days", "hours", "minutes", "seconds"].forEach((unit) => {
            const node = clock.querySelector(`[data-unit="${unit}"]`);
            if (node) node.textContent = "00";
          });
          if (done) {
            done.hidden = false;
            done.textContent = clock.dataset.doneText || "This date has been reached.";
          }
          if (live) live.textContent = clock.dataset.doneText || "This date has been reached.";
          return;
        }
        const total = Math.floor(diff / 1000);
        const days = Math.floor(total / 86400);
        const hours = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;
        const values = { days: String(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
        Object.entries(values).forEach(([unit, value]) => {
          const node = clock.querySelector(`[data-unit="${unit}"]`);
          if (node) node.textContent = value;
        });
        const stamp = `${days}-${hours}-${minutes}`;
        if (live && clock.dataset.stamp !== stamp) {
          clock.dataset.stamp = stamp;
          const label = clock.dataset.label || "the date";
          live.textContent = `${days} days, ${hours} hours and ${minutes} minutes until ${label}.`;
        }
      });
    };
    tick();
    window.setInterval(tick, 1000);
  }

  function initSearch() {
    const opener = document.querySelector("#open-search");
    if (!opener) return;
    const layer = document.createElement("div");
    layer.className = "search-layer";
    layer.hidden = true;
    layer.innerHTML = `<div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <p class="kicker" id="search-title">Search the archive</p>
      <input id="search-input" type="search" placeholder="Jason, Vice City, radio, Cheetah…" autocomplete="off">
      <div id="search-results"></div>
      <p class="fine">Escape closes this. Enter opens the first result. Shortcut: /</p>
    </div>`;
    document.body.appendChild(layer);
    const input = layer.querySelector("#search-input");
    const results = layer.querySelector("#search-results");
    let current = [];

    const paint = () => {
      current = filtered(["all"], input.value).slice(0, 8);
      results.innerHTML = current.length
        ? current.map((item) => `<a href="${esc(entryPath(item))}"><small>${esc(item.typeLabel)}</small>${esc(item.name)}</a>`).join("")
        : '<p class="empty">No entry for this search.</p>';
    };
    const show = () => {
      layer.hidden = false;
      document.body.classList.add("search-open");
      input.focus();
      paint();
    };
    const hide = () => {
      layer.hidden = true;
      document.body.classList.remove("search-open");
    };

    opener.addEventListener("click", show);
    layer.addEventListener("click", (event) => {
      if (event.target === layer) hide();
    });
    input.addEventListener("input", paint);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && current[0]) {
        location.href = entryPath(current[0]);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hide();
        const nav = document.querySelector("#nav");
        const burger = document.querySelector("#burger");
        if (nav) {
          nav.classList.remove("is-open");
          nav.inert = true;
        }
        if (burger) {
          burger.setAttribute("aria-expanded", "false");
          burger.setAttribute("aria-label", "Expand Navigation Menu");
        }
        document.body.classList.remove("nav-open");
      }
      const typing = document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        show();
      }
    });
  }

  function initFilters() {
    const wrap = document.querySelector("[data-filters]");
    const catalog = document.querySelector("#catalog");
    if (!wrap || !catalog) return;
    wrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      wrap.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.remove("is-on");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-on");
      button.setAttribute("aria-pressed", "true");
      catalog.dataset.catalog = button.dataset.filter;
      renderCatalog();
    });
  }

  function initPageSearch() {
    const input = document.querySelector("#page-search");
    if (!input) return;
    input.addEventListener("input", renderCatalog);
  }

  function readMail() {
    try {
      return JSON.parse(localStorage.getItem("gtawiki-mail") || "[]");
    } catch (error) {
      return [];
    }
  }

  function initContact() {
    const form = document.querySelector("#contact-form");
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const lemma = params.get("entry") || params.get("lemma");
    if (lemma && form.elements.bericht) {
      form.elements.bericht.value = `Entry: ${lemma}\n\n`;
      if (form.elements.onderwerp) form.elements.onderwerp.value = "Correction";
    }
    const box = document.querySelector("#form-note");
    const list = document.querySelector("#inbox");
    const renderInbox = () => {
      if (!list) return;
      const items = readMail();
      list.innerHTML = items.length
        ? items.slice().reverse().map((item) => `<article class="inbox-item"><strong>${esc(item.ticket)}</strong><span>${esc(item.onderwerp)} · ${esc(item.naam)}</span><p>${esc(item.bericht)}</p></article>`).join("")
        : '<p class="fine">No messages in this browser yet.</p>';
    };
    renderInbox();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      if (String(data.get("bedrijf") || "").trim()) {
        box.hidden = false;
        box.dataset.kind = "ok";
        box.textContent = "Message received.";
        form.reset();
        return;
      }
      const naam = String(data.get("naam") || "").trim();
      const email = String(data.get("email") || "").trim();
      const onderwerp = String(data.get("onderwerp") || "").trim();
      const bericht = String(data.get("bericht") || "").trim();
      const errors = [];
      if (naam.length < 2) errors.push("Enter a name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
      if (!onderwerp) errors.push("Choose a subject.");
      if (bericht.length < 12) errors.push("Write at least one sentence.");
      if (errors.length) {
        box.hidden = false;
        box.dataset.kind = "error";
        box.textContent = errors.join(" ");
        return;
      }
      const ticket = `VC-${Date.now().toString(36).toUpperCase()}`;
      try {
        const all = readMail();
        all.push({ ticket, naam, email, onderwerp, bericht, at: new Date().toISOString() });
        localStorage.setItem("gtawiki-mail", JSON.stringify(all));
      } catch (error) {
        box.hidden = false;
        box.dataset.kind = "error";
        box.textContent = "This browser is blocking local storage, so the message was not saved.";
        return;
      }
      form.reset();
      box.hidden = false;
      box.dataset.kind = "ok";
      box.textContent = `Received as ${ticket}. The message stays on this device and is not sent to Rockstar.`;
      renderInbox();
    });
    const clear = document.querySelector("#clear-inbox");
    if (clear) {
      clear.addEventListener("click", () => {
        localStorage.removeItem("gtawiki-mail");
        renderInbox();
      });
    }
  }

  function initMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = document.querySelectorAll(".panel");
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((list) => {
      list.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    nodes.forEach((node) => {
      node.classList.add("reveal");
      io.observe(node);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMotion();
    initNav();
    initCountdown();
    initSearch();
    initFilters();
    initPageSearch();
    renderHome();
    renderCatalog();
    renderArticle();
    renderRecent();
    initContact();
  });
})();
