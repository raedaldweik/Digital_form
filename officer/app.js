/* ===== Kuwait Smart Border — Officer App ===== */
(function () {
  "use strict";

  /* ---------- sample data (would come from SAS Visual Investigator) ---------- */
  var TASKS = [
    {
      id: "t1", plate: "KW 3 · 84210", decl: "SBD-7731", driver: "Yusuf Al-Harbi",
      nat: "Kuwait", vehicle: "Toyota Land Cruiser · White", lane: 3, score: 86,
      status: "pending", eta: "ETA 4 min",
      insuranceExpiry: "2024-09-18", insuranceExpired: true,
      dualUse: "Industrial centrifuge parts", incidents: 2,
      declMatch: false
    },
    {
      id: "t2", plate: "KW 5 · 11045", decl: "SBD-7745", driver: "Omar Khalifa",
      nat: "Iraq", vehicle: "Mercedes Actros · Freight", lane: 5, score: 72,
      status: "pending", eta: "ETA 7 min",
      insuranceExpiry: "2024-12-30", insuranceExpired: true,
      dualUse: null, incidents: 1, declMatch: true
    },
    {
      id: "t3", plate: "KW 9 · 52910", decl: "SBD-7760", driver: "Mohammed Saleh",
      nat: "U.A.E.", vehicle: "Nissan Patrol · Black", lane: 4, score: 64,
      status: "pending", eta: "ETA 11 min",
      insuranceExpiry: "2025-03-14", insuranceExpired: false,
      dualUse: "Drone components", incidents: 0, declMatch: false
    },
    {
      id: "t4", plate: "KW 1 · 47788", decl: "SBD-7766", driver: "Aisha Rahman",
      nat: "Egypt", vehicle: "Hyundai Tucson · Silver", lane: 1, score: 41,
      status: "pending", eta: "ETA 14 min",
      insuranceExpiry: "2025-06-02", insuranceExpired: false,
      dualUse: null, incidents: 1, declMatch: true
    },
    {
      id: "t5", plate: "KW 2 · 90233", decl: "SBD-7752", driver: "Sara Al-Najjar",
      nat: "Jordan", vehicle: "Kia Sportage · Grey", lane: 2, score: 23,
      status: "cleared", eta: "Cleared",
      insuranceExpiry: "2026-01-20", insuranceExpired: false,
      dualUse: null, incidents: 0, declMatch: true
    },
    {
      id: "t6", plate: "KW 6 · 33019", decl: "SBD-7770", driver: "Khalid Mansour",
      nat: "Saudi Arabia", vehicle: "GMC Yukon · White", lane: 6, score: 18,
      status: "cleared", eta: "Cleared",
      insuranceExpiry: "2025-11-09", insuranceExpired: false,
      dualUse: null, incidents: 0, declMatch: true
    }
  ];

  var ALERTS = [
    { id: "a1", sev: "red", unread: true, time: "2m", title: "High-risk vehicle flagged",
      body: "KW 3 · 84210 scored 86. Dual-use goods + expired insurance. Immediate inspection advised." },
    { id: "a2", sev: "amber", unread: true, time: "9m", title: "Expired insurance detected",
      body: "KW 5 · 11045 — policy lapsed on 30 Dec 2024. Verify documents before clearance." },
    { id: "a3", sev: "blue", unread: true, time: "15m", title: "New task assigned",
      body: "KW 9 · 52910 routed to Lane 4 for your assessment." },
    { id: "a4", sev: "red", unread: false, time: "32m", title: "Dual-use components match",
      body: "Drone components declared on SBD-7760 matched the controlled-items watchlist." },
    { id: "a5", sev: "green", unread: false, time: "1h", title: "Vehicle cleared",
      body: "KW 2 · 90233 cleared with low risk (23). No action required." },
    { id: "a6", sev: "blue", unread: false, time: "2h", title: "SAS model updated",
      body: "Risk scoring model v3.2 deployed. Incident-history weighting increased." }
  ];

  function levelOf(score) { return score >= 70 ? "High" : score >= 40 ? "Medium" : "Low"; }
  function colorOf(level) { return level === "High" ? "#ff453a" : level === "Medium" ? "#ffd60a" : "#30d158"; }

  /* progress ring as SVG string */
  function ring(score, size) {
    var stroke = size >= 90 ? 7 : 5;
    var r = (size - stroke) / 2 - 1;
    var c = 2 * Math.PI * r;
    var off = c * (1 - score / 100);
    var col = colorOf(levelOf(score));
    var cx = size / 2;
    var inner = size >= 90
      ? '<span class="score">' + score + '<small>RISK</small></span>'
      : '<span class="score">' + score + '</span>';
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="rgba(255,255,255,.1)" stroke-width="' + stroke + '" fill="none"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + col + '" stroke-width="' + stroke + '" fill="none" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="filter:drop-shadow(0 0 6px ' + col + '88)"/>' +
      '</svg>' + inner + '</div>';
  }

  var flagIc = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

  function flagsHTML(t) {
    var f = "";
    if (t.dualUse) f += '<span class="flag red">' + flagIc + 'Dual-use</span>';
    if (t.insuranceExpired) f += '<span class="flag amber">' + flagIc + 'Insurance</span>';
    if (t.incidents > 0) f += '<span class="flag amber">' + flagIc + t.incidents + ' incident' + (t.incidents > 1 ? 's' : '') + '</span>';
    if (!t.dualUse && !t.insuranceExpired && t.incidents === 0) f += '<span class="flag">No flags</span>';
    return f;
  }

  function taskCard(t) {
    var lvl = levelOf(t.score);
    return '<div class="task glass" data-task="' + t.id + '">' +
      ring(t.score, 56) +
      '<div class="task-main">' +
        '<div class="task-top"><span class="plate">' + t.plate + '</span><span class="lane">Lane ' + t.lane + '</span></div>' +
        '<div class="task-driver">' + t.driver + ' · ' + t.nat + ' · <span class="level-tag level-' + lvl + '">' + lvl + ' risk</span></div>' +
        '<div class="flags">' + flagsHTML(t) + '</div>' +
      '</div>' +
      '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
    '</div>';
  }

  /* ---------- renders ---------- */
  function renderHome() {
    var pending = TASKS.filter(function (t) { return t.status === "pending"; });
    var high = TASKS.filter(function (t) { return levelOf(t.score) === "High"; });
    var unread = ALERTS.filter(function (a) { return a.unread; });
    document.getElementById("stat-assigned").textContent = pending.length;
    document.getElementById("stat-high").textContent = high.length;
    document.getElementById("stat-alerts").textContent = unread.length;
    document.getElementById("badge-tasks").textContent = pending.length;
    document.getElementById("badge-alerts").textContent = unread.length;

    var top = TASKS.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 2);
    document.getElementById("priority-list").innerHTML = top.map(taskCard).join("");
  }

  var currentFilter = "all";
  function renderTasks() {
    var list = TASKS.filter(function (t) {
      if (currentFilter === "all") return true;
      if (currentFilter === "pending") return t.status === "pending";
      return levelOf(t.score) === currentFilter;
    });
    document.getElementById("task-list").innerHTML =
      list.length ? list.map(taskCard).join("") : '<p style="color:var(--muted);text-align:center;padding:30px">No tasks in this view.</p>';
  }

  function kv(icon, key, valueHTML) {
    return '<div class="kv"><span class="k"><span class="kic">' + icon + '</span>' + key + '</span><span class="v">' + valueHTML + '</span></div>';
  }

  function factorBar(name, weight, active) {
    var col = active ? (weight >= 25 ? "#ff453a" : "#ffd60a") : "#30d158";
    return '<div class="factor"><div class="factor-h"><span class="fn">' + name + '</span>' +
      '<span class="fw" style="color:' + col + '">+' + (active ? weight : 0) + '</span></div>' +
      '<div class="bar"><i style="width:' + (active ? Math.min(100, weight * 3) : 6) + '%;background:' + col + '"></i></div></div>';
  }

  var ICN = {
    car: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14v4H5z"/><circle cx="8" cy="17" r="1.2"/><circle cx="16" cy="17" r="1.2"/></svg>',
    doc: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z"/></svg>',
    box: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M6 20a6 6 0 0 1 12 0"/></svg>',
    cal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg>'
  };

  function renderTask(t) {
    var lvl = levelOf(t.score);
    var col = colorOf(lvl);
    document.getElementById("task-title").textContent = t.plate;

    var flagged = lvl === "High" || t.dualUse || t.insuranceExpired;
    var reco = flagged
      ? '<div class="reco"><span class="ric">' + flagIc.replace('12" height="12"', '20" height="20"').replace('stroke-width="2"', 'stroke="#ff8077" stroke-width="2"') + '</span><div><b>Requires additional investigation</b><p>SAS Visual Investigator recommends a secondary inspection before clearance.</p></div></div>'
      : '<div class="reco clear"><span class="ric"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5be584" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div><b>Eligible for clearance</b><p>No high-risk indicators detected. Standard processing recommended.</p></div></div>';

    var insV = t.insuranceExpired
      ? '<span class="pill-bad">EXPIRED · ' + fmt(t.insuranceExpiry) + '</span>'
      : '<span class="pill-ok">VALID · ' + fmt(t.insuranceExpiry) + '</span>';
    var dualV = t.dualUse
      ? '<span class="pill-bad">DETECTED</span>'
      : '<span class="pill-ok">NONE</span>';

    var html =
      '<div class="risk-hero glass-hi glass">' + ring(t.score, 96) +
        '<div class="rh-tx"><div class="lvl" style="color:' + col + '">' + lvl + ' Risk</div>' +
        '<div class="src"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#64d2ff" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Assessed by <b>SAS Visual Investigator</b></div>' +
        '<div class="src">' + t.vehicle + ' · ' + t.eta + '</div></div></div>' +

      reco +

      '<div class="info-card glass"><h4>Key Indicators</h4>' +
        kv(ICN.box, "Dual-use products", dualV) +
        (t.dualUse ? '<div class="kv"><span class="k" style="padding-left:40px">Item</span><span class="v" style="font-weight:600;color:#cdd6ee">' + t.dualUse + '</span></div>' : '') +
        kv(ICN.shield, "Insurance expiry", insV) +
        kv(ICN.car, "Vehicle number", t.plate) +
        kv(ICN.doc, "Declaration code", t.decl + (t.declMatch ? '' : ' <span class="pill-bad" style="margin-left:6px">MISMATCH</span>')) +
        kv(ICN.user, "Person history", (t.incidents > 0 ? '<span class="v red">' + t.incidents + ' incident' + (t.incidents > 1 ? 's' : '') + '</span>' : '<span class="v green">Clean</span>')) +
      '</div>' +

      '<div class="info-card glass"><h4>Risk Score Breakdown</h4>' +
        factorBar("Dual-use / controlled items", 30, !!t.dualUse) +
        factorBar("Insurance compliance", 18, t.insuranceExpired) +
        factorBar("Person incident history", 22, t.incidents > 0) +
        factorBar("Declaration consistency", 16, !t.declMatch) +
        factorBar("Watchlist / nationality risk", 14, t.score >= 60) +
      '</div>' +

      '<div class="actions">' +
        '<button class="btn btn-clear" data-action="clear"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Clear</button>' +
        '<button class="btn btn-flag" data-action="flag"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4M4 4h13l-3 4 3 4H4"/></svg> Flag for Inspection</button>' +
      '</div>';

    document.getElementById("task-detail").innerHTML = html;
  }

  function fmt(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderAlerts() {
    document.getElementById("alert-list").innerHTML = ALERTS.map(function (a) {
      var ic = a.sev === "green"
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
        : a.sev === "blue"
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg>'
        : flagIc.replace('12" height="12"', '20" height="20"').replace('stroke="currentColor"', 'stroke="#fff"');
      return '<div class="alert glass ' + (a.unread ? 'al-unread' : '') + '">' +
        '<span class="al-ic ' + a.sev + '">' + ic + '</span>' +
        '<div class="al-tx"><div class="at"><b>' + a.title + '</b><span class="time">' + a.time + '</span></div>' +
        '<p>' + a.body + '</p></div></div>';
    }).join("");
  }

  /* ---------- navigation ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var el = document.getElementById(id);
    if (el) el.classList.add("is-active");
    var scroll = el && el.querySelector(".scroll");
    if (scroll) scroll.classList.add("fade-in");
    setTimeout(function () { if (scroll) scroll.classList.remove("fade-in"); }, 360);

    // tab bar visibility + active state
    var bar = document.getElementById("tabbar");
    var hideBar = id === "screen-task";
    bar.classList.toggle("hidden", hideBar);
    document.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-tab") === id);
    });
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    var taskEl = e.target.closest("[data-task]");
    if (taskEl) {
      var t = TASKS.filter(function (x) { return x.id === taskEl.getAttribute("data-task"); })[0];
      if (t) { renderTask(t); show("screen-task"); }
      return;
    }
    var nav = e.target.closest("[data-tab]");
    if (nav) { show(nav.getAttribute("data-tab")); return; }

    var filt = e.target.closest("[data-filter]");
    if (filt) {
      document.querySelectorAll("#task-filters .fchip").forEach(function (c) { c.classList.remove("is-active"); });
      filt.classList.add("is-active");
      currentFilter = filt.getAttribute("data-filter");
      renderTasks();
      return;
    }
    var act = e.target.closest("[data-action]");
    if (act) {
      var label = act.getAttribute("data-action") === "clear" ? "Vehicle cleared ✓" : "Flagged for inspection ⚑";
      act.closest(".actions").innerHTML = '<div class="reco ' + (act.getAttribute("data-action") === "clear" ? "clear" : "") + '" style="grid-column:1/-1;justify-content:center"><b>' + label + '</b></div>';
    }
  });

  /* ---------- init ---------- */
  renderHome();
  renderTasks();
  renderAlerts();
})();
