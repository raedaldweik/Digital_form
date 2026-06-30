/* ===== Kuwait Smart Border — Officer App (Arabic) ===== */
(function () {
  "use strict";

  /* ---------- localized labels ---------- */
  var AR = {
    countries: {
      "Iraq":"العراق","Saudi Arabia":"السعودية","United Arab Emirates":"الإمارات","U.A.E.":"الإمارات",
      "Bahrain":"البحرين","Qatar":"قطر","Oman":"عُمان","Jordan":"الأردن","Egypt":"مصر","Türkiye":"تركيا",
      "Lebanon":"لبنان","Syria":"سوريا","Yemen":"اليمن","Kuwait":"الكويت","Iran":"إيران","India":"الهند",
      "Pakistan":"باكستان","Other":"أخرى","—":"—"
    },
    purpose: { Tourism:"سياحة", Business:"أعمال", Family:"زيارة عائلية", Medical:"علاج", Transit:"عبور" },
    duration: { "1-7":"١ - ٧ أيام", "8-30":"٨ - ٣٠ يوماً", "30+":"أكثر من ٣٠ يوماً" },
    vtype: { Sedan:"سيدان", SUV:"دفع رباعي", Pickup:"بيك أب", Van:"فان", Bus:"حافلة", Truck:"شاحنة", Motorcycle:"دراجة نارية" },
    items: { Currency:"عملات", Electronics:"إلكترونيات", Medication:"أدوية", Commercial:"بضائع تجارية", None:"لا شيء" }
  };
  function ctry(c) { return AR.countries[c] || c || "—"; }
  function yn(v) { return v === "Yes" ? "نعم" : "لا"; }

  /* ---------- seed sample applicants (so the app is never empty) ---------- */
  var SEED = [
    {
      ref: "SBD-7731", lane: 3, submittedAt: Date.now() - 6 * 60000,
      traveler: { passport: "K2891453", fullname: "يوسف أحمد الحربي", nationality: "Kuwait", dob: "1989-04-12", mobile: "55012233", email: "yusuf@example.com" },
      travel: { purpose: "Business", departure: "Iraq", previous: ["Türkiye", "Iraq"], duration: "8-30", items: ["Commercial"], cash: 14500, restricted: "Yes", merchandise: "Yes", largecash: "Yes" },
      vehicleInfo: { plate: "3 / 84210", regcountry: "Kuwait", vtype: "SUV", model: "Toyota Land Cruiser", color: "White" },
      wakala: { type: "NonKuwait", number: "WK-2231" }, documents: {}
    },
    {
      ref: "SBD-7745", lane: 5, submittedAt: Date.now() - 22 * 60000,
      traveler: { passport: "A7740219", fullname: "عمر خليفة منصور", nationality: "Iraq", dob: "1985-11-30", mobile: "55119922", email: "omar@example.com" },
      travel: { purpose: "Business", departure: "Iraq", previous: ["Jordan"], duration: "8-30", items: ["None"], cash: 3000, restricted: "No", merchandise: "Yes", largecash: "No" },
      vehicleInfo: { plate: "5 / 11045", regcountry: "Iraq", vtype: "Truck", model: "Mercedes Actros", color: "Silver" },
      wakala: { type: "Kuwait", number: "WK-0098" }, documents: {}
    },
    {
      ref: "SBD-7760", lane: 4, submittedAt: Date.now() - 40 * 60000,
      traveler: { passport: "U5521003", fullname: "محمد صالح", nationality: "United Arab Emirates", dob: "1990-06-02", mobile: "55667788", email: "m.saleh@example.com" },
      travel: { purpose: "Tourism", departure: "Saudi Arabia", previous: ["Bahrain", "Qatar"], duration: "1-7", items: ["Electronics"], cash: 800, restricted: "No", merchandise: "No", largecash: "No" },
      vehicleInfo: { plate: "9 / 52910", regcountry: "U.A.E.", vtype: "SUV", model: "Nissan Patrol", color: "Black" },
      wakala: { type: "NonKuwait", number: "WK-7781" }, documents: {}
    },
    {
      ref: "SBD-7766", lane: 1, submittedAt: Date.now() - 70 * 60000,
      traveler: { passport: "E1183562", fullname: "عائشة رحمن", nationality: "Egypt", dob: "1992-02-08", mobile: "55443322", email: "aisha@example.com" },
      travel: { purpose: "Family", departure: "Jordan", previous: [], duration: "30+", items: ["None"], cash: 500, restricted: "No", merchandise: "No", largecash: "No" },
      vehicleInfo: { plate: "1 / 47788", regcountry: "Kuwait", vtype: "Sedan", model: "Hyundai Sonata", color: "Grey" },
      wakala: { type: "Kuwait", number: "WK-0440" }, documents: {}
    },
    {
      ref: "SBD-7752", lane: 2, submittedAt: Date.now() - 120 * 60000,
      traveler: { passport: "J3320781", fullname: "سارة النجار", nationality: "Jordan", dob: "1994-09-19", mobile: "55221100", email: "sara@example.com" },
      travel: { purpose: "Tourism", departure: "Saudi Arabia", previous: ["Bahrain"], duration: "1-7", items: ["None"], cash: 200, restricted: "No", merchandise: "No", largecash: "No" },
      vehicleInfo: { plate: "2 / 90233", regcountry: "Kuwait", vtype: "SUV", model: "Kia Sportage", color: "Grey" },
      wakala: { type: "Kuwait", number: "WK-0512" }, documents: {}
    }
  ];

  /* ---------- decisions (officer actions) persisted ---------- */
  function getDecisions() { try { return JSON.parse(localStorage.getItem("ksb_decisions") || "{}"); } catch (e) { return {}; } }
  function setDecision(ref, status) {
    var d = getDecisions(); d[ref] = status;
    try { localStorage.setItem("ksb_decisions", JSON.stringify(d)); } catch (e) {}
  }

  /* ---------- load + normalize applicants ---------- */
  function loadSubmissions() {
    try {
      var arr = JSON.parse(localStorage.getItem("ksb_submissions") || "[]");
      return arr.slice().reverse(); // newest first
    } catch (e) { return []; }
  }

  function scoreOf(a) {
    var t = a.travel || {}, v = a.vehicleInfo || {}, w = a.wakala || {};
    var s = 16, f = [];
    function add(name, wt, active) { f.push({ name: name, weight: wt, active: active }); if (active) s += wt; }
    add("بضائع مقيّدة أو محظورة", 30, t.restricted === "Yes");
    add("بضائع تجارية", 16, t.merchandise === "Yes" || (t.items || []).indexOf("Commercial") >= 0);
    add("نقد يتجاوز ١٠٬٠٠٠ د.ك", 20, t.largecash === "Yes" || (parseFloat(t.cash) || 0) > 10000);
    add("وكالة غير كويتية", 12, w.type === "NonKuwait");
    add("دولة مغادرة عالية الخطورة", 14, ["Iraq", "Syria", "Iran", "Yemen"].indexOf(t.departure) >= 0);
    add("مركبة مسجّلة خارج الكويت", 8, v.regcountry && v.regcountry !== "Kuwait");
    if (s > 100) s = 100;
    return { score: s, factors: f };
  }
  function levelOf(score) { return score >= 70 ? "High" : score >= 42 ? "Medium" : "Low"; }
  function levelAr(lvl) { return lvl === "High" ? "عالية" : lvl === "Medium" ? "متوسطة" : "منخفضة"; }
  function colorOf(lvl) { return lvl === "High" ? "#df3a2f" : lvl === "Medium" ? "#d9870a" : "#0a9d57"; }

  function normalize(raw) {
    var sc = scoreOf(raw);
    var dec = getDecisions()[raw.ref] || "pending";
    var v = raw.vehicleInfo || {};
    return {
      ref: raw.ref,
      driver: (raw.traveler && raw.traveler.fullname) || raw.driver || "مسافر",
      nat: (raw.traveler && raw.traveler.nationality) || raw.nat || "—",
      plate: v.plate ? ("KW " + v.plate) : (raw.plate || "KW —"),
      vehicleText: [v.model, v.color].filter(Boolean).join(" · ") || raw.vehicle || "—",
      lane: raw.lane || 1,
      submittedAt: raw.submittedAt || 0,
      traveler: raw.traveler || {}, travel: raw.travel || {}, vehicleInfo: v,
      wakala: raw.wakala || {}, documents: raw.documents || {},
      score: sc.score, factors: sc.factors, level: levelOf(sc.score),
      status: dec, isNew: !!raw.submittedAt && (Date.now() - raw.submittedAt < 10 * 60000)
    };
  }

  function allApplicants() {
    var subs = loadSubmissions();
    var combined = subs.concat(SEED);
    // de-dup by ref (submissions win)
    var seen = {}, out = [];
    combined.forEach(function (r) { if (r.ref && !seen[r.ref]) { seen[r.ref] = 1; out.push(normalize(r)); } });
    return out;
  }
  function byRef(ref) { return allApplicants().filter(function (a) { return a.ref === ref; })[0]; }

  /* ---------- progress ring ---------- */
  function ring(score, size) {
    var stroke = size >= 90 ? 7 : 5;
    var r = (size - stroke) / 2 - 1;
    var c = 2 * Math.PI * r;
    var off = c * (1 - score / 100);
    var col = colorOf(levelOf(score));
    var cx = size / 2;
    var inner = size >= 90 ? '<span class="score">' + score + '<small>الخطورة</small></span>' : '<span class="score">' + score + '</span>';
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="rgba(20,40,80,.10)" stroke-width="' + stroke + '" fill="none"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + col + '" stroke-width="' + stroke + '" fill="none" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" style="filter:drop-shadow(0 0 6px ' + col + '88)"/>' +
      '</svg>' + inner + '</div>';
  }

  var flagIc = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

  function statusTag(a) {
    if (a.status === "investigator") return '<span class="newtag" style="background:#d9870a">قيد التحقيق</span>';
    if (a.status === "rejected") return '<span class="newtag" style="background:#df3a2f">مرفوض</span>';
    if (a.isNew) return '<span class="newtag">جديد</span>';
    return "";
  }

  function flagsHTML(a) {
    var f = "";
    a.factors.forEach(function (x) {
      if (x.active) f += '<span class="flag ' + (x.weight >= 20 ? "red" : "amber") + '">' + flagIc + x.name + '</span>';
    });
    if (!f) f = '<span class="flag">لا توجد مؤشرات</span>';
    return f;
  }

  function applicantCard(a) {
    return '<div class="task glass" data-ref="' + a.ref + '">' +
      ring(a.score, 56) +
      '<div class="task-main">' +
        '<div class="task-top"><span class="plate">' + a.plate + '</span><span class="lane">مسار ' + a.lane + '</span>' + statusTag(a) + '</div>' +
        '<div class="task-driver">' + a.driver + ' · ' + ctry(a.nat) + ' · <span class="level-tag level-' + a.level + '">مخاطر ' + levelAr(a.level) + '</span></div>' +
        '<div class="flags">' + flagsHTML(a) + '</div>' +
      '</div>' +
      '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
    '</div>';
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    var all = allApplicants();
    document.getElementById("kpi-total").textContent = all.length;
    document.getElementById("kpi-high").textContent = all.filter(function (a) { return a.level === "High"; }).length;
    document.getElementById("kpi-inv").textContent = all.filter(function (a) { return a.status === "investigator"; }).length;
    var recent = all.slice().sort(function (a, b) { return (b.submittedAt || 0) - (a.submittedAt || 0); }).slice(0, 4);
    document.getElementById("home-list").innerHTML = recent.map(applicantCard).join("");
  }

  /* ---------- APPLICANTS ---------- */
  var currentFilter = "all", searchTerm = "";
  function renderApplicants() {
    var list = allApplicants().filter(function (a) {
      if (currentFilter === "investigator") { if (a.status !== "investigator") return false; }
      else if (currentFilter !== "all") { if (a.level !== currentFilter) return false; }
      if (searchTerm) {
        var hay = (a.driver + " " + a.plate + " " + a.ref).toLowerCase();
        if (hay.indexOf(searchTerm.toLowerCase()) === -1) return false;
      }
      return true;
    });
    document.getElementById("applicant-list").innerHTML =
      list.length ? list.map(applicantCard).join("") : '<p style="color:var(--muted);text-align:center;padding:30px">لا توجد طلبات مطابقة.</p>';
  }

  /* ---------- helpers for detail ---------- */
  function kvRow(key, valueHTML) {
    return '<div class="kv"><span class="k">' + key + '</span><span class="v">' + valueHTML + '</span></div>';
  }
  function factorBar(x) {
    var col = x.active ? (x.weight >= 20 ? "#df3a2f" : "#d9870a") : "#0a9d57";
    return '<div class="factor"><div class="factor-h"><span class="fn">' + x.name + '</span>' +
      '<span class="fw" style="color:' + col + '">+' + (x.active ? x.weight : 0) + '</span></div>' +
      '<div class="bar"><i style="width:' + (x.active ? Math.min(100, x.weight * 3) : 6) + '%;background:' + col + '"></i></div></div>';
  }
  function docBlock(label, dataUrl) {
    if (dataUrl) return '<div class="doc" data-img="' + label + '"><img src="' + dataUrl + '" alt="' + label + '" /><span>' + label + '</span></div>';
    return '<div class="doc doc-empty"><span class="doc-ph">لم يُرفق</span><span>' + label + '</span></div>';
  }

  /* ---------- APPLICANT DETAIL ---------- */
  function renderDetail(a) {
    var col = colorOf(a.level);
    document.getElementById("detail-title").textContent = a.plate;
    var t = a.traveler, tv = a.travel, v = a.vehicleInfo, w = a.wakala;
    var prev = (tv.previous || []).map(ctry).join("، ") || "—";
    var items = (tv.items || []).map(function (i) { return AR.items[i] || i; }).join("، ") || "—";

    var flagged = a.level === "High" || a.level === "Medium";
    var reco = flagged
      ? '<div class="reco"><span class="ric">' + flagIc.replace('12" height="12"', '20" height="20"').replace('stroke-width="2"', 'stroke="#df3a2f" stroke-width="2"') + '</span><div><b>يُوصى بمراجعة إضافية</b><p>تشير مؤشرات المخاطر إلى ضرورة التحقق قبل التخليص. يمكنك تحويل الطلب إلى المحقّق.</p></div></div>'
      : '<div class="reco clear"><span class="ric"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0a9d57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><div><b>مؤهّل للتخليص</b><p>لا توجد مؤشرات خطورة عالية. يُوصى بالمعالجة الاعتيادية.</p></div></div>';

    var statusBanner = a.status === "investigator"
      ? '<div class="state-banner amber">⚑ هذا الطلب محوّل حالياً إلى المحقّق</div>'
      : a.status === "rejected"
      ? '<div class="state-banner red">✕ تم رفض هذا الطلب</div>' : "";

    var html =
      statusBanner +
      '<div class="risk-hero glass-hi glass">' + ring(a.score, 96) +
        '<div class="rh-tx"><div class="lvl" style="color:' + col + '">مخاطر ' + levelAr(a.level) + '</div>' +
        '<div class="src"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0c8f63" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> تقييم آلي · <b>محرّك المخاطر</b></div>' +
        '<div class="src">' + a.vehicleText + '</div></div></div>' +

      reco +

      // ===== Personal info =====
      '<div class="info-card glass"><h4>معلومات المسافر</h4>' +
        kvRow("الاسم الكامل", t.fullname || "—") +
        kvRow("رقم الجواز", t.passport || "—") +
        kvRow("الجنسية", ctry(t.nationality)) +
        kvRow("تاريخ الميلاد", t.dob || "—") +
        kvRow("رقم الهاتف", (t.dialcode ? t.dialcode + " " : "") + (t.mobile || "—")) +
        kvRow("البريد الإلكتروني", t.email || "—") +
      '</div>' +

      // ===== Travel declaration =====
      '<div class="info-card glass"><h4>تصريح السفر</h4>' +
        kvRow("الغرض من الزيارة", AR.purpose[tv.purpose] || tv.purpose || "—") +
        kvRow("بلد المغادرة", ctry(tv.departure)) +
        kvRow("الدول المزارة سابقاً", prev) +
        kvRow("مدة الإقامة", AR.duration[tv.duration] || tv.duration || "—") +
        kvRow("أصناف مصرّح بها", items) +
        kvRow("النقد المصرّح به", (tv.cash != null ? tv.cash : 0) + " د.ك") +
        '<div class="kv"><span class="k">بضائع مقيّدة/محظورة</span><span class="v ' + (tv.restricted === "Yes" ? "red" : "green") + '">' + yn(tv.restricted) + '</span></div>' +
        '<div class="kv"><span class="k">بضائع تجارية</span><span class="v ' + (tv.merchandise === "Yes" ? "amber" : "green") + '">' + yn(tv.merchandise) + '</span></div>' +
        '<div class="kv"><span class="k">نقد يتجاوز ١٠٬٠٠٠ د.ك</span><span class="v ' + (tv.largecash === "Yes" ? "red" : "green") + '">' + yn(tv.largecash) + '</span></div>' +
      '</div>' +

      // ===== Vehicle =====
      '<div class="info-card glass"><h4>معلومات المركبة</h4>' +
        kvRow("رقم اللوحة", a.plate) +
        kvRow("بلد التسجيل", ctry(v.regcountry)) +
        kvRow("نوع المركبة", AR.vtype[v.vtype] || v.vtype || "—") +
        kvRow("الصنع والطراز", v.model || "—") +
        kvRow("اللون", v.color || "—") +
      '</div>' +

      // ===== Wakala =====
      '<div class="info-card glass"><h4>الوكالة</h4>' +
        '<div class="kv"><span class="k">نوع الوكالة</span><span class="v ' + (w.type === "NonKuwait" ? "amber" : "green") + '">' + (w.type === "NonKuwait" ? "وكالة غير كويتية" : "وكالة كويتية") + '</span></div>' +
        kvRow("رقم / اسم الوكالة", w.number || "—") +
      '</div>' +

      // ===== Documents =====
      '<div class="info-card glass"><h4>المستندات المرفقة</h4><div class="docs">' +
        docBlock("جواز السفر", a.documents.passport) +
        docBlock("دفتر السيارة", a.documents.daftar) +
      '</div></div>' +

      // ===== Risk breakdown =====
      '<div class="info-card glass"><h4>تفصيل درجة المخاطر</h4>' +
        a.factors.map(factorBar).join("") +
      '</div>' +

      // ===== Actions =====
      '<div class="actions">' +
        '<button class="btn btn-flag" data-action="reject" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> رفض</button>' +
        '<button class="btn btn-invest" data-action="investigator" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> تحويل إلى المحقّق</button>' +
      '</div>';

    document.getElementById("detail-body").innerHTML = html;
  }

  /* ---------- INVESTIGATOR ---------- */
  function renderInvestigator() {
    var list = allApplicants().filter(function (a) { return a.status === "investigator"; });
    document.getElementById("investigator-list").innerHTML =
      list.length ? list.map(applicantCard).join("")
        : '<p style="color:var(--muted);text-align:center;padding:30px">لا توجد قضايا قيد التحقيق.<br/>حوّل طلباً من شاشة التفاصيل ليظهر هنا.</p>';
  }

  // entity network graph (SAS Visual Investigator style) as an SVG
  function networkGraph(a) {
    var col = colorOf(a.level);
    var W = 320, H = 280, cx = W / 2, cy = H / 2;
    var nodes = [
      { x: cx - 118, y: cy - 70, ic: "🚗", label: a.vehicleInfo.plate || "مركبة", cls: "veh" },
      { x: cx + 118, y: cy - 70, ic: "🛂", label: a.traveler.passport || "جواز", cls: "doc" },
      { x: cx - 130, y: cy + 60, ic: "📄", label: (a.wakala.type === "NonKuwait" ? "وكالة غير كويتية" : "وكالة كويتية"), cls: (a.wakala.type === "NonKuwait" ? "warn" : "ok") },
      { x: cx + 130, y: cy + 60, ic: "🌍", label: ctry(a.travel.departure), cls: (["Iraq", "Syria", "Iran", "Yemen"].indexOf(a.travel.departure) >= 0 ? "warn" : "ok") },
      { x: cx, y: cy + 108, ic: "🧾", label: a.ref, cls: "doc" }
    ];
    var lines = nodes.map(function (n) {
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + n.x + '" y2="' + n.y + '" stroke="rgba(20,40,80,.18)" stroke-width="1.6"/>';
    }).join("");
    var nodeEls = nodes.map(function (n) {
      return '<g class="vi-node vi-' + n.cls + '" style="transform:translate(' + n.x + 'px,' + n.y + 'px)">' +
        '<circle r="22"/><text class="vi-ic" text-anchor="middle" dy="6">' + n.ic + '</text>' +
        '<text class="vi-lbl" text-anchor="middle" dy="38">' + n.label + '</text></g>';
    }).join("");
    var center = '<g style="transform:translate(' + cx + 'px,' + cy + 'px)">' +
      '<circle r="30" fill="' + col + '" opacity=".18"/>' +
      '<circle r="26" fill="' + col + '"/>' +
      '<text text-anchor="middle" dy="6" font-size="20">👤</text>' +
      '<text class="vi-lbl" text-anchor="middle" dy="46" style="font-weight:800">' + a.driver + '</text></g>';
    return '<svg class="vi-graph" viewBox="0 0 ' + W + ' ' + H + '" width="100%">' + lines + nodeEls + center + '</svg>';
  }

  function renderCase(a) {
    document.getElementById("case-title").textContent = "تحقيق · " + a.plate;
    var col = colorOf(a.level);
    var active = a.factors.filter(function (x) { return x.active; });

    var timeline = [
      { t: "الآن", txt: "تم تحويل القضية إلى المحقّق من قبل الضابط" },
      { t: "−" + Math.max(1, Math.round((Date.now() - (a.submittedAt || Date.now())) / 60000)) + " د", txt: "تم استلام التصريح عبر منصة المنافذ الذكية" },
      { t: "تقييم", txt: "محرّك المخاطر أعطى درجة " + a.score + " (" + levelAr(a.level) + ")" }
    ];
    if (a.wakala.type === "NonKuwait") timeline.push({ t: "تنبيه", txt: "الوكالة غير كويتية — يتطلب التحقق من المستندات" });
    if (["Iraq", "Syria", "Iran", "Yemen"].indexOf(a.travel.departure) >= 0) timeline.push({ t: "تنبيه", txt: "بلد المغادرة ضمن قائمة المراقبة: " + ctry(a.travel.departure) });

    var html =
      '<div class="risk-hero glass-hi glass">' + ring(a.score, 96) +
        '<div class="rh-tx"><div class="lvl" style="color:' + col + '">مخاطر ' + levelAr(a.level) + '</div>' +
        '<div class="src"><span class="vi-logo sm">VI</span> محقّق المنافذ الذكية</div>' +
        '<div class="src">' + a.driver + ' · ' + ctry(a.nat) + '</div></div></div>' +

      '<div class="info-card glass"><h4>شبكة الكيانات والعلاقات</h4>' + networkGraph(a) +
        '<p class="vi-cap">رسم بياني للعلاقات بين المسافر ومركبته ووثائقه ووكالته وبلد مغادرته.</p></div>' +

      '<div class="info-card glass"><h4>الكيانات المرتبطة</h4>' +
        kvRow("المسافر", a.driver) +
        kvRow("المركبة", a.plate + " · " + a.vehicleText) +
        kvRow("الجواز", a.traveler.passport || "—") +
        kvRow("الوكالة", (a.wakala.number || "—") + (a.wakala.type === "NonKuwait" ? " (غير كويتية)" : " (كويتية)")) +
        kvRow("بلد المغادرة", ctry(a.travel.departure)) +
      '</div>' +

      '<div class="info-card glass"><h4>مؤشرات الخطورة</h4>' +
        (active.length ? active.map(function (x) { return '<div class="kv"><span class="k"><span style="color:' + (x.weight >= 20 ? "#df3a2f" : "#d9870a") + '">⚑</span> ' + x.name + '</span><span class="v" style="color:' + (x.weight >= 20 ? "#df3a2f" : "#d9870a") + '">+' + x.weight + '</span></div>'; }).join("") : '<p style="color:var(--muted);margin:0">لا توجد مؤشرات نشطة.</p>') +
      '</div>' +

      '<div class="info-card glass"><h4>الخط الزمني</h4><div class="vi-timeline">' +
        timeline.map(function (e) { return '<div class="vi-ev"><span class="vi-dot"></span><div><b>' + e.t + '</b><p>' + e.txt + '</p></div></div>'; }).join("") +
      '</div></div>' +

      '<div class="actions">' +
        '<button class="btn btn-clear" data-action="close" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> إغلاق التحقيق</button>' +
        '<button class="btn btn-flag" data-action="reject" data-ref="' + a.ref + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> رفض</button>' +
      '</div>';

    document.getElementById("case-body").innerHTML = html;
  }

  /* ---------- PROFILE counts ---------- */
  function renderProfile() {
    var d = getDecisions(), inv = 0, rej = 0;
    Object.keys(d).forEach(function (k) { if (d[k] === "investigator") inv++; else if (d[k] === "rejected") rej++; });
    document.getElementById("prof-cleared").textContent = allApplicants().length;
    document.getElementById("prof-inv").textContent = inv;
    document.getElementById("prof-rej").textContent = rej;
  }

  /* ---------- image lightbox ---------- */
  function openLightbox(src) {
    var ov = document.createElement("div");
    ov.className = "lightbox";
    ov.innerHTML = '<img src="' + src + '" alt="" />';
    ov.addEventListener("click", function () { ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ---------- navigation ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var el = document.getElementById(id);
    if (el) el.classList.add("is-active");
    var scroll = el && el.querySelector(".scroll");
    if (scroll) { scroll.classList.add("fade-in"); setTimeout(function () { scroll.classList.remove("fade-in"); }, 360); }
    var bar = document.getElementById("tabbar");
    bar.classList.toggle("hidden", id === "screen-detail" || id === "screen-case");
    var sb = document.querySelector(".statusbar");
    if (sb) sb.classList.toggle("sb-light", id === "screen-home");
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab") === id); });
    window.scrollTo(0, 0);
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var doc = e.target.closest(".doc[data-img]");
    if (doc) { var im = doc.querySelector("img"); if (im) openLightbox(im.src); return; }

    var act = e.target.closest("[data-action]");
    if (act) {
      var ref = act.getAttribute("data-ref");
      var action = act.getAttribute("data-action");
      if (action === "investigator") { setDecision(ref, "investigator"); refresh(); show("screen-investigator"); }
      else if (action === "reject") { setDecision(ref, "rejected"); refresh(); show("screen-applicants"); }
      else if (action === "close") { setDecision(ref, "closed"); refresh(); show("screen-investigator"); }
      return;
    }

    var card = e.target.closest("[data-ref]");
    if (card && !card.hasAttribute("data-action")) {
      var a = byRef(card.getAttribute("data-ref"));
      if (a) {
        if (a.status === "investigator") { renderCase(a); show("screen-case"); }
        else { renderDetail(a); show("screen-detail"); }
      }
      return;
    }

    var nav = e.target.closest("[data-tab]");
    if (nav) { show(nav.getAttribute("data-tab")); return; }

    var filt = e.target.closest("[data-filter]");
    if (filt) {
      document.querySelectorAll("#app-filters .fchip").forEach(function (c) { c.classList.remove("is-active"); });
      filt.classList.add("is-active");
      currentFilter = filt.getAttribute("data-filter");
      renderApplicants();
      return;
    }

    if (e.target.closest("#reset-demo")) {
      try { localStorage.removeItem("ksb_decisions"); } catch (er) {}
      refresh(); show("screen-home");
      return;
    }

    if (e.target.closest("#scan-plate")) {
      var hint = document.getElementById("scan-hint");
      hint.hidden = false;
      setTimeout(function () {
        hint.hidden = true;
        var all = allApplicants();
        if (all.length) {
          var pick = all[Math.floor(Math.random() * all.length)];
          var plateNum = pick.plate.replace("KW ", "");
          document.getElementById("search-plate").value = plateNum;
          searchTerm = plateNum; currentFilter = "all";
          document.querySelectorAll("#app-filters .fchip").forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-filter") === "all"); });
          var sa = document.getElementById("search-all"); if (sa) sa.value = plateNum;
          renderApplicants(); show("screen-applicants");
        }
      }, 1300);
      return;
    }
  });

  /* search inputs */
  function wireSearch(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      searchTerm = el.value.trim();
      // mirror across the search boxes
      ["search-name", "search-plate", "search-all"].forEach(function (oid) {
        if (oid !== id) { var o = document.getElementById(oid); if (o && o.value !== searchTerm) o.value = searchTerm; }
      });
      renderApplicants();
      if (document.getElementById("screen-applicants") && !document.getElementById("screen-applicants").classList.contains("is-active") && searchTerm) {
        show("screen-applicants");
      }
    });
  }

  /* ---------- init / refresh ---------- */
  function refresh() { renderHome(); renderApplicants(); renderInvestigator(); renderProfile(); }
  refresh();
  wireSearch("search-name");
  wireSearch("search-plate");
  wireSearch("search-all");

  window.addEventListener("storage", function (e) { if (e.key === "ksb_submissions" || e.key === "ksb_decisions") refresh(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
})();
