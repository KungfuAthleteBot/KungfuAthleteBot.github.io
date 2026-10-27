/* ==========================================================================
   KungfuAthlete — interactions & data-driven charts
   No dependencies. Everything degrades gracefully: tables and text are static.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- data -- */
  const CATEGORIES = [
    { key: "daily", en: "Daily Training", zh: "日常训练", ground: 550, jump: 74,
      subs: [["Practice routines", 624]] },
    { key: "saber", en: "Saber / Sword", zh: "刀 / 剑", ground: 99, jump: 12,
      subs: [["Saber", 50], ["Sword", 37], ["Southern Saber", 15], ["Tai Chi Sword", 9]] },
    { key: "fist", en: "Fist", zh: "拳术", ground: 93, jump: 5,
      subs: [["Long Fist", 69], ["Tai Chi Fist", 21], ["Southern Fist", 8]] },
    { key: "staff", en: "Staff", zh: "棍术", ground: 80, jump: 10,
      subs: [["Staff Technique", 90]] },
    { key: "skills", en: "Skills", zh: "技巧", ground: 0, jump: 69,
      subs: [["Side Flip", 35], ["Air Spin", 18], ["Lotus Swing", 13], ["Backflip", 3]] },
  ];

  const DATASETS = [
    { name: "AMASS", lin: [0.188, 0.165], ang: [0.510, 0.309], frames: [2, 8788] },
    { name: "PHUMA", lin: [0.193, 0.130], ang: [0.585, 0.368], frames: [49, 222] },
    { name: "LAFAN1", lin: [0.790, 0.251], ang: [1.962, 0.553], frames: [3065, 9171] },
    { name: "KFA · Ground", lin: [0.496, 0.324], ang: [1.537, 0.959], frames: [24, 15792], kind: "ground" },
    { name: "KFA · Jump", lin: [0.948, 0.473], ang: [2.832, 1.431], frames: [25, 2842], kind: "jump" },
  ];

  const GALLERY = {
    s: { label: "Standard motion", n: 9 },
    tr: { label: "Tracking with autonomous recovery", n: 6 },
    rc: { label: "Recovery from a lying position", n: 6 },
  };

  /* ------------------------------------------------------------- helpers -- */
  const fmt = (n) => n.toLocaleString("en-US");

  function animateCount(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const dur = 1100;
    const start = performance.now();
    const from = 0;
    const decimals = 0;
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      el.textContent = fmt(Math.round(v));
      if (p < 1) requestAnimationFrame(tick);
    }
    if (reduceMotion) { el.textContent = fmt(target); return; }
    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------- reveal -- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach((el) => io.observe(el));
  }

  function initCounters() {
    const nums = $$("[data-count]");
    if (!("IntersectionObserver" in window)) {
      nums.forEach(animateCount);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    nums.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------- nav / misc -- */
  function initNav() {
    const nav = $("#nav");
    const progress = $("#progress");
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-stuck", y > 24);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = $("#navToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      $$("#navlinks a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        })
      );
    }

    // active section
    const links = $$("#navlinks a");
    const map = new Map();
    links.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, a);
    });
    if (!("IntersectionObserver" in window) || !map.size) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((l) => l.classList.remove("is-active"));
          map.get(e.target)?.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    map.forEach((_, sec) => io.observe(sec));
  }

  function initLang() {
    const html = document.documentElement;
    const buttons = $$("[data-lang-btn]");
    const set = (lang) => {
      html.dataset.lang = lang;
      html.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang))
      );
      try { localStorage.setItem("kfa-lang", lang); } catch (_) {}
    };
    let saved = null;
    try { saved = localStorage.getItem("kfa-lang"); } catch (_) {}
    if (saved === "zh") set("zh");
    buttons.forEach((b) => b.addEventListener("click", () => set(b.dataset.langBtn)));
  }

  /* ------------------------------------------------------- category chart -- */
  function initCategories() {
    const list = $("#catList");
    if (!list) return;
    const seg = $("#catSeg");
    let filter = "all";

    const donut = (g, j) => {
      const C = 2 * Math.PI * 50;
      const rg = $("#ringGround");
      const rj = $("#ringJump");
      const gf = g / (g + j);
      rg.style.strokeDasharray = `${C * gf} ${C}`;
      rj.style.strokeDasharray = `${C * (1 - gf)} ${C}`;
      rj.style.strokeDashoffset = `${-C * gf}`;
      $("#donutNum").textContent = g + j;
    };

    function render() {
      list.innerHTML = "";
      const max = Math.max(...CATEGORIES.map((c) => c.ground + c.jump));

      CATEGORIES.forEach((c) => {
        const sum = c.ground + c.jump;
        const value = filter === "ground" ? c.ground : filter === "jump" ? c.jump : sum;
        if (value === 0) return;

        const row = document.createElement("button");
        row.type = "button";
        row.className = "catrow";
        row.setAttribute("aria-expanded", "false");
        const gPct = (c.ground / max) * 100;
        const jPct = (c.jump / max) * 100;
        const showG = filter !== "jump" && c.ground > 0;
        const showJ = filter !== "ground" && c.jump > 0;
        row.innerHTML = `
          <span class="catrow__name"><em>+</em>${c.en}</span>
          <span class="catrow__track">
            ${showG ? `<i class="g" data-w="${gPct}"></i>` : ""}
            ${showJ ? `<i class="j" data-w="${jPct}"></i>` : ""}
          </span>
          <span class="catrow__val">${fmt(value)}</span>`;

        const sub = document.createElement("div");
        sub.className = "catsub";
        sub.innerHTML = c.subs
          .map(([n, v]) => `<div><b>${n}</b><span>${fmt(v)}</span></div>`)
          .join("");

        row.addEventListener("click", () => {
          const open = sub.classList.toggle("is-open");
          row.setAttribute("aria-expanded", String(open));
        });

        list.appendChild(row);
        list.appendChild(sub);

        requestAnimationFrame(() => {
          $$(".catrow__track i", row).forEach((bar) => {
            bar.style.width = `${bar.dataset.w}%`;
          });
        });
      });

      if (filter === "all") donut(822, 170);
    }

    if (seg) {
      $$("button", seg).forEach((b) =>
        b.addEventListener("click", () => {
          filter = b.dataset.filter;
          $$("button", seg).forEach((x) =>
            x.setAttribute("aria-selected", String(x === b))
          );
          render();
        })
      );
    }
    render();
  }

  /* --------------------------------------------------------- metric chart -- */
  function initMetricChart() {
    const svg = $("#metricChart");
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    let metric = "lin";
    const W = 720, H = 300, LEFT = 132, RIGHT = 66, TOP = 26, ROW = 50;

    const title = $("#metricTitle");
    const titles = {
      lin: ["Body linear velocity", "· m/s, mean ± std"],
      ang: ["Body angular velocity", "· rad/s, mean ± std"],
      frames: ["Clip length", "· frames, min – max (log)"],
    };

    function el(name, attrs) {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    }

    function render() {
      svg.innerHTML = "";
      const defs = el("defs");
      defs.innerHTML = `
        <linearGradient id="gJade" x1="0" x2="1"><stop offset="0" stop-color="#1f9d78"/><stop offset="1" stop-color="#35e0a1"/></linearGradient>
        <linearGradient id="gEmber" x1="0" x2="1"><stop offset="0" stop-color="#c0391f"/><stop offset="1" stop-color="#ff5a3c"/></linearGradient>
        <linearGradient id="gMute" x1="0" x2="1"><stop offset="0" stop-color="#2b313b"/><stop offset="1" stop-color="#4b5462"/></linearGradient>`;
      svg.appendChild(defs);

      const plotW = W - LEFT - RIGHT;
      const isFrames = metric === "frames";

      // axis grid
      let maxVal;
      if (isFrames) maxVal = Math.log10(20000);
      else maxVal = metric === "lin" ? 1.5 : 4.5;
      const ticks = isFrames ? [1, 10, 100, 1000, 10000] : metric === "lin" ? [0, 0.5, 1, 1.5] : [0, 1, 2, 3, 4];

      const scale = (v) => (v / maxVal) * plotW;

      ticks.forEach((t) => {
        const x = LEFT + (isFrames ? (Math.log10(t) / maxVal) * plotW : scale(t));
        svg.appendChild(el("line", { x1: x, y1: TOP - 4, x2: x, y2: TOP + DATASETS.length * ROW, class: "grid-line" }));
        const label = el("text", { x, y: TOP + DATASETS.length * ROW + 18, class: "axis-label", "text-anchor": "middle" });
        label.textContent = isFrames ? (t >= 1000 ? `${t / 1000}k` : String(t)) : String(t);
        svg.appendChild(label);
      });

      DATASETS.forEach((d, i) => {
        const y = TOP + i * ROW;
        const isOurs = !!d.kind;
        const fill = d.kind === "jump" ? "url(#gEmber)" : d.kind === "ground" ? "url(#gJade)" : "url(#gMute)";

        const label = el("text", {
          x: 0, y: y + 19, class: `cat-label${isOurs ? " ours" : ""}`,
        });
        label.textContent = d.name;
        svg.appendChild(label);

        if (isFrames) {
          const [lo, hi] = d.frames;
          const x1 = LEFT + (Math.log10(Math.max(1, lo)) / maxVal) * plotW;
          const x2 = LEFT + (Math.log10(hi) / maxVal) * plotW;
          const bar = el("rect", { x: x1, y: y + 10, height: 8, rx: 4, fill, class: "bar", width: 0 });
          bar.style.width = `${x2 - x1}px`;
          svg.appendChild(bar);
          const loTick = el("line", { x1: x1, y1: y + 4, x2: x1, y2: y + 24, class: "whisker" });
          svg.appendChild(loTick);
          const val = el("text", { x: W - RIGHT + 8, y: y + 19, class: `val${isOurs ? "" : " dim"}` });
          val.textContent = `${fmt(lo)}–${fmt(hi)}`;
          val.setAttribute("text-anchor", "start");
          svg.appendChild(val);
        } else {
          const [m, s] = d[metric];
          const w = Math.max(2, scale(m));
          const bar = el("rect", { x: LEFT, y: y + 6, height: 16, rx: 5, fill, class: "bar", width: 0 });
          bar.style.width = `${w}px`;
          svg.appendChild(bar);

          // ± std whisker
          const xa = LEFT + Math.max(0, scale(m - s));
          const xb = LEFT + scale(m + s);
          svg.appendChild(el("line", { x1: xa, y1: y + 14, x2: xb, y2: y + 14, class: "whisker" }));
          svg.appendChild(el("line", { x1: xb, y1: y + 9, x2: xb, y2: y + 19, class: "whisker" }));
          svg.appendChild(el("line", { x1: xa, y1: y + 9, x2: xa, y2: y + 19, class: "whisker" }));

          const val = el("text", { x: xb + 8, y: y + 19, class: `val${isOurs ? "" : " dim"}` });
          val.textContent = m.toFixed(3);
          svg.appendChild(val);
        }
      });

      if (title) title.innerHTML = `${titles[metric][0]} <span>${titles[metric][1]}</span>`;
    }

    const seg = $("#metricSeg");
    if (seg) {
      $$("button", seg).forEach((b) =>
        b.addEventListener("click", () => {
          metric = b.dataset.metric;
          $$("button", seg).forEach((x) =>
            x.setAttribute("aria-selected", String(x === b))
          );
          render();
        })
      );
    }
    render();
  }

  /* ------------------------------------------------------- before / after -- */
  function initSamples() {
    const tabs = $("#sampleTabs");
    if (!tabs) return;
    const before = $("#baBefore");
    const after = $("#baAfter");
    $$("[data-sample]", tabs).forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.sample;
        $$("[data-sample]", tabs).forEach((x) =>
          x.setAttribute("aria-selected", String(x === b))
        );
        before.src = `assets/video/ba-${id}-before.mp4`;
        after.src = `assets/video/ba-${id}-after.mp4`;
        before.poster = `assets/img/poster/ba-${id}-before.jpg`;
        after.poster = `assets/img/poster/ba-${id}-after.jpg`;
        [before, after].forEach((v) => {
          v.load();
          v.play().catch(() => {});
        });
      })
    );
  }

  /* -------------------------------------------------------------- gallery -- */
  function initGallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;
    const seg = $("#gallerySeg");
    let group = "s";

    const play = (v) => v.play().catch(() => {});

    function render() {
      grid.innerHTML = "";
      const meta = GALLERY[group];
      for (let i = 1; i <= meta.n; i++) {
        const id = `${group}${i}`;
        const card = document.createElement("figure");
        card.className = "vcard";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `${meta.label} ${i}`);
        card.innerHTML = `
          <video muted loop playsinline preload="none"
                 poster="assets/img/poster/${id}.jpg"
                 data-src="assets/video/${id}.mp4"></video>
          <span class="vcard__play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
          <figcaption class="vcard__meta"><span>${id.toUpperCase()}</span><span>·</span><span>${meta.label}</span></figcaption>`;
        const video = $("video", card);
        card.addEventListener("mouseenter", () => { play(video); });
        card.addEventListener("mouseleave", () => { video.pause(); });
        card.addEventListener("click", () => openModal(video.dataset.src, `${meta.label} · ${id.toUpperCase()}`));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal(video.dataset.src, `${meta.label} · ${id.toUpperCase()}`);
          }
        });
        grid.appendChild(card);
      }
      // lazy-load sources
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                const v = $("video", e.target);
                if (v && !v.src) v.src = v.dataset.src;
                io.unobserve(e.target);
              }
            });
          },
          { rootMargin: "300px" }
        );
        $$(".vcard", grid).forEach((c) => io.observe(c));
      } else {
        $$(".vcard video", grid).forEach((v) => { v.src = v.dataset.src; });
      }
    }

    if (seg) {
      $$("button", seg).forEach((b) =>
        b.addEventListener("click", () => {
          group = b.dataset.gallery;
          $$("button", seg).forEach((x) =>
            x.setAttribute("aria-selected", String(x === b))
          );
          render();
        })
      );
    }
    render();
  }

  /* ---------------------------------------------------------------- modal -- */
  let lastFocus = null;
  function openModal(src, caption) {
    const modal = $("#modal");
    const video = $("#modalVideo");
    if (!modal) return;
    lastFocus = document.activeElement;
    video.src = src;
    $("#modalCaption").textContent = caption;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    video.play().catch(() => {});
    $("#modalClose").focus();
  }
  function closeModal() {
    const modal = $("#modal");
    const video = $("#modalVideo");
    if (!modal) return;
    modal.classList.remove("is-open");
    video.pause();
    video.removeAttribute("src");
    video.load();
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function initModal() {
    const modal = $("#modal");
    if (!modal) return;
    $("#modalClose").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  /* ----------------------------------------------------------------- copy -- */
  function initCopy() {
    const btn = $("#copyBib");
    if (!btn) return;
    const toast = $("#toast");
    btn.addEventListener("click", async () => {
      const text = $("#bibtex").textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      $("#copyLabel").textContent = "COPIED";
      btn.classList.add("is-done");
      toast.classList.add("is-on");
      setTimeout(() => {
        $("#copyLabel").textContent = "COPY";
        btn.classList.remove("is-done");
        toast.classList.remove("is-on");
      }, 1600);
    });
  }

  /* ------------------------------------------------------- lazy playback -- */
  function initLazyVideos() {
    const vids = $$("video[data-lazyplay]");
    if (!vids.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      vids.forEach((v) => { v.preload = "metadata"; });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting) {
            if (!v.dataset.started) {
              v.preload = "auto";
              v.dataset.started = "1";
            }
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: "120px 0px", threshold: 0.15 }
    );
    vids.forEach((v) => io.observe(v));
  }

  /* ------------------------------------------------------------- bilibili -- */
  function initBilibili() {
    const list = $("#playlist");
    if (!list) return;
    const player = $("#bilibili .player");
    const nowEn = $("#biliNow");
    const nowZh = $("#biliNowZh");
    const link = $("#biliLink");
    const embedSrc = (bvid) =>
      `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=1`;

    let active = "BV1MY9KBYE6u";

    function showPlayer(bvid) {
      let frame = $("#biliFrame");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "biliFrame";
        frame.title = "Bilibili player";
        frame.setAttribute("allowfullscreen", "");
        frame.setAttribute("scrolling", "no");
        frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        const poster = $("#biliStart");
        if (poster) poster.remove();
        player.appendChild(frame);
      }
      frame.src = embedSrc(bvid);
      active = bvid;
    }

    function select(item, load) {
      const bvid = item.dataset.bvid;
      $$(".plitem", list).forEach((x) => x.classList.toggle("is-active", x === item));
      const en = $("b[data-i18n-en]", item);
      const zh = $("b[data-i18n-zh]", item);
      if (en && nowEn) nowEn.textContent = en.textContent;
      if (zh && nowZh) nowZh.textContent = zh.textContent;
      if (link) link.href = item.getAttribute("href");
      const poster = $("#biliPoster");
      const img = $("img", item);
      if (poster && img) poster.src = img.currentSrc || img.src;
      item.scrollIntoView({ block: "nearest" });
      if (load) showPlayer(bvid);
      else active = bvid;
    }

    const start = $("#biliStart");
    if (start) start.addEventListener("click", () => showPlayer(active));

    $$(".plitem", list).forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        select(item, true);
      });
    });
  }

  /* ----------------------------------------------------------------- boot -- */
  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initCounters();
    initNav();
    initLang();
    initCategories();
    initMetricChart();
    initSamples();
    initGallery();
    initLazyVideos();
    initBilibili();
    initModal();
    initCopy();
    if (reduceMotion) {
      $$("video[autoplay]").forEach((v) => v.pause());
    }
  });
})();
