/* ===== Kuwait Smart Border Declaration — app logic ===== */
(function () {
  "use strict";

  var lang = "ar";              // Arabic is the primary language
  var state = { documents: {} }; // collected form data + uploaded document images

  /* ---------- i18n ---------- */
  function t(key) {
    var dict = window.I18N[lang] || window.I18N.ar;
    return dict[key] != null ? dict[key] : (window.I18N.ar[key] || key);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var star = el.querySelector("i"); // keep the required asterisk if present
      el.textContent = t(key);
      if (star) { var i = document.createElement("i"); i.textContent = " *"; el.appendChild(i); }
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.querySelectorAll(".wlang[data-setlang]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-setlang") === lang);
    });
  }

  /* language pill (welcome) — explicit العربية / English */
  document.addEventListener("click", function (e) {
    var lb = e.target.closest("[data-setlang]");
    if (!lb) return;
    lang = lb.getAttribute("data-setlang");
    applyLang();
  });

  /* ---------- navigation ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var el = document.getElementById(id);
    if (el) { el.classList.add("is-active"); }
    var noChrome = id === "screen-welcome";
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

  /* ---------- populate country selects (Arabic labels) ---------- */
  function countryLabel(c) { return (lang === "ar" && window.COUNTRIES_AR[c]) ? window.COUNTRIES_AR[c] : c; }
  function fillCountries() {
    var nat = document.querySelector('select[name="nationality"]');
    var dep = document.getElementById("departure");
    var prev = document.getElementById("prev-select");
    window.COUNTRIES.forEach(function (c) {
      [nat, dep, prev].forEach(function (sel) {
        if (!sel) return;
        var o = document.createElement("option"); o.value = c; o.textContent = countryLabel(c); sel.appendChild(o);
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
    if (!wrap) return;
    wrap.innerHTML = "";
    prevCountries.forEach(function (c) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = "<span>" + countryLabel(c) + "</span>";
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

  /* ---------- yes/no toggles (incl. wakala type) ---------- */
  document.querySelectorAll(".yesno").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".yn");
      if (!btn) return;
      group.querySelectorAll(".yn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      group.toggleAttribute("data-warn", btn.getAttribute("data-value") === "Yes");
      // wakala toggle writes to a hidden input next to it
      var name = group.getAttribute("data-name");
      var hidden = name && group.parentElement.querySelector('input[type="hidden"][name="' + name + '"]');
      if (hidden) hidden.value = btn.getAttribute("data-value");
    });
  });

  /* ---------- document upload + simulated OCR autofill ---------- */
  // shrink an uploaded image to keep localStorage small, return a JPEG data URL
  function compressImage(file, maxDim, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
        try { cb(canvas.toDataURL("image/jpeg", 0.7)); }
        catch (e) { cb(reader.result); }
      };
      img.onerror = function () { cb(reader.result); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // sample data the "OCR" pretends to read from the document
  var SAMPLE_PASSPORTS = [
    { passport: "K2891453", fullname: "Yusuf Ahmad Al-Harbi", nationality: "Kuwait", dob: "1989-04-12" },
    { passport: "A7740219", fullname: "Omar Khalifa Mansour", nationality: "Iraq", dob: "1985-11-30" },
    { passport: "E1183562", fullname: "Aisha Rahman Said", nationality: "Egypt", dob: "1992-02-08" },
    { passport: "S9032118", fullname: "Khalid Nasser Al-Otaibi", nationality: "Saudi Arabia", dob: "1979-07-21" }
  ];
  var SAMPLE_DAFTAR = [
    { plate: "3 / 84210", regcountry: "Kuwait", vtype: "SUV", model: "Toyota Land Cruiser", color: "White" },
    { plate: "5 / 11045", regcountry: "Iraq", vtype: "Truck", model: "Mercedes Actros", color: "Silver" },
    { plate: "9 / 52910", regcountry: "U.A.E.", vtype: "SUV", model: "Nissan Patrol", color: "Black" },
    { plate: "1 / 47788", regcountry: "Kuwait", vtype: "Sedan", model: "Hyundai Sonata", color: "Grey" }
  ];

  function setField(name, value) {
    var el = document.querySelector('[name="' + name + '"]');
    if (!el || value == null) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function pickSample(list, seedStr) {
    var seed = 0; for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    return list[seed % list.length];
  }

  function autofillPassport(data) {
    setField("passport", data.passport);
    setField("fullname", data.fullname);
    var nat = document.querySelector('select[name="nationality"]');
    if (nat) nat.value = data.nationality;
    setField("dob", data.dob);
  }
  function autofillDaftar(data) {
    setField("plate", data.plate);
    var rc = document.querySelector('select[name="regcountry"]'); if (rc) rc.value = data.regcountry;
    var vt = document.querySelector('select[name="vtype"]'); if (vt) vt.value = data.vtype;
    setField("model", data.model);
    setField("color", data.color);
  }

  document.querySelectorAll(".uploader").forEach(function (up) {
    var input = up.querySelector('input[type="file"]');
    var docType = up.getAttribute("data-doc");
    up.addEventListener("click", function (e) {
      if (e.target.closest(".up-change")) { input.click(); return; }
      input.click();
    });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      up.classList.add("is-busy"); up.classList.remove("is-done");
      up.querySelector(".up-inner").innerHTML =
        '<span class="up-spin"></span><div class="up-tx"><b>' + t("upload.reading") + '</b></div>';

      compressImage(file, 1100, function (dataUrl) {
        state.documents[docType] = dataUrl;
        var sample = docType === "passport"
          ? pickSample(SAMPLE_PASSPORTS, file.name + file.size)
          : pickSample(SAMPLE_DAFTAR, file.name + file.size);
        // store the OCR-extracted summary too
        state[docType === "passport" ? "ocrPassport" : "ocrDaftar"] = sample;

        setTimeout(function () {
          if (docType === "passport") autofillPassport(sample); else autofillDaftar(sample);
          up.classList.remove("is-busy"); up.classList.add("is-done");
          up.querySelector(".up-inner").innerHTML =
            '<span class="up-thumb"><img src="' + dataUrl + '" alt=""/></span>' +
            '<div class="up-tx"><b class="up-ok">✓ ' + t("upload.done") + '</b>' +
            '<small>' + (file.name || "") + '</small></div>' +
            '<button type="button" class="up-change">' + t("upload.change") + '</button>';
        }, 1400);
      });
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

  /* ---------- step 2 submit ---------- */
  document.getElementById("form-step2").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = this;
    var get = function (n) { var el = f.querySelector('[name="' + n + '"]'); return el ? el.value : ""; };
    var yn = function (n) { var a = f.querySelector('.yesno[data-name="' + n + '"] .yn.is-active'); return a ? a.getAttribute("data-value") : "No"; };
    var items = Array.from(f.querySelectorAll('input[name="items"]:checked')).map(function (c) { return c.value; });

    if (!get("departure")) { document.getElementById("departure").focus(); return; }

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

  /* ---------- step 3 (vehicle + wakala) submit -> confirmation ---------- */
  document.getElementById("form-vehicle").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    var fd = new FormData(this);
    var all = Object.fromEntries(fd.entries());
    state.vehicle = { plate: all.plate, regcountry: all.regcountry, vtype: all.vtype, model: all.model, color: all.color };
    state.wakala = { type: all.wakalaType || "Kuwait", number: all.wakalaNumber || "" };
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
    var lane = 1 + Math.floor(Math.random() * 8);
    var d = new Date();
    var loc = lang === "ar" ? "ar-KW" : "en-GB";
    var dateOpts = { weekday: "short", day: "2-digit", month: "short", year: "numeric" };

    document.getElementById("res-lane").textContent = lane;
    document.getElementById("res-date").textContent = d.toLocaleDateString(loc, dateOpts);
    document.getElementById("res-valid").textContent = "23:59 · " + d.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" });
    document.getElementById("res-ref").textContent = ref;

    var v = state.vehicle || {};
    document.getElementById("res-vehicle").textContent = [v.plate, v.model].filter(Boolean).join(" · ") || "—";

    saveSubmission(ref, lane);
  }

  /* Persist the FULL submission so the Officer app can show every answer + documents. */
  function saveSubmission(ref, lane) {
    try {
      var tr = state.traveler || {}, v = state.vehicle || {}, tv = state.travel || {}, wk = state.wakala || {};
      var sub = {
        ref: ref,
        lane: lane,
        submittedAt: Date.now(),
        // convenience fields for the officer list / search
        driver: tr.fullname || "مسافر",
        nat: tr.nationality || "—",
        plate: v.plate ? ("KW " + v.plate) : "KW —",
        vehicle: [v.model, v.color].filter(Boolean).join(" · ") || "—",
        decl: ref,
        // full structured record
        traveler: tr,
        travel: tv,
        vehicleInfo: v,
        wakala: wk,
        documents: state.documents || {}
      };
      var key = "ksb_submissions";
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push(sub);
      if (arr.length > 25) arr = arr.slice(arr.length - 25);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) { /* storage unavailable / quota — ignore */ }
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
