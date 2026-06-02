/* ===== Kuwait Smart Border Declaration — app logic ===== */
(function () {
  "use strict";

  var lang = "en";
  var state = {}; // collected form data

  /* ---------- i18n ---------- */
  function t(key) {
    var dict = window.I18N[lang] || window.I18N.en;
    return dict[key] != null ? dict[key] : (window.I18N.en[key] || key);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      // keep the required asterisk if present
      var star = el.querySelector("i");
      el.textContent = t(key);
      if (star) { var i = document.createElement("i"); i.textContent = " *"; el.appendChild(i); }
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.querySelectorAll(".wlang").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-lang") === lang);
    });
  }

  // language can be set from the welcome hotspots or any [data-lang] control
  document.addEventListener("click", function (e) {
    var lb = e.target.closest("[data-lang]");
    if (!lb) return;
    lang = lb.getAttribute("data-lang");
    applyLang();
  });

  /* ---------- navigation ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var el = document.getElementById(id);
    if (el) { el.classList.add("is-active"); }
    // full-image screens (welcome + design pages) are full-bleed with no bottom nav
    var noChrome = id === "screen-welcome" || (el && el.classList.contains("screen-img"));
    document.getElementById("bottomnav").style.display = noChrome ? "none" : "flex";
    document.getElementById("app").classList.toggle("no-nav", noChrome);
    document.querySelectorAll(".nav-item").forEach(function (n) { n.classList.remove("is-active"); });
    var homeNav = document.querySelector('.nav-item[data-goto="screen-welcome"]');
    if (id === "screen-welcome" && homeNav) homeNav.classList.add("is-active");
    window.scrollTo(0, 0);
    var scroll = el && el.querySelector(".screen-scroll");
    if (scroll) scroll.scrollTop = 0;
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-goto]");
    if (trigger) { e.preventDefault(); show(trigger.getAttribute("data-goto")); }
  });

  /* ---------- populate country selects ---------- */
  function fillCountries() {
    var nat = document.querySelector('select[name="nationality"]');
    var dep = document.getElementById("departure");
    var prev = document.getElementById("prev-select");
    window.COUNTRIES.forEach(function (c) {
      [nat, dep, prev].forEach(function (sel) {
        if (!sel) return;
        var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
      });
    });
    if (dep) dep.value = "Iraq";
  }

  /* ---------- chips (single select) ---------- */
  document.querySelectorAll(".chip-grid[data-single]").forEach(function (grid) {
    grid.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      grid.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      var hidden = grid.parentElement.querySelector('input[type="hidden"]');
      if (hidden) hidden.value = chip.getAttribute("data-value");
    });
  });

  /* ---------- previous countries (multi tag) ---------- */
  var prevCountries = [];
  function renderTags() {
    var wrap = document.getElementById("prev-tags");
    wrap.innerHTML = "";
    prevCountries.forEach(function (c) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = "<span>" + c + "</span>";
      var x = document.createElement("button");
      x.type = "button"; x.textContent = "✕";
      x.addEventListener("click", function () {
        prevCountries = prevCountries.filter(function (p) { return p !== c; });
        renderTags();
      });
      tag.appendChild(x);
      wrap.appendChild(tag);
    });
  }
  // seed with the mockup values
  prevCountries = ["Türkiye", "United Arab Emirates", "Jordan"];

  /* ---------- items "None" exclusivity ---------- */
  var itemsWrap = document.getElementById("items");
  if (itemsWrap) {
    itemsWrap.addEventListener("change", function (e) {
      var box = e.target;
      var none = itemsWrap.querySelector("input[data-none]");
      if (box.hasAttribute("data-none") && box.checked) {
        itemsWrap.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          if (cb !== none) cb.checked = false;
        });
      } else if (box.checked && none) {
        none.checked = false;
      }
    });
  }

  /* ---------- yes/no toggles ---------- */
  document.querySelectorAll(".yesno").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".yn");
      if (!btn) return;
      group.querySelectorAll(".yn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      group.toggleAttribute("data-warn", btn.getAttribute("data-value") === "Yes");
    });
  });

  /* ---------- step 1 submit ---------- */
  document.getElementById("form-step1").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    var fd = new FormData(this);
    state.traveler = Object.fromEntries(fd.entries());
    show("screen-step2");
  });

  /* ---------- step 2 submit -> compute decision ---------- */
  document.getElementById("form-step2").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = this;
    var get = function (n) { var el = f.querySelector('[name="' + n + '"]'); return el ? el.value : ""; };
    var yn = function (n) { var a = f.querySelector('.yesno[data-name="' + n + '"] .yn.is-active'); return a ? a.getAttribute("data-value") : "No"; };
    var items = Array.from(f.querySelectorAll('input[name="items"]:checked')).map(function (c) { return c.value; });

    if (!get("departure")) { document.getElementById("departure").focus(); return; }

    // Collected for the record only. The traveller is NOT shown any
    // approval / risk outcome — only the officer side sees the assessment.
    state.travel = {
      purpose: get("purpose"),
      departure: get("departure"),
      previous: prevCountries.slice(),
      duration: get("duration"),
      items: items,
      cash: parseFloat(get("cash")) || 0,
      restricted: yn("restricted"),
      merchandise: yn("merchandise"),
      largecash: yn("largecash")
    };

    show("screen-vehicle");
  });

  /* ---------- step 3 (vehicle) submit -> confirmation ---------- */
  document.getElementById("form-vehicle").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    var fd = new FormData(this);
    state.vehicle = Object.fromEntries(fd.entries());
    renderConfirmation();
    show("screen-result");
  });

  /* ---------- result rendering ---------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function refCode(prefix) {
    var d = new Date();
    var rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return prefix + "-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "-" + rand;
  }

  function renderConfirmation() {
    var ref = refCode("KSB");
    state.reference = ref;

    // assign a lane (1–8) — neutral, no approval meaning
    var lane = 1 + Math.floor(Math.random() * 8);
    var d = new Date();
    var dateOpts = { weekday: "short", day: "2-digit", month: "short", year: "numeric" };

    document.getElementById("res-lane").textContent = lane;
    document.getElementById("res-date").textContent = d.toLocaleDateString("en-GB", dateOpts);
    document.getElementById("res-valid").textContent = "23:59 · " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    document.getElementById("res-ref").textContent = ref;

    var v = state.vehicle || {};
    var vehicleText = [v.plate, v.model].filter(Boolean).join(" · ") || "—";
    document.getElementById("res-vehicle").textContent = vehicleText;

    drawQR(document.getElementById("qr-canvas"), ref);
  }

  /* ---------- pseudo-QR (deterministic from reference) ---------- */
  function drawQR(canvas, seedStr) {
    var ctx = canvas.getContext("2d");
    var size = canvas.width, modules = 29, cell = size / modules;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
    // seeded PRNG
    var seed = 0; for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    ctx.fillStyle = "#0c1c36";
    for (var y = 0; y < modules; y++) {
      for (var x = 0; x < modules; x++) {
        if (inFinder(x, y, modules)) continue;
        if (rnd() > 0.5) ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    drawFinder(ctx, 0, 0, cell);
    drawFinder(ctx, (modules - 7) * cell, 0, cell);
    drawFinder(ctx, 0, (modules - 7) * cell, cell);
  }
  function inFinder(x, y, m) {
    return (x < 8 && y < 8) || (x >= m - 8 && y < 8) || (x < 8 && y >= m - 8);
  }
  function drawFinder(ctx, ox, oy, cell) {
    ctx.fillStyle = "#0c1c36"; ctx.fillRect(ox, oy, cell * 7, cell * 7);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(ox + cell, oy + cell, cell * 5, cell * 5);
    ctx.fillStyle = "#0c1c36"; ctx.fillRect(ox + cell * 2, oy + cell * 2, cell * 3, cell * 3);
  }

  /* ---------- init ---------- */
  fillCountries();
  renderTags();
  document.getElementById("prev-select").addEventListener("change", function () {
    var v = this.value;
    if (v && prevCountries.indexOf(v) === -1) { prevCountries.push(v); renderTags(); }
    this.value = "";
  });
  applyLang();
  show("screen-welcome");
})();
