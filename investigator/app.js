/* ===== Kuwait Smart Border — Investigator App =====
   SAS Visual Investigator on a phone (Arabic / RTL). The investigator receives
   cases the officer forwarded (ksb_decisions[ref] === "investigator"), works them
   with a SAS-VI-style scorecard, scenario triggers, link-analysis network, map,
   x-ray and an investigation assistant, then makes the FINAL approve/reject call. */
(function () {
  "use strict";

  /* ---------- localized labels ---------- */
  var AR = {
    countries: {
      "Iraq":"العراق","Saudi Arabia":"السعودية","United Arab Emirates":"الإمارات","U.A.E.":"الإمارات",
      "Bahrain":"البحرين","Qatar":"قطر","Oman":"عُمان","Jordan":"الأردن","Egypt":"مصر","Türkiye":"تركيا",
      "Lebanon":"لبنان","Syria":"سوريا","Yemen":"اليمن","Kuwait":"الكويت","Iran":"إيران","India":"الهند",
      "Pakistan":"باكستان","Germany":"ألمانيا","Other":"أخرى","—":"—"
    },
    purpose: { Tourism:"سياحة", Business:"أعمال", Family:"زيارة عائلية", Medical:"علاج", Transit:"عبور" },
    duration: { "1-7":"١ - ٧ أيام", "8-30":"٨ - ٣٠ يوماً", "30+":"أكثر من ٣٠ يوماً" },
    vtype: { Sedan:"سيدان", SUV:"دفع رباعي", Pickup:"بيك أب", Van:"فان", Bus:"حافلة", Truck:"شاحنة", Motorcycle:"دراجة نارية" },
    items: { Currency:"عملات", Electronics:"إلكترونيات", Medication:"أدوية", Commercial:"بضائع تجارية", None:"لا شيء" },
    strategy: { Customs:"جمارك", Air:"جوي" },
    hs: {
      "2841700000":"مركّبات كيميائية — موليبدات",
      "2710190000":"زيوت بترولية ومقطّرات",
      "8471300000":"حواسيب وأجهزة إلكترونية",
      "7108120000":"ذهب خام غير مشغول"
    }
  };
  function ctry(c) { return AR.countries[c] || c || "—"; }
  function yn(v) { return v === "Yes" ? "نعم" : "لا"; }
  function toAr(s) { return String(s).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function fmtAge(ms) {
    if (!ms) return "—";
    var min = Math.max(1, Math.round((Date.now() - ms) / 60000));
    if (min < 60) return toAr(min) + " د";
    var hr = Math.round(min / 60); if (hr < 24) return toAr(hr) + " س";
    var d = Math.round(hr / 24); return toAr(d) + " يوم";
  }

  /* ---------- persistence: decisions, history, submissions ---------- */
  function getDecisions() { try { return JSON.parse(localStorage.getItem("ksb_decisions") || "{}"); } catch (e) { return {}; } }
  function setDecision(ref, status) { var d = getDecisions(); d[ref] = status; try { localStorage.setItem("ksb_decisions", JSON.stringify(d)); } catch (e) {} }
  function getHist() { try { return JSON.parse(localStorage.getItem("ksb_history") || "{}"); } catch (e) { return {}; } }
  function appendHistory(ref, action) {
    var h = getHist(); h[ref] = h[ref] || [];
    h[ref].push({ action: action, by: "mansour.alahmad", queue: "queue_chem", at: Date.now() });
    try { localStorage.setItem("ksb_history", JSON.stringify(h)); } catch (e) {}
  }
  function loadSubmissions() { try { return JSON.parse(localStorage.getItem("ksb_submissions") || "[]").slice().reverse(); } catch (e) { return []; } }

  /* ---------- SEED: customs consignment cases + forwarded traveller cases ---------- */
  var SEED = [
    {
      ref: "SBD-CST-001", lane: 3, submittedAt: Date.now() - 14 * 60000,
      traveler: { passport: "D7783001", fullname: "ماهر عبدالله (مخلّص جمركي)", nationality: "Kuwait", dob: "1980-03-15", dialcode: "+965", mobile: "55008811", email: "maher@clearance.kw" },
      travel: { purpose: "Business", departure: "Germany", previous: ["Türkiye"], duration: "8-30", items: ["None"], cash: 0, restricted: "Yes", merchandise: "No", largecash: "No" },
      vehicleInfo: { plate: "4 / 22815", regcountry: "Kuwait", vtype: "Truck", model: "Volvo FH", color: "White" },
      wakala: { type: "Kuwait", number: "WK-1180" }, documents: {},
      consignment: { id: "324931861", ref: "Cs 324931861", dMarn: "24BE1QZOYIHASOWQJD", dLrn: "00BEH74987313680", consigneeTIN: "KW-300441", entryNumber: "EN-2024-77310", hs: "2841700000", declaredValueKWD: 4200, grossMassKg: 1850, transportCostKWD: 2600, goodsDesc: "مواد كيميائية صناعية", origin: "Germany", consignor: "EuroTrade GmbH", consignee: "Continental Trading" }
    },
    {
      ref: "SBD-CST-002", lane: 5, submittedAt: Date.now() - 48 * 60000,
      traveler: { passport: "U5521003", fullname: "محمد صالح", nationality: "United Arab Emirates", dob: "1990-06-02", dialcode: "+965", mobile: "55667788", email: "m.saleh@example.com" },
      travel: { purpose: "Business", departure: "United Arab Emirates", previous: ["Bahrain"], duration: "1-7", items: ["Commercial"], cash: 2000, restricted: "No", merchandise: "Yes", largecash: "No" },
      vehicleInfo: { plate: "9 / 52910", regcountry: "U.A.E.", vtype: "Van", model: "Hyundai H1", color: "Silver" },
      wakala: { type: "NonKuwait", number: "WK-7781" }, documents: {},
      consignment: { id: "715662506", ref: "Cs 715662506", dMarn: "24AE7K2MWHQTLP0931", dLrn: "00BEH71120049", consigneeTIN: "KW-220975", entryNumber: "EN-2024-66120", hs: "8471300000", declaredValueKWD: 1200, grossMassKg: 1100, transportCostKWD: 400, goodsDesc: "أجهزة إلكترونية", origin: "United Arab Emirates", consignor: "Global Exports Ltd", consignee: "Avery Johnson Import" }
    },
    {
      ref: "SBD-CST-003", lane: 1, submittedAt: Date.now() - 95 * 60000,
      traveler: { passport: "S2210447", fullname: "سعد القحطاني", nationality: "Saudi Arabia", dob: "1987-12-09", dialcode: "+965", mobile: "55330077", email: "saad@example.com" },
      travel: { purpose: "Business", departure: "Saudi Arabia", previous: [], duration: "1-7", items: ["Commercial"], cash: 300, restricted: "No", merchandise: "Yes", largecash: "No" },
      vehicleInfo: { plate: "1 / 33770", regcountry: "Kuwait", vtype: "Sedan", model: "Toyota Camry", color: "White" },
      wakala: { type: "Kuwait", number: "WK-0301" }, documents: {},
      consignment: { id: "480221190", ref: "Cs 480221190", dMarn: "24SA3LPQK9920TZ4", dLrn: "00BEH50090012", consigneeTIN: "KW-110330", entryNumber: "EN-2024-55012", hs: "8471300000", declaredValueKWD: 6000, grossMassKg: 120, transportCostKWD: 60, goodsDesc: "هدايا شخصية وإلكترونيات", origin: "Saudi Arabia", consignor: "Gulf Freight Co", consignee: "Al Salem Trading" }
    },
    {
      ref: "SBD-7731", lane: 3, submittedAt: Date.now() - 8 * 60000,
      traveler: { passport: "K2891453", fullname: "يوسف أحمد الحربي", nationality: "Kuwait", dob: "1989-04-12", dialcode: "+965", mobile: "55012233", email: "yusuf@example.com" },
      travel: { purpose: "Business", departure: "Iraq", previous: ["Türkiye", "Iraq"], duration: "8-30", items: ["Commercial"], cash: 14500, restricted: "Yes", merchandise: "Yes", largecash: "Yes" },
      vehicleInfo: { plate: "3 / 84210", regcountry: "Kuwait", vtype: "SUV", model: "Toyota Land Cruiser", color: "White" },
      wakala: { type: "NonKuwait", number: "WK-2231" }, documents: {}
    },
    {
      ref: "SBD-7745", lane: 5, submittedAt: Date.now() - 26 * 60000,
      traveler: { passport: "A7740219", fullname: "عمر خليفة منصور", nationality: "Iraq", dob: "1985-11-30", dialcode: "+965", mobile: "55119922", email: "omar@example.com" },
      travel: { purpose: "Business", departure: "Iraq", previous: ["Jordan"], duration: "8-30", items: ["None"], cash: 3000, restricted: "No", merchandise: "Yes", largecash: "No" },
      vehicleInfo: { plate: "5 / 11045", regcountry: "Iraq", vtype: "Truck", model: "Mercedes Actros", color: "Silver" },
      wakala: { type: "Kuwait", number: "WK-0098" }, documents: {}
    }
  ];

  /* pre-seed the worklist so the investigator always has cases to work */
  (function seedDecisions() {
    var d = getDecisions(), changed = false;
    ["SBD-CST-001", "SBD-CST-002", "SBD-CST-003", "SBD-7731", "SBD-7745"].forEach(function (ref) {
      if (!d[ref]) { d[ref] = "investigator"; changed = true; }
    });
    if (changed) { try { localStorage.setItem("ksb_decisions", JSON.stringify(d)); } catch (e) {} }
  })();

  /* ---------- scenario scoring model (the SAS scorecard) ---------- */
  function scoreCase(a) {
    var t = a.travel || {}, c = a.consignment || {}, w = a.wakala || {}, v = a.vehicleInfo || {};
    var cash = parseFloat(t.cash) || 0;
    var mass = parseFloat(c.grossMassKg) || 0;
    var tcost = parseFloat(c.transportCostKWD) || 0;
    var value = parseFloat(c.declaredValueKWD) || 0;
    var ratio = mass > 0 ? tcost / mass : 0;
    var S = [];
    function add(id, descAr, base, active, mult) { S.push({ id: id, descAr: descAr, score: active ? Math.round(base * (mult || 1)) : 0, active: !!active }); }

    var chem = t.restricted === "Yes" || /كيميا|chem/i.test(c.goodsDesc || "") || ["2841700000", "2710190000"].indexOf(c.hs) >= 0;
    add("C1_Score", "تحتوي الشحنة على مواد كيميائية / بضائع مقيّدة عالية الخطورة", 389, chem, 1);
    add("C2_Score", "نسبة تكاليف النقل المعلنة إلى الوزن الإجمالي مرتفعة", 190, ratio >= 1.0, 1);
    add("C3_Score", "القيمة المصرّح بها منخفضة مقارنة بالوزن (مؤشر بخس قيمة)", 70, (value > 0 && mass > 0 && (value / mass) < 1.5), 2);
    add("C4_Score", "بضائع تجارية مصرّح بها", 45, (t.merchandise === "Yes" || (t.items || []).indexOf("Commercial") >= 0), 1.5);
    add("C5_Score", "نقد يتجاوز ١٠٬٠٠٠ د.ك", 60, (t.largecash === "Yes" || cash > 10000), 1.5);
    add("C6_Score", "دولة المنشأ / المغادرة عالية الخطورة", 55, (["Iraq", "Syria", "Iran", "Yemen"].indexOf(c.origin || t.departure) >= 0), 1.5);
    add("C7_Score", "وكالة تخليص غير كويتية", 40, (w.type === "NonKuwait"), 1.5);
    add("C8_Score", "تطابق مع قائمة مراقبة (جنسية / طرف مدرج)", 50, (["Syria", "Iran", "Yemen"].indexOf(a.nat) >= 0), 1.5);
    add("C9_Score", "مركبة مسجّلة خارج الكويت", 25, (v.regcountry && v.regcountry !== "Kuwait"), 1);

    var fired = S.filter(function (s) { return s.active; }).sort(function (x, y) { return y.score - x.score; });
    var total = fired.reduce(function (sum, s) { return sum + s.score; }, 0);
    var maxSc = S.reduce(function (m, s) { return Math.max(m, s.score); }, 1);
    return { total: total, scenarios: fired, all: S, maxScore: maxSc };
  }
  function ringPct(total) { return Math.min(100, Math.round(total / 6)); }
  function levelOf(p) { return p >= 70 ? "High" : p >= 42 ? "Medium" : "Low"; }
  function levelAr(l) { return l === "High" ? "عالية" : l === "Medium" ? "متوسطة" : "منخفضة"; }
  function colorOf(l) { return l === "High" ? "#df3a2f" : l === "Medium" ? "#d9870a" : "#0a9d57"; }
  function channel(total) {
    return total >= 300 ? { ar: "القناة الحمراء", c: "#df3a2f" }
         : total >= 120 ? { ar: "القناة الصفراء", c: "#d9870a" }
                        : { ar: "القناة الخضراء", c: "#0a9d57" };
  }

  /* ---------- ring (arc driven by pct, prints a raw label) ---------- */
  function ringEl(pct, label, size) {
    var stroke = size >= 90 ? 7 : 5;
    var r = (size - stroke) / 2 - 1, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    var col = colorOf(levelOf(pct)), cx = size / 2;
    var inner = size >= 90 ? '<span class="score">' + label + '<small>النقاط</small></span>' : '<span class="score">' + label + '</span>';
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="rgba(20,40,80,.10)" stroke-width="' + stroke + '" fill="none"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + col + '" stroke-width="' + stroke + '" fill="none" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="filter:drop-shadow(0 0 6px ' + col + '88)"/>' +
      '</svg>' + inner + '</div>';
  }

  /* ---------- normalize ---------- */
  function normalize(raw) {
    var v = raw.vehicleInfo || {};
    var o = {
      ref: raw.ref,
      driver: (raw.traveler && raw.traveler.fullname) || raw.driver || "مسافر",
      nat: (raw.traveler && raw.traveler.nationality) || raw.nat || "—",
      plate: v.plate ? ("KW " + v.plate) : (raw.plate || "KW —"),
      vehicleText: [v.model, v.color].filter(Boolean).join(" · ") || raw.vehicle || "—",
      lane: raw.lane || 1, submittedAt: raw.submittedAt || 0,
      traveler: raw.traveler || {}, travel: raw.travel || {}, vehicleInfo: v,
      wakala: raw.wakala || {}, documents: raw.documents || {}, consignment: raw.consignment || null,
      status: getDecisions()[raw.ref] || "pending"
    };
    o.sc = scoreCase(o);
    o.total = o.sc.total; o.pct = ringPct(o.total); o.level = levelOf(o.pct);
    o.strategy = o.consignment ? "Customs" : "Air";
    return o;
  }
  function allApplicants() {
    var combined = loadSubmissions().concat(SEED);
    var seen = {}, out = [];
    combined.forEach(function (r) { if (r.ref && !seen[r.ref]) { seen[r.ref] = 1; out.push(normalize(r)); } });
    return out;
  }
  function caseload() { return allApplicants().filter(function (a) { return a.status === "investigator" || a.status === "approved" || a.status === "rejected"; }); }
  function pending() { return allApplicants().filter(function (a) { return a.status === "investigator"; }); }
  function byRef(ref) { return allApplicants().filter(function (a) { return a.ref === ref; })[0]; }
  function strategyAr(a) { return AR.strategy[a.strategy] || a.strategy; }

  /* ---------- alert card (triage) ---------- */
  var flagIc = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  function statusTag(a) {
    if (a.status === "approved") return '<span class="newtag" style="background:#0a9d57">معتمد</span>';
    if (a.status === "rejected") return '<span class="newtag" style="background:#df3a2f">مرفوض</span>';
    return '<span class="newtag" style="background:#3a7bd5">قيد التحقيق</span>';
  }
  function alertFlags(a) {
    var f = "";
    a.sc.scenarios.slice(0, 2).forEach(function (s) {
      f += '<span class="flag ' + (s.score >= 150 ? "red" : "amber") + '">' + flagIc + s.id + ' +' + s.score + '</span>';
    });
    if (!f) f = '<span class="flag">لا توجد محفزات</span>';
    return f;
  }
  function alertCard(a) {
    var head = a.consignment ? ("شحنة " + a.consignment.id) : a.plate;
    var kind = a.consignment ? "H7 Consignment" : "مسافر";
    return '<div class="task glass" data-ref="' + a.ref + '">' +
      ringEl(a.pct, String(a.total), 56) +
      '<div class="task-main">' +
        '<div class="task-top"><span class="plate">' + head + '</span><span class="lane">' + strategyAr(a) + '</span>' + statusTag(a) + '</div>' +
        '<div class="task-driver">' + kind + ' · ' + a.driver + ' · <span class="level-tag level-' + a.level + '">مخاطر ' + levelAr(a.level) + '</span></div>' +
        '<div class="flags">' + alertFlags(a) + '</div>' +
      '</div>' +
      '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
    '</div>';
  }

  /* ============================ HOME ============================ */
  function miniBars(seedStr, col) {
    var seed = 0; for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    var bars = "", n = 14, w = 100 / n;
    for (var k = 0; k < n; k++) { var h = 12 + rnd() * 34; bars += '<rect x="' + (k * w + 1) + '" y="' + (46 - h) + '" width="' + (w - 2) + '" height="' + h + '" rx="1" fill="' + col + '" opacity="' + (0.5 + rnd() * 0.5) + '"/>'; }
    return '<svg viewBox="0 0 100 46" preserveAspectRatio="none">' + bars + '</svg>';
  }
  function renderHome() {
    var cl = caseload(), pen = pending();
    var groups = { Customs: [], Air: [] };
    cl.forEach(function (a) { groups[a.strategy].push(a); });
    function grpRow(key) {
      var g = groups[key], n = g.length;
      var ages = g.map(function (a) { return Date.now() - (a.submittedAt || Date.now()); }).sort(function (x, y) { return x - y; });
      var med = ages.length ? ages[Math.floor(ages.length / 2)] : 0;
      var old = ages.length ? ages[ages.length - 1] : 0;
      var pctw = cl.length ? Math.round(n / cl.length * 100) : 0;
      return '<div class="sum-row"><span>' + AR.strategy[key] + '</span><span>' + toAr(n) + '</span>' +
        '<span>' + (med ? fmtAge(Date.now() - med) : "—") + '</span><span>' + (old ? fmtAge(Date.now() - old) : "—") + '</span></div>' +
        '<div class="sum-bar" style="margin:-4px 0 4px"><i style="width:' + pctw + '%"></i></div>';
    }
    var decided = 0; var dec = getDecisions();
    Object.keys(dec).forEach(function (k) { if (dec[k] === "approved" || dec[k] === "rejected") decided++; });
    var high = pen.filter(function (a) { return a.pct >= 70; }).length;

    var reports = [
      { t: "تحليل مخاطر الجمارك", c: "#0c8f63", k: "risk" }, { t: "لوحة الجمارك", c: "#3a7bd5", k: "customs" },
      { t: "تقرير الوصول للأنظمة", c: "#d9870a", k: "access" }, { t: "لوحة التنبيهات والقواعد", c: "#df3a2f", k: "rules" }
    ];

    document.getElementById("home-sheet").innerHTML =
      // KPIs
      '<div class="stats">' +
        '<div class="stat glass"><div class="n">' + toAr(pen.length + decided) + '</div><div class="l">إجمالي التنبيهات</div></div>' +
        '<div class="stat glass"><div class="n red">' + toAr(high) + '</div><div class="l">عالية الخطورة</div></div>' +
        '<div class="stat glass"><div class="n amber">' + toAr(pen.length) + '</div><div class="l">بانتظار القرار</div></div>' +
      '</div>' +
      // Alert summary
      '<div class="summary glass"><h4>ملخّص التنبيهات حسب الاستراتيجية</h4>' +
        '<div class="sum-head"><span>الاستراتيجية</span><span>العدد</span><span>متوسط العمر</span><span>الأقدم</span></div>' +
        grpRow("Customs") + grpRow("Air") +
      '</div>' +
      // Reports
      '<div class="sec-h"><h3>التقارير</h3></div>' +
      '<div class="reports">' + reports.map(function (r) {
        return '<div class="report-tile glass" data-dash="' + r.k + '"><b>' + r.t + '</b>' + miniBars(r.t, r.c) + '</div>';
      }).join("") + '</div>' +
      // Search center
      '<div class="sec-h"><h3>مركز البحث</h3></div>' +
      '<div class="search-block glass">' +
        '<div class="search-row"><span class="search-ic">' + svgSearch() + '</span><input type="text" id="search-name" placeholder="ابحث بالاسم…" autocomplete="off" /></div>' +
        '<div class="search-row"><span class="search-ic">' + svgDoc() + '</span><input type="text" id="search-cons" placeholder="رقم الشحنة / المرجع…" autocomplete="off" /></div>' +
        '<div class="search-row"><span class="search-ic">' + svgCar() + '</span><input type="text" id="search-plate" placeholder="رقم المركبة…" autocomplete="off" />' +
          '<button class="scan-btn" id="scan-plate" type="button"><span>مسح اللوحة</span></button></div>' +
        '<div class="scan-hintbar" id="scan-hint" hidden>📷 جارٍ محاكاة مسح اللوحة…</div>' +
      '</div>' +
      // Consignment search (SAS-style) — a real search form
      '<div class="cons-search glass"><h4><span class="vi-logo" style="width:24px;height:24px;border-radius:7px;font-size:10px">VI</span> بحث الشحنات</h4>' +
        '<p style="margin:-6px 0 12px;font-size:12px;color:var(--muted)">ابحث في الشحنات بأي من الحقول التالية</p>' +
        consSearchField("رقم الشحنة", "cs-id", "مثال: 324931861") +
        consSearchField("الرقم المرجعي", "cs-ref", "مثال: Cs 324931861") +
        consSearchField("الرقم الضريبي للمرسل إليه", "cs-tin", "مثال: KW-300441") +
        consSearchField("رقم القيد", "cs-entry", "مثال: EN-2024-77310") +
        '<button class="btn btn-invest" id="cons-search-btn" style="width:100%;margin-top:4px">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> بحث</button>' +
        '<div class="cons-field" style="margin-top:14px"><label>قاموس رموز النظام المنسق (HS) — ١٠ أرقام</label>' +
          '<input class="cf-in" id="hs-lookup" placeholder="أدخل رمز HS…" autocomplete="off" inputmode="numeric" />' +
          '<div class="hs-out" id="hs-out"></div></div>' +
      '</div>';
    wireSearch("search-name"); wireSearch("search-cons"); wireSearch("search-plate");
    var hs = document.getElementById("hs-lookup");
    if (hs) hs.addEventListener("input", function () {
      var v = hs.value.replace(/\D/g, "");
      document.getElementById("hs-out").textContent = AR.hs[v] ? ("✓ " + AR.hs[v]) : (v.length >= 6 ? "لا يوجد وصف لهذا الرمز" : "");
    });
  }
  function consField(label, val) { return '<div class="cons-field"><label>' + label + '</label><div class="cf-in">' + val + '</div></div>'; }
  function consSearchField(label, id, ph) { return '<div class="cons-field"><label>' + label + '</label><input class="cf-in" id="' + id + '" placeholder="' + ph + '" autocomplete="off" /></div>'; }
  function svgSearch() { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'; }
  function svgDoc() { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'; }
  function svgCar() { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.6-4.6A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.4L19 13M4.5 13h15v4h-15z"/><circle cx="8" cy="17" r="1.3"/><circle cx="16" cy="17" r="1.3"/></svg>'; }

  /* ============================ ALERTS TRIAGE ============================ */
  var strategyFilter = "all", searchTerm = "";
  function renderAlerts() {
    var list = pending().concat(caseload().filter(function (a) { return a.status !== "investigator"; }));
    // de-dup
    var seen = {}; list = list.filter(function (a) { if (seen[a.ref]) return false; seen[a.ref] = 1; return true; });
    list = list.filter(function (a) {
      if (strategyFilter !== "all" && a.strategy !== strategyFilter) return false;
      if (searchTerm) {
        var c = a.consignment;
        var hay = (a.driver + " " + a.plate + " " + a.ref + " " + (a.traveler.passport || "") + " " +
          (c ? [c.id, c.ref, c.consigneeTIN, c.entryNumber, c.consignor, c.consignee].join(" ") : "")).toLowerCase();
        if (hay.indexOf(searchTerm.toLowerCase()) === -1) return false;
      }
      return true;
    }).sort(function (x, y) { return y.total - x.total; });
    document.getElementById("alert-list").innerHTML =
      list.length ? list.map(alertCard).join("") : '<p style="color:var(--muted);text-align:center;padding:30px">لا توجد تنبيهات مطابقة.</p>';
  }

  /* ============================ NETWORK ============================ */
  var ICN = { veh: "🚗", pass: "🛂", wak: "🏢", ctry: "🌍", decl: "🧾", org: "🏭", imp: "🏢", cons: "📦", per: "👤" };
  function polar(cx, cy, R, deg) { var r = deg * Math.PI / 180; return [cx + R * Math.cos(r), cy + R * Math.sin(r)]; }
  function nodeEl(x, y, ic, label, cls, data, ref) {
    return '<g class="vi-node ' + (cls || "") + (ref ? " vi-link" : "") + '" data-node="' + data + '"' + (ref ? ' data-noderef="' + ref + '"' : "") +
      ' style="transform:translate(' + x + 'px,' + y + 'px)">' +
      '<circle r="22"/><text class="vi-ic" text-anchor="middle" dy="6">' + ic + '</text>' +
      '<text class="vi-lbl" text-anchor="middle" dy="38">' + label + '</text></g>';
  }
  // resolve a related org / consignment to a real case ref (so the node can be opened)
  function caseRefByOrg(name) {
    var m = allApplicants().filter(function (a) { var c = a.consignment; return c && ((c.consignor && c.consignor.indexOf(name) >= 0) || (c.consignee && c.consignee.indexOf(name) >= 0)); })[0];
    return m ? m.ref : null;
  }
  function caseRefByConsId(id) { var m = allApplicants().filter(function (a) { return a.consignment && a.consignment.id === id; })[0]; return m ? m.ref : null; }
  function trunc(s, n) { s = String(s); return s.length > (n || 15) ? s.slice(0, (n || 15) - 1) + "…" : s; }
  function networkSVG(a, expanded) {
    var W = 360, cx = W / 2, cy = expanded ? 184 : 150, H = expanded ? 368 : 300;
    var c = a.consignment;
    var center = c ? { ic: ICN.cons, label: c.id } : { ic: ICN.per, label: trunc(a.driver, 16) };
    var direct = [];
    direct.push({ ic: ICN.veh, label: (a.vehicleInfo.plate || "مركبة"), cls: "", t: "المركبة|" + a.plate });
    direct.push({ ic: ICN.pass, label: (a.traveler.passport || "جواز"), cls: "", t: "جواز السفر|" + (a.traveler.fullname || "") });
    direct.push({ ic: ICN.wak, label: (a.wakala.type === "NonKuwait" ? "وكالة غير كويتية" : "وكالة كويتية"), cls: (a.wakala.type === "NonKuwait" ? "warn" : "ok"), t: "الوكالة|" + (a.wakala.number || "") });
    var dep = (c && c.origin) || a.travel.departure;
    direct.push({ ic: ICN.ctry, label: ctry(dep), cls: (["Iraq", "Syria", "Iran", "Yemen"].indexOf(dep) >= 0 ? "warn" : "ok"), t: "بلد المغادرة|" + ctry(dep) });
    direct.push({ ic: ICN.decl, label: (c ? c.ref : a.ref), cls: "", t: "البيان الجمركي|" + a.ref });
    if (c) {
      direct.push({ ic: ICN.org, label: trunc(c.consignor, 14), cls: "", t: "المُصدِّر|" + c.consignor });
      direct.push({ ic: ICN.imp, label: trunc(c.consignee, 14), cls: "warn", t: "المستورد|" + c.consignee });
    }
    var N = direct.length, lines = "", nodes = "";
    var dR = expanded ? 96 : 112;
    direct.forEach(function (d, i) {
      var p = polar(cx, cy, dR, -90 + i * (360 / N));
      lines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(20,40,80,.18)" stroke-width="1.6"/>';
      nodes += nodeEl(p[0], p[1], d.ic, trunc(d.label, 15), d.cls, d.t);
    });
    // expanded entity-resolution ring (fabricated SHARED entities, distinct from direct ones)
    if (expanded) {
      var extra = c
        ? [{ ic: ICN.org, label: "Global Exports", t: "كيان مرتبط|Global Exports Ltd — مُصدِّر مشترك", ref: caseRefByOrg("Global Exports") },
           { ic: ICN.per, label: "Avery Johnson", t: "كيان مرتبط|Avery Johnson Import", ref: caseRefByOrg("Avery Johnson") },
           { ic: ICN.cons, label: "312…904", t: "شحنة مرتبطة|نفس المستورد" },
           { ic: ICN.cons, label: "298…551", t: "شحنة مرتبطة|نفس الرقم الضريبي" }]
        : [{ ic: ICN.org, label: "Continental", t: "كيان مرتبط|Continental Trading", ref: caseRefByOrg("Continental") },
           { ic: ICN.per, label: "Avery Johnson", t: "كيان مرتبط|Avery Johnson Import", ref: caseRefByOrg("Avery Johnson") },
           { ic: ICN.cons, label: "324…861", t: "شحنة مرتبطة|نفس الوكالة", ref: caseRefByConsId("324931861") }];
      var M = extra.length, half = 180 / N;
      extra.forEach(function (d, i) {
        var p = polar(cx, cy, 156, -90 + half + i * (360 / M));
        lines += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(58,123,213,.4)" stroke-width="1.4" stroke-dasharray="4 4"/>';
        nodes += nodeEl(p[0], p[1], d.ic, trunc(d.label, 14), "warn", d.t, d.ref);
      });
    }
    var col = colorOf(a.level);
    var centerEl = '<g style="transform:translate(' + cx + 'px,' + cy + 'px)">' +
      '<circle r="30" fill="' + col + '" opacity=".18"/><circle r="26" fill="' + col + '"/>' +
      '<text text-anchor="middle" dy="7" font-size="20">' + center.ic + '</text>' +
      '<text class="vi-lbl" text-anchor="middle" dy="46" style="font-weight:800">' + center.label + '</text></g>';
    return '<svg class="vi-graph" viewBox="0 0 ' + W + ' ' + H + '" width="100%">' + lines + nodes + centerEl + '</svg>';
  }
  var netExp = { case: false, global: false }, netA = { case: null, global: null };
  function networkInner(a, key) {
    var cap = a.consignment
      ? "تحليل الشبكة كشف شحنات مرتبطة تشترك في نفس المستورد / الرقم الضريبي — مؤشر محتمل على تجزئة الإرسالية."
      : "تحليل الشبكة يربط المسافر بمركبته ووثائقه ووكالته وبلد مغادرته.";
    cap += netExp[key] ? " اضغط على أي كيان مميّز (◳) لفتح قضيته." : " اضغط «توسيع الروابط» لكشف الكيانات المشتركة.";
    return '<div class="net-host" data-key="' + key + '">' +
      '<h4 style="margin:0 0 6px;font-size:12px;font-weight:800;color:var(--faint);letter-spacing:1px">شبكة الكيانات</h4>' +
      networkSVG(a, netExp[key]) +
      '<div class="net-controls">' +
        (netExp[key] ? '<button class="net-btn" data-net="trim" data-netkey="' + key + '">تقليم الروابط</button>'
                     : '<button class="net-btn" data-net="expand" data-netkey="' + key + '">توسيع الروابط</button>') +
      '</div>' +
      '<div class="vi-pop" id="pop-' + key + '" style="display:none"></div>' +
      '<p class="vi-cap">' + cap + '</p></div>';
  }
  function paintNet(key) { var host = document.getElementById("net-" + key); if (host && netA[key]) host.innerHTML = networkInner(netA[key], key); }
  function findEntity(q) {
    q = q.toLowerCase();
    return allApplicants().filter(function (a) {
      var c = a.consignment;
      var hay = (a.driver + " " + a.plate + " " + a.ref + " " + (a.traveler.passport || "") + " " +
        (c ? (c.id + " " + c.ref + " " + c.consignor + " " + c.consignee + " " + c.consigneeTIN) : "")).toLowerCase();
      return hay.indexOf(q) >= 0;
    })[0];
  }
  function renderGlobalNet() {
    var host = document.getElementById("net-global");
    host.innerHTML = netA.global ? networkInner(netA.global, "global") : '<p style="color:var(--muted);text-align:center;padding:20px">لا توجد بيانات.</p>';
    var res = document.getElementById("net-result");
    if (res) res.innerHTML = netA.global ? ('مركز الشبكة: <b>' + (netA.global.consignment ? ("شحنة " + netA.global.consignment.id) : netA.global.driver) + '</b> · ' + netA.global.plate) : "";
  }
  function topCase() { var cl = caseload().slice().sort(function (x, y) { return y.total - x.total; }); return cl[0] || allApplicants()[0]; }
  function renderNetwork() { if (!netA.global) netA.global = topCase(); renderGlobalNet(); }

  /* ============================ MAP / X-RAY / DOCS ============================ */
  function mapPanel(a) {
    var lat = "29.34°N", lng = "47.97°E";
    var svg = '<svg class="vi-map" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="360" height="200" fill="#3c4a3a"/>' +
      '<path d="M0 120 Q90 90 180 115 T360 105 V200 H0 Z" fill="#52614a"/>' +
      '<path d="M0 60 Q120 40 220 70 T360 55 V0 H0 Z" fill="#5b5340"/>' +
      '<path d="M210 0 Q250 60 230 120 T280 200 H360 V0 Z" fill="#6b5f44" opacity=".7"/>' +
      '<g stroke="rgba(255,255,255,.14)" stroke-width="1">' +
        '<line x1="0" y1="70" x2="360" y2="60"/><line x1="0" y1="130" x2="360" y2="140"/>' +
        '<line x1="120" y1="0" x2="130" y2="200"/><line x1="250" y1="0" x2="240" y2="200"/>' +
      '</g>' +
      '<circle class="map-pin-ring" cx="180" cy="100" r="6" fill="#4aa3ff"/>' +
      '<g transform="translate(180,100)"><path d="M0 6 C-9 -6 -9 -16 0 -16 C9 -16 9 -6 0 6 Z" fill="#2b6fd6" stroke="#fff" stroke-width="1.5"/><circle cx="0" cy="-10" r="3.2" fill="#fff"/></g>' +
      '</svg>';
    var locType = a.consignment ? "مستودع جمركي" : "نقطة العبور الحدودية";
    return '<div class="map-panel glass">' + svg +
      '<div class="map-cap"><b>موقع البضائع:</b> ' + locType + ' · الرمز: KWPCW-03<br/>الإحداثيات: ' + lat + ' , ' + lng + '</div></div>';
  }
  function carSVG(plate, color) {
    var colMap = { "White": "#eef2f7", "أبيض": "#eef2f7", "Black": "#2b313b", "أسود": "#2b313b", "Silver": "#ccd3dd", "فضي": "#ccd3dd", "Grey": "#99a2af", "رمادي": "#99a2af", "Red": "#cf463b", "أحمر": "#cf463b", "Blue": "#3a78c2" };
    var body = colMap[color] || "#3a78c2", dark = "#20262f";
    return '<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3645"/><stop offset="1" stop-color="#1a212b"/></linearGradient></defs>' +
      '<rect width="320" height="200" fill="url(#sky)"/>' +
      '<rect y="152" width="320" height="48" fill="#161b22"/>' +
      '<line x1="0" y1="184" x2="320" y2="184" stroke="#3a4655" stroke-width="3" stroke-dasharray="16 14"/>' +
      '<ellipse cx="160" cy="160" rx="118" ry="14" fill="#000" opacity=".35"/>' +
      '<g>' +
        '<path d="M104 86 Q116 50 160 50 Q204 50 216 86 Z" fill="' + body + '"/>' +
        '<path d="M122 84 Q132 63 160 63 Q188 63 198 84 Z" fill="#9fb6cf" opacity=".9"/>' +
        '<line x1="150" y1="82" x2="139" y2="70" stroke="#5b6b7d" stroke-width="1.5"/>' +
        '<line x1="170" y1="82" x2="181" y2="70" stroke="#5b6b7d" stroke-width="1.5"/>' +
        '<rect x="74" y="84" width="172" height="72" rx="16" fill="' + body + '"/>' +
        '<rect x="74" y="101" width="172" height="3" fill="rgba(0,0,0,.12)"/>' +
        '<rect x="140" y="107" width="40" height="18" rx="4" fill="' + dark + '"/>' +
        '<g stroke="#3a424d" stroke-width="1.6"><line x1="146" y1="111" x2="174" y2="111"/><line x1="146" y1="116" x2="174" y2="116"/><line x1="146" y1="121" x2="174" y2="121"/></g>' +
        '<circle cx="160" cy="116" r="3.6" fill="#cfd6df"/>' +
        '<path d="M86 97 q22 -6 34 2 l-2 11 q-18 -4 -32 0 Z" fill="#e6edf5"/>' +
        '<path d="M234 97 q-22 -6 -34 2 l2 11 q18 -4 32 0 Z" fill="#e6edf5"/>' +
        '<circle cx="100" cy="103" r="3.2" fill="#fff"/><circle cx="220" cy="103" r="3.2" fill="#fff"/>' +
        '<rect x="70" y="134" width="180" height="22" rx="9" fill="' + dark + '"/>' +
        '<rect x="116" y="135" width="88" height="20" rx="3" fill="#fff" stroke="#c7ccd4"/>' +
        '<rect x="116" y="135" width="14" height="20" rx="3" fill="#0a7d3a"/>' +
        '<text x="169" y="149" text-anchor="middle" font-size="11" font-weight="800" fill="#15202e" font-family="Inter,Arial">' + plate + '</text>' +
        '<rect x="78" y="150" width="22" height="12" rx="4" fill="#0d1117"/>' +
        '<rect x="220" y="150" width="22" height="12" rx="4" fill="#0d1117"/>' +
      '</g></svg>';
  }
  function platePlaceholder(plate) {
    return '<div class="plate-cap"><div class="kwplate"><span class="kwp-strip">الكويت<br/>KWT</span><span class="kwp-num">' + plate + '</span></div>' +
      '<div class="plate-note">بانتظار صورة المركبة الفعلية من كاميرا المنفذ</div></div>';
  }
  function vehiclePanel(a) {
    var plate = a.vehicleInfo.plate || "—";
    return '<div class="xray-wrap"><div class="info-card glass" style="padding:14px"><h4>صورة المركبة عند المنفذ</h4>' +
      '<div class="veh-photo">' +
        '<img class="veh-img" src="../assets/vehicle_sample.jpg" alt="" onerror="this.parentNode.classList.add(\'no-img\')" />' +
        '<div class="veh-ph">' + platePlaceholder(plate) + '</div>' +
        '<span class="veh-tag">📷 كاميرا المنفذ (ANPR)</span>' +
      '</div>' +
      '<div class="veh-plate-row"><span>رقم اللوحة المُلتقط</span><b>' + a.plate + '</b></div>' +
      '</div></div>';
  }
  function docBlock(label, dataUrl, fallback, status) {
    var src = dataUrl || fallback;
    var pill = status ? '<span class="doc-val ' + status.cls + '">' + status.text + '</span>' : "";
    if (src) return '<div class="doc" data-img="' + src + '"><img src="' + src + '" alt="' + label + '" />' + pill + '<span>' + label + '</span></div>';
    return '<div class="doc doc-empty">' + pill + '<span class="doc-ph">لم يُرفق</span><span>' + label + '</span></div>';
  }
  // simulated document-verification model (maps to real verification services later)
  function validation(a) {
    return {
      watch: ["Syria", "Iran", "Yemen"].indexOf(a.nat) >= 0,
      regOut: !!(a.vehicleInfo.regcountry && a.vehicleInfo.regcountry !== "Kuwait"),
      insExpired: (a.vehicleInfo.regcountry && a.vehicleInfo.regcountry !== "Kuwait") || a.level === "High",
      restricted: a.travel.restricted === "Yes"
    };
  }
  function vrow(name, state, detail) {
    var ic = state === "ok" ? "✓" : state === "warn" ? "!" : "✕";
    var lbl = state === "ok" ? "موثّق" : state === "warn" ? "يتطلب مراجعة" : "غير صالح";
    return '<div class="val-row"><span class="val-ic ' + state + '">' + ic + '</span>' +
      '<div class="val-tx"><b>' + name + '</b><span>' + detail + '</span></div>' +
      '<span class="val-pill ' + state + '">' + lbl + '</span></div>';
  }
  function valRows(a) {
    var v = validation(a);
    return '<div class="val-grp">جواز السفر</div>' +
      vrow("صلاحية الجواز", "ok", "غير منتهٍ · رمز MRZ مطابق") +
      vrow("قوائم المراقبة", v.watch ? "warn" : "ok", v.watch ? "الجنسية ضمن قائمة مراقبة — يتطلب تحققاً" : "لا يوجد تطابق") +
      '<div class="val-grp">دفتر السيارة (المركبة)</div>' +
      vrow("رخصة التسجيل", "ok", "سارية · مطابقة لبيانات المركبة") +
      vrow("وثيقة التأمين", v.insExpired ? "bad" : "ok", v.insExpired ? "منتهية أو غير مُتحقَّق منها" : "سارية المفعول") +
      vrow("مطابقة رقم اللوحة", "ok", "يطابق اللوحة المُلتقطة بالكاميرا") +
      vrow("مطابقة رقم الهيكل (VIN)", v.regOut ? "warn" : "ok", v.regOut ? "مركبة مسجّلة خارج الكويت — يتطلب تحققاً" : "مطابق للسجل الوطني") +
      '<div class="val-grp">البيان الجمركي</div>' +
      vrow("مطابقة البيان", v.restricted ? "warn" : "ok", v.restricted ? "بنود مقيّدة تتطلب فحصاً مادياً" : "مطابق لبيانات الشحنة");
  }

  /* ============================ CASE DETAIL ============================ */
  var CUR = null, caseTab = "details";
  function kvRow(k, v) { return '<div class="kv"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }

  function renderCase(a) {
    CUR = a; caseTab = "details"; netExp.case = false; netA.case = a;
    document.getElementById("detail-title").textContent = a.consignment ? ("شحنة " + a.consignment.id) : a.plate;
    var col = colorOf(a.level), ch = channel(a.total);

    var hero = '<div class="risk-hero glass-hi glass">' + ringEl(a.pct, String(a.total), 96) +
      '<div class="rh-tx"><div class="lvl" style="color:' + col + '">بطاقة النتائج · مخاطر ' + levelAr(a.level) + '</div>' +
      '<div class="src"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0c8f63" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> الإجمالي <b>' + a.total + '</b> · استراتيجية: ' + strategyAr(a) + '</div>' +
      '<div class="channel-badge" style="background:' + ch.c + '1f;color:' + ch.c + ';border:1px solid ' + ch.c + '55"><i style="background:' + ch.c + '"></i>' + ch.ar + '</div>' +
      '</div></div>';

    // scorecard scenario breakdown
    var scoreCard = '<div class="scorecard info-card glass"><h4>تفصيل السيناريوهات</h4>' +
      (a.sc.scenarios.length ? a.sc.scenarios.map(function (s) {
        var c = s.score >= 150 ? "#df3a2f" : s.score >= 70 ? "#d9870a" : "#0a9d57";
        return '<div class="sc-row"><div class="sc-h"><span class="sc-id">' + s.id + '</span><span class="sc-val" style="color:' + c + '">+' + s.score + '</span></div>' +
          '<p class="sc-desc">' + s.descAr + '</p><div class="bar"><i style="width:' + Math.min(100, Math.round(s.score / a.sc.maxScore * 100)) + '%;background:' + c + '"></i></div></div>';
      }).join("") : '<p style="color:var(--muted);margin:0">لم تُفعَّل أي سيناريوهات.</p>') +
    '</div>';

    var tabs = [["details", "تفاصيل التنبيه"], ["triggers", "المحفزات"], ["score", "تاريخ تسجيل النقاط"], ["history", "سجل التنبيهات"], ["source", "معلومات المصدر"], ["assistant", "مساعد التحقيق"]];
    var strip = '<div class="filters vitabs">' + tabs.map(function (t) {
      return '<button class="fchip' + (t[0] === caseTab ? " is-active" : "") + '" data-casetab="' + t[0] + '">' + t[1] + '</button>';
    }).join("") + '</div>';

    var decision = (a.status === "investigator")
      ? '<div class="decision-h">القرار النهائي</div><div class="actions">' +
          '<button class="btn btn-flag" data-action="reject" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> رفض نهائي</button>' +
          '<button class="btn btn-approve" data-action="approve" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> اعتماد</button>' +
        '</div>'
      : (a.status === "approved" ? '<div class="state-banner" style="background:rgba(10,157,87,.12);color:#0a9d57;border:1px solid rgba(10,157,87,.3)">✓ تم اعتماد الشحنة من قبل المحقّق</div>'
        : '<div class="state-banner red">✕ تم رفض الشحنة من قبل المحقّق</div>');

    document.getElementById("detail-body").innerHTML =
      hero + scoreCard + strip + '<div id="case-tabbody">' + caseTabBody(a, caseTab) + '</div>' + decision;
  }

  function caseTabBody(a, tab) {
    var c = a.consignment, t = a.traveler, tv = a.travel, v = a.vehicleInfo, w = a.wakala;
    if (tab === "details") {
      var cons = c ? (
        '<div class="info-card glass"><h4>معلومات الشحنة (Consignment 360)</h4>' +
          kvRow("المرسِل (المُصدِّر)", c.consignor) + kvRow("المرسَل إليه (المستورد)", c.consignee) +
          kvRow("رمز النظام المنسق (HS)", c.hs + (AR.hs[c.hs] ? ' · ' + AR.hs[c.hs] : "")) +
          kvRow("وصف البضائع", c.goodsDesc) +
          kvRow("القيمة المصرّح بها", toAr(c.declaredValueKWD) + " د.ك") +
          kvRow("الوزن الإجمالي", toAr(c.grossMassKg) + " كجم") +
          kvRow("تكاليف النقل", toAr(c.transportCostKWD) + " د.ك") +
        '</div>' +
        '<div class="info-card glass"><h4>المراجع</h4><div class="refs-grid">' +
          refCell("رقم مرجع", c.ref) + refCell("D Marn", c.dMarn) + refCell("D Lrn", c.dLrn) +
          refCell("الرقم الضريبي", c.consigneeTIN) + refCell("رقم القيد", c.entryNumber) + refCell("المنشأ", ctry(c.origin)) +
        '</div></div>') : "";
      var person = '<div class="info-card glass"><h4>معلومات المسافر</h4>' +
        kvRow("الاسم الكامل", t.fullname || "—") + kvRow("رقم الجواز", t.passport || "—") +
        kvRow("الجنسية", ctry(t.nationality)) + kvRow("رقم الهاتف", (t.dialcode ? t.dialcode + " " : "") + (t.mobile || "—")) +
      '</div>';
      var veh = '<div class="info-card glass"><h4>معلومات المركبة</h4>' +
        kvRow("رقم اللوحة", a.plate) + kvRow("بلد التسجيل", ctry(v.regcountry)) +
        kvRow("نوع المركبة", AR.vtype[v.vtype] || v.vtype || "—") + kvRow("الصنع والطراز", v.model || "—") +
      '</div>';
      var wak = '<div class="info-card glass"><h4>الوكالة</h4>' +
        '<div class="kv"><span class="k">نوع الوكالة</span><span class="v ' + (w.type === "NonKuwait" ? "amber" : "green") + '">' + (w.type === "NonKuwait" ? "وكالة غير كويتية" : "وكالة كويتية") + '</span></div>' +
        kvRow("رقم / اسم الوكالة", w.number || "—") + '</div>';
      var vv = validation(a);
      var docs = '<div class="info-card glass"><h4>المستندات والتحقق منها</h4><div class="docs">' +
        docBlock("جواز السفر", a.documents.passport, null, vv.watch ? { cls: "warn", text: "مراجعة" } : { cls: "ok", text: "موثّق" }) +
        docBlock("دفتر السيارة", a.documents.daftar, null, vv.insExpired ? { cls: "bad", text: "تأمين منتهٍ" } : { cls: "ok", text: "موثّق" }) +
        docBlock("البيان الجمركي", a.documents.declaration, "../assets/decleration.jpeg", vv.restricted ? { cls: "warn", text: "فحص" } : { cls: "ok", text: "مطابق" }) +
      '</div>' + valRows(a) + '</div>';
      return cons + person + veh + wak + mapPanel(a) + vehiclePanel(a) + docs +
        '<div class="info-card glass" id="net-case">' + networkInner(a, "case") + '</div>';
    }
    if (tab === "triggers") {
      if (!a.sc.scenarios.length) return '<p style="color:var(--muted);text-align:center;padding:24px">لا توجد محفزات.</p>';
      var target = c ? c.id : a.plate.replace("KW ", "");
      return a.sc.scenarios.map(function (s) {
        var col = s.score >= 150 ? "#df3a2f" : s.score >= 70 ? "#d9870a" : "#0a9d57";
        return '<div class="trig"><div class="trig-top"><span class="trig-id">' + s.id + '</span><span class="trig-sc" style="color:' + col + '">+' + s.score + '</span></div>' +
          '<p class="trig-msg">' + s.descAr + '</p>' +
          '<div class="trig-meta"><span>هدف: ' + target + '</span><span>نوع الكائن: ' + (c ? "H7 Consignment" : "Traveller") + '</span></div></div>';
      }).join("");
    }
    if (tab === "score") {
      var acc = 0;
      var evs = a.sc.scenarios.map(function (s) { acc += s.score; return '<div class="vi-ev"><span class="vi-dot"></span><div><b>' + s.id + ' +' + s.score + '</b><p>' + s.descAr + ' — الإجمالي التراكمي: ' + acc + '</p></div></div>'; });
      evs.push('<div class="vi-ev"><span class="vi-dot" style="background:' + colorOf(a.level) + '"></span><div><b>الإجمالي النهائي = ' + a.total + '</b><p>جُمعت مساهمات السيناريوهات في بطاقة النتائج.</p></div></div>');
      return '<div class="info-card glass"><h4>تاريخ تسجيل النقاط</h4><div class="vi-timeline">' + evs.join("") + '</div></div>';
    }
    if (tab === "history") {
      var base = [
        { action: "تم إنشاء التنبيه", by: "sas.svi-alert", queue: "queue_default", at: a.submittedAt },
        { action: "تم نقل التنبيه إلى قائمة انتظار مختلفة (المواد الكيميائية والخطرة)", by: "sas.svi-alert", queue: "queue_chem", at: a.submittedAt + 60000 },
        { action: "تم تحويل الطلب من الضابط إلى المحقّق", by: "officer.border", queue: "queue_chem", at: a.submittedAt + 120000 }
      ];
      var extra = (getHist()[a.ref] || []).map(function (h) {
        return { action: h.action === "approve" ? "تم اعتماد الشحنة من قبل المحقّق" : "تم رفض الشحنة من قبل المحقّق", by: h.by, queue: h.queue, at: h.at };
      });
      var rows = base.concat(extra).map(function (e) {
        return '<div class="vi-ev"><span class="vi-dot"></span><div><b>' + e.action + '</b><p>بواسطة: ' + e.by + ' · قائمة الانتظار: ' + e.queue + ' · ' + fmtAge(e.at) + '</p></div></div>';
      });
      return '<div class="info-card glass"><h4>سجل التنبيهات</h4><div class="vi-timeline">' + rows.join("") + '</div></div>';
    }
    if (tab === "source") {
      return '<div class="info-card glass"><h4>معلومات المصدر (كما وردت)</h4>' +
        kvRow("نظام المصدر", "منظومة البيان الجمركي / FASAH") +
        kvRow("رقم البيان (MRN)", c ? c.dMarn : "—") +
        kvRow("الرقم المحلي (LRN)", c ? c.dLrn : "—") +
        kvRow("رمز HS الخام", c ? c.hs : "—") +
        kvRow("القيمة الخام", c ? (c.declaredValueKWD + " KWD") : "—") +
        kvRow("الوزن الخام", c ? (c.grossMassKg + " KG") : "—") +
        kvRow("وقت الإدخال", new Date(a.submittedAt || Date.now()).toLocaleString("ar-KW")) +
      '</div>' +
      '<div class="info-card glass"><h4>سلسلة البيان (JSON)</h4><pre style="margin:0;font-size:11px;direction:ltr;text-align:left;white-space:pre-wrap;color:var(--muted);font-family:Inter,monospace">' +
        JSON.stringify(c || { traveller: a.traveler.passport, vehicle: a.vehicleInfo.plate }, null, 1).replace(/</g, "&lt;") + '</pre></div>';
    }
    if (tab === "assistant") {
      var top = a.sc.scenarios.slice(0, 2).map(function (s) { return s.descAr + " (+" + s.score + ")"; }).join("، ");
      var origin = c ? ctry(c.origin) : ctry(a.travel.departure);
      var narr = "سُجِّل هذا التنبيه على " + (c ? ("الشحنة رقم " + c.id) : ("المسافر " + a.driver)) + " الواردة من " + origin +
        " بإجمالي نقاط " + a.total + " (" + channel(a.total).ar + "). أبرز المحفزات: " + (top || "لا توجد") + ". " +
        (c ? ("يرتبط المستورد " + c.consignee + " بشحنات أخرى عبر تحليل الشبكة. ") : "") +
        (a.level === "High" ? "توصي المنظومة بالفحص المادي قبل اتخاذ القرار." : a.level === "Medium" ? "توصي المنظومة بمراجعة المستندات والتحقق قبل القرار." : "لا توجد مؤشرات حرجة، الحالة مؤهّلة للاعتماد.");
      var reco = a.level === "Low"
        ? '<div class="reco clear"><span class="ric"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0a9d57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div><b>التوصية: مؤهّل للاعتماد</b><p>لا توجد مؤشرات خطورة عالية.</p></div></div>'
        : '<div class="reco"><span class="ric">' + flagIc.replace('12" height="12"', '20" height="20"').replace('stroke-width="2"', 'stroke="#df3a2f" stroke-width="2"') + '</span><div><b>التوصية: الرفض أو الفحص المادي</b><p>تشير المحفزات إلى ضرورة التحقق قبل الإفراج.</p></div></div>';
      return '<div class="assist-card glass"><div class="assist-h"><span class="vi-logo">VI</span><b>مساعد التحقيق — ملخّص آلي</b></div>' +
        '<p class="assist-body">' + narr + '</p></div>' +
        reco +
        '<div class="info-card glass" id="net-case">' + networkInner(a, "case") + '</div>';
    }
    return "";
  }
  function refCell(k, v) { return '<div class="ref-cell"><div class="rk">' + k + '</div><div class="rv">' + (v || "—") + '</div></div>'; }

  /* ============================ PROFILE ============================ */
  function renderProfile() {
    var dec = getDecisions(), app = 0, rej = 0;
    Object.keys(dec).forEach(function (k) { if (dec[k] === "approved") app++; else if (dec[k] === "rejected") rej++; });
    document.getElementById("prof-seen").textContent = toAr(caseload().length);
    document.getElementById("prof-app").textContent = toAr(app);
    document.getElementById("prof-rej").textContent = toAr(rej);
  }

  /* ============================ lightbox / toast / confirm ============================ */
  function openLightbox(src) { var o = document.createElement("div"); o.className = "lightbox"; o.innerHTML = '<img src="' + src + '" alt="" />'; o.addEventListener("click", function () { o.remove(); }); document.body.appendChild(o); }
  function toast(msg) {
    var el = document.createElement("div"); el.textContent = msg;
    el.style.cssText = "position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:rgba(20,33,54,.95);color:#fff;padding:11px 18px;border-radius:999px;font-size:13px;font-weight:700;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.3)";
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1800);
  }
  /* ---------- dashboards (Visual Analytics-style popups) ---------- */
  function channelKey(total) { return total >= 300 ? "red" : total >= 120 ? "yellow" : "green"; }
  function dashStats() {
    var cl = caseload(), ch = { red: 0, yellow: 0, green: 0 }, st = { investigator: 0, approved: 0, rejected: 0 }, strat = { Customs: 0, Air: 0 }, origin = {}, scen = {};
    cl.forEach(function (a) {
      ch[channelKey(a.total)]++;
      st[a.status] = (st[a.status] || 0) + 1;
      strat[a.strategy] = (strat[a.strategy] || 0) + 1;
      var o = ctry((a.consignment && a.consignment.origin) || a.travel.departure || "—"); origin[o] = (origin[o] || 0) + 1;
      a.sc.all.forEach(function (s) { if (!scen[s.id]) scen[s.id] = { n: 0, sum: 0 }; if (s.active) { scen[s.id].n++; scen[s.id].sum += s.score; } });
    });
    return { cl: cl, ch: ch, st: st, strat: strat, origin: origin, scen: scen };
  }
  function donutSVG(segs) {
    var r = 52, circ = 2 * Math.PI * r, total = segs.reduce(function (s, x) { return s + x.v; }, 0) || 1, off = 0;
    var arcs = segs.filter(function (s) { return s.v > 0; }).map(function (s) {
      var len = circ * s.v / total;
      var el = '<circle cx="65" cy="65" r="52" fill="none" stroke="' + s.color + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (circ - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 65 65)"/>';
      off += len; return el;
    }).join("");
    return '<svg width="130" height="130" viewBox="0 0 130 130">' + arcs + '<text x="65" y="61" text-anchor="middle" font-size="26" font-weight="800" fill="#142136">' + total + '</text><text x="65" y="80" text-anchor="middle" font-size="10" fill="#62708c">إجمالي</text></svg>';
  }
  function legend(segs) { return '<div class="dlegend">' + segs.map(function (s) { return '<div class="dleg"><i style="background:' + s.color + '"></i>' + s.label + ' <b>' + toAr(s.v) + '</b></div>'; }).join("") + '</div>'; }
  function barsSVG(data) {
    var max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    return '<div class="dbars">' + data.map(function (d) {
      return '<div class="dbar"><span class="dbar-l">' + d.label + '</span><div class="dbar-t"><i style="width:' + Math.max(4, Math.round(d.v / max * 100)) + '%;background:' + (d.color || "#3a7bd5") + '"></i></div><span class="dbar-v">' + toAr(d.v) + '</span></div>';
    }).join("") + '</div>';
  }
  function openDashboard(key) {
    var s = dashStats(), title = "", body = "";
    if (key === "risk") {
      title = "تحليل مخاطر الجمارك";
      var segs = [{ label: "القناة الحمراء", v: s.ch.red, color: "#df3a2f" }, { label: "القناة الصفراء", v: s.ch.yellow, color: "#d9870a" }, { label: "القناة الخضراء", v: s.ch.green, color: "#0a9d57" }];
      var scenSum = Object.keys(s.scen).filter(function (id) { return s.scen[id].sum > 0; }).map(function (id) { return { label: id.replace("_Score", ""), v: s.scen[id].sum, color: s.scen[id].sum >= 300 ? "#df3a2f" : s.scen[id].sum >= 120 ? "#d9870a" : "#0c8f63" }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
      body = '<div class="dash-sec"><h5>توزيع القنوات (الانتقائية)</h5><div class="donut-wrap">' + donutSVG(segs) + legend(segs) + '</div></div>' +
        '<div class="dash-sec"><h5>أعلى السيناريوهات مساهمةً في النقاط</h5>' + barsSVG(scenSum.length ? scenSum : [{ label: "—", v: 0 }]) + '</div>';
    } else if (key === "customs") {
      title = "لوحة الجمارك";
      var stseg = [{ label: "قيد التحقيق", v: s.st.investigator || 0, color: "#3a7bd5" }, { label: "معتمد", v: s.st.approved || 0, color: "#0a9d57" }, { label: "مرفوض", v: s.st.rejected || 0, color: "#df3a2f" }];
      var stratBars = [{ label: "جمارك", v: s.strat.Customs || 0, color: "#0c8f63" }, { label: "جوي", v: s.strat.Air || 0, color: "#3a7bd5" }];
      var origBars = Object.keys(s.origin).map(function (o) { return { label: o, v: s.origin[o], color: "#3a7bd5" }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
      body = '<div class="dash-sec"><h5>حسب الحالة</h5><div class="donut-wrap">' + donutSVG(stseg) + legend(stseg) + '</div></div>' +
        '<div class="dash-sec"><h5>حسب الاستراتيجية</h5>' + barsSVG(stratBars) + '</div>' +
        '<div class="dash-sec"><h5>حسب بلد المنشأ</h5>' + barsSVG(origBars) + '</div>';
    } else if (key === "access") {
      title = "تقرير الوصول للأنظمة";
      var rows = [
        { u: "mansour.alahmad", a: "تسجيل دخول", t: "اليوم ٠٩:١٤" }, { u: "officer.border", a: "تحويل قضية إلى المحقّق", t: "اليوم ٠٨:٥٢" },
        { u: "sas.svi-alert", a: "إنشاء تنبيه آلي", t: "اليوم ٠٧:٠٨" }, { u: "mansour.alahmad", a: "اعتماد شحنة", t: "أمس ١٦:٤٠" },
        { u: "admin.customs", a: "تعديل قاعدة سيناريو C3", t: "أمس ١١:٢٢" }, { u: "mansour.alahmad", a: "تصدير تقرير", t: "أمس ١٠:٠٥" }
      ];
      body = '<div class="dash-sec"><h5>أحدث عمليات الوصول</h5><div class="acc-table">' + rows.map(function (r) { return '<div class="acc-row"><span class="acc-u">' + r.u + '</span><span class="acc-a">' + r.a + '</span><span class="acc-t">' + r.t + '</span></div>'; }).join("") + '</div></div>' +
        '<div class="dash-sec"><h5>النشاط حسب الساعة</h5>' + barsSVG([{ label: "٠٧:٠٠", v: 8, color: "#d9870a" }, { label: "٠٩:٠٠", v: 14, color: "#d9870a" }, { label: "١١:٠٠", v: 9, color: "#d9870a" }, { label: "١٣:٠٠", v: 6, color: "#d9870a" }, { label: "١٦:٠٠", v: 11, color: "#d9870a" }]) + '</div>';
    } else {
      title = "لوحة التنبيهات والقواعد";
      var freq = ["C1_Score", "C2_Score", "C3_Score", "C4_Score", "C5_Score", "C6_Score", "C7_Score", "C8_Score", "C9_Score"].map(function (id) { return { label: id.replace("_Score", ""), v: (s.scen[id] ? s.scen[id].n : 0), color: "#df3a2f" }; });
      body = '<div class="dash-sec"><h5>تكرار تفعيل السيناريوهات (عدد القضايا)</h5>' + barsSVG(freq) + '</div>' +
        '<div class="dash-sec"><h5>التنبيهات خلال ٧ أيام</h5>' + barsSVG([{ label: "السبت", v: 12 }, { label: "الأحد", v: 18 }, { label: "الإثنين", v: 9 }, { label: "الثلاثاء", v: 22 }, { label: "الأربعاء", v: 15 }, { label: "الخميس", v: 20 }, { label: "الجمعة", v: 7 }]) + '</div>';
    }
    var sheet = document.createElement("div"); sheet.className = "dash-sheet";
    sheet.innerHTML = '<div class="dash-card"><div class="dash-head"><div><span class="vi-logo" style="width:26px;height:26px;border-radius:8px;font-size:10px">VI</span><b>' + title + '</b></div><button class="dash-x" data-dashx>✕</button></div>' +
      '<div class="dash-body">' + body + '<p class="dash-foot">تقرير تجريبي — يُعرض من SAS Visual Analytics عند ربط التطبيق.</p></div></div>';
    sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.closest("[data-dashx]")) sheet.remove(); });
    document.body.appendChild(sheet);
  }

  function confirmSheet(action, ref) {
    var approve = action === "approve";
    var sheet = document.createElement("div"); sheet.className = "confirm-sheet";
    sheet.innerHTML = '<div class="confirm-card"><h3>تأكيد القرار</h3><p>' +
      (approve ? "هل أنت متأكد من اعتماد الشحنة؟" : "هل أنت متأكد من رفض الشحنة؟") + '</p>' +
      '<div class="actions"><button class="btn btn-ghost2" data-cf="cancel">إلغاء</button>' +
      '<button class="btn ' + (approve ? "btn-approve" : "btn-flag") + '" data-cf="ok">تأكيد</button></div></div>';
    sheet.addEventListener("click", function (e) {
      if (e.target === sheet || e.target.closest('[data-cf="cancel"]')) { sheet.remove(); return; }
      if (e.target.closest('[data-cf="ok"]')) {
        setDecision(ref, approve ? "approved" : "rejected");
        appendHistory(ref, action);
        sheet.remove();
        var a = byRef(ref); if (a) renderCase(a);
        refresh();
      }
    });
    document.body.appendChild(sheet);
  }

  /* ============================ navigation ============================ */
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var el = document.getElementById(id); if (el) el.classList.add("is-active");
    var scroll = el && el.querySelector(".scroll");
    if (scroll) { scroll.classList.add("fade-in"); setTimeout(function () { scroll.classList.remove("fade-in"); }, 360); }
    document.getElementById("tabbar").classList.toggle("hidden", id === "screen-detail");
    var sb = document.querySelector(".statusbar"); if (sb) sb.classList.toggle("sb-light", id === "screen-home");
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab") === id); });
    if (id === "screen-network") renderNetwork();
    window.scrollTo(0, 0);
  }

  /* ============================ events ============================ */
  document.addEventListener("click", function (e) {
    var doc = e.target.closest(".doc[data-img]"); if (doc) { openLightbox(doc.getAttribute("data-img")); return; }
    var dash = e.target.closest("[data-dash]"); if (dash) { openDashboard(dash.getAttribute("data-dash")); return; }
    if (e.target.closest("#cons-search-btn")) {
      var q = ["cs-id", "cs-ref", "cs-tin", "cs-entry"].map(function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }).filter(Boolean)[0] || "";
      searchTerm = q; strategyFilter = "all";
      var sa = document.getElementById("search-all"); if (sa) sa.value = q;
      renderAlerts(); show("screen-alerts");
      return;
    }

    var net = e.target.closest("[data-net]");
    if (net) { var key = net.getAttribute("data-netkey"); netExp[key] = net.getAttribute("data-net") === "expand"; paintNet(key); return; }

    var node = e.target.closest(".vi-node[data-node]");
    if (node) {
      var host = node.closest(".net-host");
      var key = host ? host.getAttribute("data-key") : "case";
      var nref = node.getAttribute("data-noderef");
      if (nref) {
        // linkable node → re-center the explorer, or open the case from inside an alert
        if (key === "global") { netA.global = byRef(nref); netExp.global = false; renderGlobalNet(); }
        else { var a2 = byRef(nref); if (a2) { renderCase(a2); show("screen-detail"); } }
        return;
      }
      if (host) {
        host.querySelectorAll(".vi-node").forEach(function (n) { n.classList.remove("selected"); });
        node.classList.add("selected");
        var parts = node.getAttribute("data-node").split("|");
        var pop = host.querySelector(".vi-pop");
        if (pop) { pop.style.display = "block"; pop.innerHTML = '<b>' + parts[0] + '</b>' + (parts[1] ? '<br/><span>' + parts[1] + '</span>' : ''); }
      }
      return;
    }

    var ctab = e.target.closest("[data-casetab]");
    if (ctab && CUR) {
      caseTab = ctab.getAttribute("data-casetab");
      document.querySelectorAll(".vitabs .fchip").forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-casetab") === caseTab); });
      document.getElementById("case-tabbody").innerHTML = caseTabBody(CUR, caseTab);
      return;
    }

    var act = e.target.closest("[data-action]");
    if (act) { confirmSheet(act.getAttribute("data-action"), act.getAttribute("data-ref")); return; }

    var card = e.target.closest("[data-ref]");
    if (card && !card.hasAttribute("data-action")) { var a = byRef(card.getAttribute("data-ref")); if (a) { renderCase(a); show("screen-detail"); } return; }

    var nav = e.target.closest("[data-tab]"); if (nav) { show(nav.getAttribute("data-tab")); return; }

    var filt = e.target.closest("[data-filter]");
    if (filt) {
      document.querySelectorAll("#strategy-filters .fchip").forEach(function (c) { c.classList.remove("is-active"); });
      filt.classList.add("is-active"); strategyFilter = filt.getAttribute("data-filter"); renderAlerts(); return;
    }

    if (e.target.closest("#reset-demo")) { try { localStorage.removeItem("ksb_decisions"); localStorage.removeItem("ksb_history"); } catch (er) {} location.reload(); return; }

    if (e.target.closest("#scan-plate")) {
      var hint = document.getElementById("scan-hint"); if (hint) hint.hidden = false;
      setTimeout(function () {
        if (hint) hint.hidden = true;
        var cl = pending(); if (cl.length) {
          var pick = cl[Math.floor(Math.random() * cl.length)];
          var plateNum = pick.plate.replace("KW ", "");
          searchTerm = plateNum; strategyFilter = "all";
          var sa = document.getElementById("search-all"); if (sa) sa.value = plateNum;
          renderAlerts(); show("screen-alerts");
        }
      }, 1300);
      return;
    }
  });

  /* search inputs (home + alerts share searchTerm) */
  function wireSearch(id) {
    var el = document.getElementById(id); if (!el) return;
    el.addEventListener("input", function () {
      searchTerm = el.value.trim();
      var sa = document.getElementById("search-all"); if (sa && id !== "search-all") sa.value = searchTerm;
      renderAlerts();
      var as = document.getElementById("screen-alerts");
      if (as && !as.classList.contains("is-active") && searchTerm) show("screen-alerts");
    });
  }

  /* ============================ init ============================ */
  function refresh() { renderHome(); renderAlerts(); renderProfile(); }
  refresh();
  var sAll = document.getElementById("search-all"); if (sAll) wireSearch("search-all");
  var ns = document.getElementById("net-search");
  if (ns) ns.addEventListener("input", function () {
    var q = ns.value.trim(); netExp.global = false;
    if (!q) { netA.global = topCase(); renderGlobalNet(); return; }
    var m = findEntity(q);
    if (m) { netA.global = m; renderGlobalNet(); }
    else {
      document.getElementById("net-global").innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px">لا توجد كيانات مطابقة.</p>';
      document.getElementById("net-result").innerHTML = "";
    }
  });
  window.addEventListener("storage", function (e) { if (e.key === "ksb_submissions" || e.key === "ksb_decisions") refresh(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
})();
