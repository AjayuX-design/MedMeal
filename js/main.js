/* MedMeal demo site. Shared header, footer, icons and form behaviour.
   Forms are front-end only in this demo: nothing is sent anywhere yet. */
(function () {
  "use strict";

  // Contact details in one place. Confirm which number is WhatsApp before launch.
  var CALL = "918984463777";
  var WHATSAPP = "918984463777";
  var SECOND_LINE = "9533322296";
  var EMAIL = "info@medmeal.in";
  var WA_TEXT = "Hello MedMeal, I would like nutrition support for a patient.";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var ICONS = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    whatsapp: '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05.9"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    menu: '<path d="M4 12h16M4 6h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    shieldplain: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    pot: '<path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M2 11h20"/><path d="M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon' + (cls ? " " + cls : "") + '" aria-hidden="true" viewBox="0 0 24 24"><use href="#i-' + name + '"/></svg>';
  }
  function sprite() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>';
    Object.keys(ICONS).forEach(function (k) { s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + "</symbol>"; });
    return s + "</defs></svg>";
  }

  var NAV = [
    ["Solutions", "solutions.html"],
    ["RT and PEG", "rt-peg-feeding.html"],
    ["Hospitals", "for-hospitals.html"],
    ["About", "about.html"],
    ["Contact", "contact.html"]
  ];
  var page = (location.pathname.split("/").pop() || "index.html");
  var navPage = /-feeds\.html$/.test(page) ? "solutions.html" : page;
  function isCurrent(href) { return href.split("#")[0] === navPage && href.indexOf("#") === -1; }
  function waHref() { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(WA_TEXT); }

  function headerHTML() {
    var desk = NAV.map(function (n) { return '<li><a href="' + n[1] + '"' + (isCurrent(n[1]) ? ' aria-current="page"' : "") + ">" + n[0] + "</a></li>"; }).join("");
    var mob = NAV.map(function (n) { return '<a class="nav-link" href="' + n[1] + '"' + (isCurrent(n[1]) ? ' aria-current="page"' : "") + ">" + n[0] + "</a>"; }).join("");
    return '<a class="skip-link" href="#main">Skip to main content</a>' +
      '<header class="site-header"><div class="container"><div class="pill">' +
      '<a class="brand" href="index.html" aria-label="MedMeal home">MedMeal</a>' +
      '<div class="header-right"><nav class="nav-desktop" aria-label="Main"><ul>' + desk + "</ul></nav>" +
      '<a class="btn btn--primary header-cta" href="book.html">Book a call</a>' +
      '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-mobile" aria-label="Open menu">' + icon("menu", "icon-open") + icon("close", "icon-close") + "</button></div>" +
      "</div></div></header>" +
      '<nav class="nav-mobile" id="nav-mobile" aria-label="Main mobile">' + mob + '<a class="btn btn--primary btn--lg" href="book.html">Book a consultation</a></nav>';
  }

  var FEED_LINKS = [
    ["Neuro", "neuro-feeds"], ["Oncology", "oncology-feeds"], ["Gastro", "gastro-feeds"], ["Renal", "renal-feeds"],
    ["Cardiac", "cardiac-feeds"], ["Surgical recovery", "surgical-recovery-feeds"], ["Semi-solid", "semi-solid-feeds"], ["Therapeutic weaning", "therapeutic-weaning-feeds"]
  ];

  function footerHTML() {
    var links = NAV.map(function (n) { return '<li><a href="' + n[1] + '">' + n[0] + "</a></li>"; }).join("");
    return '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      '<div><a class="brand" href="index.html">MedMeal</a><p class="muted footer-about">Tube feeding nutrition for patients in Vijayawada.</p></div>' +
      '<div><h2>Explore</h2><ul>' + links + "</ul></div>" +
      '<div><h2>Feeds</h2><ul>' + FEED_LINKS.map(function (f) { return '<li><a href="' + f[1] + '.html">' + f[0] + '<span class="ft-sfx"> feeds</span></a></li>'; }).join("") + "</ul></div>" +
      '<div><h2>Contact</h2><ul>' +
      '<li><a data-call href="#">8984463777</a></li><li><a href="tel:+91' + SECOND_LINE + '">' + SECOND_LINE + '</a></li>' +
      '<li><a href="mailto:' + EMAIL + '">' + EMAIL + '</a></li><li>Vijayawada, Andhra Pradesh</li></ul></div></div>' +
      '<div class="footer-note"><p>Feed selection is guided by a dietitian and based on each patient\'s clinical and nutritional needs. Information on this site does not replace medical advice.</p><p>&copy; <span id="year"></span> MedMeal.</p></div></div></footer>' +
      '<div class="mobile-bar" role="group" aria-label="Quick contact"><a class="btn btn--outline" data-call href="#">Call</a><a class="btn btn--outline" data-wa href="#"><i data-i="whatsapp"></i>WhatsApp</a><a class="btn btn--primary" href="book.html">Book now</a></div>';
  }

  function mount() {
    document.body.insertAdjacentHTML("afterbegin", sprite());
    var h = $("#site-header"), f = $("#site-footer");
    if (h) h.outerHTML = headerHTML();
    if (f) f.outerHTML = footerHTML();
    $$("[data-wa]").forEach(function (a) { a.href = waHref(); a.target = "_blank"; a.rel = "noopener"; });
    $$("[data-call]").forEach(function (a) { a.href = "tel:+" + CALL; });
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    // icons written in page HTML as <i data-i="name">
    $$("i[data-i]").forEach(function (el) {
      var span = document.createElement("span");
      span.innerHTML = icon(el.getAttribute("data-i"), el.getAttribute("data-class") || "");
      el.replaceWith(span.firstChild);
    });
  }

  function header() {
    var hd = $(".site-header"), btn = $(".menu-btn"), nav = $("#nav-mobile");
    if (!hd) return;
    var onScroll = function () { hd.classList.toggle("is-scrolled", window.scrollY > 4); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    if (!btn || !nav) return;
    function toggle(open) {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    }
    btn.addEventListener("click", function () { toggle(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1080) toggle(false); });
  }

  function reveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        t.classList.add("is-in"); io.unobserve(t);
        setTimeout(function () { t.style.transitionDelay = ""; t.classList.add("is-done"); }, 1000);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (e) {
      var sib = Array.prototype.filter.call(e.parentNode.children, function (c) { return c.classList.contains("reveal"); });
      if (sib.length > 1) e.style.transitionDelay = Math.min(sib.indexOf(e), 4) * 80 + "ms";
      io.observe(e);
    });
    var steps = $$(".hiw-list li");
    if (steps.length) {
      var so = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-active"); so.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -35% 0px", threshold: 0.2 });
      steps.forEach(function (s) { so.observe(s); });
    }
  }

  /* Forms */
  function errEl(field) {
    var wrap = field.closest(".field") || field.parentNode;
    var id = (field.id || field.name) + "-error";
    var p = document.getElementById(id);
    if (!p) { p = document.createElement("p"); p.className = "field-error"; p.id = id; p.setAttribute("role", "alert"); wrap.appendChild(p); }
    return p;
  }
  function setError(field, msg) {
    var p = errEl(field);
    if (msg) {
      p.innerHTML = icon("alert") + "<span>" + msg + "</span>";
      p.classList.add("is-shown");
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", p.id);
    } else {
      p.classList.remove("is-shown"); p.innerHTML = "";
      field.removeAttribute("aria-invalid"); field.removeAttribute("aria-describedby");
    }
    return !msg;
  }
  function checkField(f) {
    var v = (f.value || "").trim();
    var label = f.getAttribute("data-label") || "This field";
    if (f.type === "checkbox") return setError(f, f.required && !f.checked ? (f.getAttribute("data-error") || "Please tick this box to continue.") : "");
    if (f.required && !v) return setError(f, f.getAttribute("data-error") || (f.tagName === "SELECT" ? "Please choose an option." : label + " is required."));
    if (v && f.type === "tel") {
      var d = v.replace(/[\s-]/g, "");
      if (!/^(\+?91)?[6-9]\d{9}$/.test(d)) return setError(f, "Enter a 10 digit mobile number.");
    }
    if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError(f, "Enter a valid email address.");
    if (v && f.type === "number") {
      var n = Number(v);
      if (isNaN(n) || (f.min && n < Number(f.min)) || (f.max && n > Number(f.max))) return setError(f, "Enter an age between " + f.min + " and " + f.max + ".");
    }
    return setError(f, "");
  }
  function checkGroup(g) {
    var radios = $$('input[type="radio"]', g);
    var ok = radios.some(function (r) { return r.checked; });
    var p = g.querySelector(".field-error") || (function () { var e = document.createElement("p"); e.className = "field-error"; e.id = g.id + "-error"; e.setAttribute("role", "alert"); g.appendChild(e); return e; })();
    p.innerHTML = ok ? "" : icon("alert") + "<span>Please choose one option.</span>";
    p.classList.toggle("is-shown", !ok);
    return ok;
  }
  function validate(scope) {
    var firstBad = null, ok = true;
    $$("input[required], select[required], textarea[required], input[type=tel], input[type=email], input[type=number]", scope).forEach(function (f) {
      if (f.type === "radio") return;
      if (!checkField(f)) { ok = false; if (!firstBad) firstBad = f; }
    });
    $$("[data-group]", scope).forEach(function (g) { if (!checkGroup(g)) { ok = false; if (!firstBad) firstBad = $("input", g); } });
    if (firstBad) firstBad.focus();
    return ok;
  }
  function liveValidate(form) {
    $$("input, select, textarea", form).forEach(function (f) {
      if (f.type === "radio") return;
      f.addEventListener("blur", function () { if (f.required || f.value) checkField(f); });
      f.addEventListener("input", function () { if (f.getAttribute("aria-invalid")) checkField(f); });
    });
  }

  function simpleForms() {
    $$("form[data-simple]").forEach(function (form) {
      form.setAttribute("novalidate", "");
      liveValidate(form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var ok = $(".inline-success", form);
        if (ok) { ok.classList.add("is-shown"); ok.focus(); }
        form.reset();
      });
    });
  }

  function booking() {
    var form = $("#booking-form");
    if (!form) return;
    form.setAttribute("novalidate", "");
    liveValidate(form);
    var steps = $$("fieldset[data-step]", form), inds = $$(".progress li"), lab = $("#progress-label"), TITLES = ["Consultation", "Patient details", "Reports and send"], cur = 0;
    var FEES = { video: "₹799", phone: "₹499", unsure: "Fee shared by our team" };
    var NAMES = { video: "Video consultation", phone: "Phone consultation", unsure: "Not sure yet" };
    function show(n, initial) {
      cur = n;
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      inds.forEach(function (li, i) { li.classList.toggle("is-on", i <= n); });
      if (lab) lab.textContent = "Step " + (n + 1) + " of 3: " + TITLES[n];
      if (initial) return;
      var lg = $("legend", steps[n]); if (lg) { lg.setAttribute("tabindex", "-1"); lg.focus({ preventScroll: true }); }
      $("#form-top").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    $$("[data-next]", form).forEach(function (b) { b.addEventListener("click", function () { if (validate(steps[cur])) show(cur + 1); }); });
    $$("[data-back]", form).forEach(function (b) { b.addEventListener("click", function () { show(cur - 1); }); });
    var fee = $("#fee-note");
    $$('input[name="consult"]', form).forEach(function (r) {
      r.addEventListener("change", function () { if (fee) fee.textContent = FEES[r.value]; var g = $("#consult-group"); if (g) checkGroup(g); });
    });
    var params = new URLSearchParams(location.search), about = "", tag = $("#enquiry-tag");
    var PLANS = { daily: "the Daily plan", "15-day": "the 15-Day plan", monthly: "the Monthly plan" };
    var FEEDS = { neuro: "Neuro feeds", oncology: "Oncology feeds", gastro: "Gastro feeds", renal: "Renal feeds", cardiac: "Cardiac feeds", surgical: "Surgical feeds", semisolid: "Semi-solid feeds", weaning: "Therapeutic weaning feeds" };
    if (params.get("plan") && PLANS[params.get("plan")]) about = "I would like to ask about " + PLANS[params.get("plan")] + ".";
    if (params.get("feed") && FEEDS[params.get("feed")]) about = "I would like to ask about " + FEEDS[params.get("feed")] + ".";
    if (about) { var notes = $("#notes"); if (notes) notes.value = about; if (tag) { tag.hidden = false; tag.textContent = about.replace("I would like to ask about ", "Enquiry about: ").replace(/\.$/, ""); } }
    var files = $("#reports"), names = $("#file-names");
    if (files && names) files.addEventListener("change", function () {
      names.textContent = files.files.length ? Array.prototype.map.call(files.files, function (f) { return f.name; }).join(", ") : "";
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(steps[cur])) return;
      var c = ($('input[name="consult"]:checked', form) || {}).value || "unsure";
      var sum = $("#summary");
      sum.innerHTML = "<dl><dt>Consultation</dt><dd>" + NAMES[c] + "</dd><dt>Patient</dt><dd>" + esc($("#patient").value) + "</dd><dt>Contact</dt><dd>" + esc($("#phone").value) + "</dd></dl>";
      $("#thanks-name").textContent = $("#contact-name").value.trim().split(" ")[0];
      $("#form-wrap").hidden = true; $("#thanks").hidden = false;
      var h = $("#thanks h2"); h.setAttribute("tabindex", "-1"); h.focus();
      $("#form-top").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    show(0, true);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  document.addEventListener("DOMContentLoaded", function () {
    mount(); header(); reveal(); simpleForms(); booking();
  });
})();
