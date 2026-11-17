// Staff app: sign in, then one screen per role. The database decides what each role may read.
// The page gets the database address and public key from /api/config.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var SCREEN = { dietitian: "/app/dietitian.html", kitchen: "/app/kitchen.html", admin: "/app/admin.html" };
  var ROLE_LABEL = { dietitian: "Dietitian", kitchen: "Kitchen", admin: "Admin" };
  var client;

  function setup() {
    return fetch("/api/config").then(function (r) { if (!r.ok) throw new Error("not set up"); return r.json(); }).then(function (c) {
      client = window.supabase.createClient(c.url, c.anonKey);
      return client;
    });
  }
  function profile() {
    return client.from("my_profile").select("name, role").maybeSingle().then(function (r) { return r.data; });
  }
  function fail(text) { var m = $("#msg"); if (!m) return; m.textContent = text; m.classList.add("is-shown"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  // ---------------------------------------------------------------- Login page
  function login() {
    setup().then(function () {
      return client.auth.getSession().then(function (s) { return s.data.session ? profile() : null; });
    }).then(function (p) {
      if (p && SCREEN[p.role]) location.replace(SCREEN[p.role]);
    }).catch(function () { fail("Sign in is not set up yet. Please ask Pixxel Nesst."); });

    $("#pw-toggle").addEventListener("click", function () {
      var show = $("#password").type === "password";
      $("#password").type = show ? "text" : "password";
      this.textContent = show ? "Hide" : "Show";
      this.setAttribute("aria-pressed", show);
    });

    // Pre-pick the role this device used last (or ?role=kitchen in the link).
    var last = new URLSearchParams(location.search).get("role");
    try { last = last || localStorage.getItem("mm_role"); } catch (e) {}
    var pre = last && document.querySelector('input[name=role][value="' + last + '"]');
    if (pre) pre.checked = true;

    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("#login-btn"); btn.disabled = true; $("#msg").classList.remove("is-shown");
      if (!client) { btn.disabled = false; return fail("Sign in is not set up yet. Please ask Pixxel Nesst."); }
      var picked = document.querySelector("input[name=role]:checked");
      if (!picked) { btn.disabled = false; return fail("Please choose your role first."); }
      client.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value }).then(function (r) {
        if (r.error) throw new Error(r.error.status === 400 || r.error.status === 422 ? "bad login" : "network");
        return profile();
      }).then(function (p) {
        if (!p) throw new Error("no role");
        if (p.role !== picked.value) throw new Error("wrong role:" + p.role);
        try { localStorage.setItem("mm_role", p.role); } catch (e) {}
        location.replace(SCREEN[p.role]);
      }).catch(function (err) {
        btn.disabled = false;
        client.auth.signOut();
        var m = String(err.message);
        fail(m === "no role" ? "This account has no role yet. Please ask the admin."
          : m === "network" || err instanceof TypeError ? "Could not reach the sign in service. Check your connection and try again. If it keeps happening, tell Pixxel Nesst."
          : m.indexOf("wrong role:") === 0 ? "This is a " + m.slice(11) + " account. Please choose " + m.slice(11) + " above."
          : "The email or password is not right. Please try again.");
      });
    });
  }

  // ---------------------------------------------------------------- Formatting
  var ICON = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    bookings: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
    enquiries: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    payments: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    orders: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  function icon(n, size) {
    size = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>";
  }
  var DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  function date(v) { var d = new Date(v); return isNaN(d) ? String(v) : DATE.format(d); }
  function phone(v) {
    var d = String(v).replace(/\D/g, "");
    return d.length === 12 && d.indexOf("91") === 0 ? "+91 " + d.slice(2, 7) + " " + d.slice(7) : String(v);
  }
  function rupee(v) { return "&#8377;" + Number(v).toLocaleString("en-IN"); }
  function badge(kind, text) { return '<span class="badge badge--' + kind + '">' + esc(text) + "</span>"; }

  var MAP = {
    pay: { paid: ["ok", "Paid"], not_completed: ["warn", "Not completed"] },
    call_st: { new: ["info", "New"], called: ["ok", "Called"], closed: ["muted", "Closed"] },
    progress: { new: ["info", "New"], contacted: ["ok", "Contacted"], sent_to_dietitian: ["muted", "Sent to dietitian"] },
    pstat: { created: ["muted", "Started"], paid: ["ok", "Paid"], failed: ["bad", "Failed"] }
  };
  var KIND = { contact: "Contact form", hospital: "Hospital enquiry", not_sure: "Not sure yet" };
  var TABLE_NAME = { cases: "a booking", payments: "a payment", enquiries: "an enquiry", staff: "a staff member", reports: "a report" };
  var COLUMN = { consult_payment: "Payment", call_status: "Call status", progress: "Progress", status: "Status", paid_at: "Paid time" };

  function what(r) {
    var verb = { insert: "Added", update: "Changed", delete: "Removed" }[r.action] || r.action;
    var out = verb + " " + (TABLE_NAME[r.table_name] || r.table_name);
    var c = r.changed;
    if (r.action === "update" && c && typeof c === "object") {
      var parts = Object.keys(c).map(function (k) {
        var name = COLUMN[k] || (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, " ");
        var v = c[k];
        return v && typeof v === "object" ? name + ": " + String(v.to).replace(/_/g, " ") : name;
      });
      if (parts.length) out += " (" + parts.join(", ") + ")";
    }
    return out;
  }

  function cell(t, v, row) {
    if (t === "who") return esc(row.actor_role ? ROLE_LABEL[row.actor_role] || row.actor_role : "System");
    if (t === "what") return esc(what(row));
    if (v == null || v === "") return '<span class="none">Not given</span>';
    if (MAP[t]) { var m = MAP[t][v] || ["muted", v]; return badge(m[0], m[1]); }
    switch (t) {
      case "code": return '<span class="code">' + esc(v) + "</span>";
      case "strong": return "<b>" + esc(v) + "</b>";
      case "phone": return esc(phone(v));
      case "tel": return /^\+?\d{10,13}$/.test(v) ? '<a href="tel:' + esc(v) + '">' + esc(phone(v)) + "</a>" : esc(v);
      case "call": return v === "video" ? "Video call" : "Phone call";
      case "rupee": return rupee(v);
      case "date": return esc(date(v));
      case "kind": return esc(KIND[v] || v);
      case "pkind": return v === "feed" ? "Feed" : "Consultation";
      case "clip": return '<span class="clip">' + esc(v) + "</span>";
      case "long": return '<span class="long">' + esc(v) + "</span>";
    }
    return esc(v);
  }

  // ---------------------------------------------------------------- Screen definitions
  var BOOKING_DETAIL = [["Case number", "case_no", "code"], ["Patient", "patient_name", "strong"], ["Age", "age"], ["Feeding route", "feeding_route"], ["Contact person", "contact_name"], ["Mobile", "mobile", "tel"], ["Call type", "call_type", "call"], ["Payment", "consult_payment", "pay"], ["Call status", "call_status", "call_st"], ["Amount", "consult_amount", "rupee"], ["Booked", "created_at", "date"], ["Paid", "paid_at", "date"], ["Health notes", "notes", "long"], ["Reports shared", "report_names", "long"]];
  var V = {
    // Dietitian
    dietitian_bookings: {
      title: "Bookings", sub: "Paid consultations. Open a booking to see the health details.", source: "dietitian_cases", titleKey: "patient_name",
      search: "Search by name, case number or mobile",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["Age", "age"], ["Feeding route", "feeding_route"], ["Mobile", "mobile", "phone"], ["Call", "call_type", "call"], ["Call status", "call_status", "call_st"], ["Paid", "paid_at", "date"]],
      filter: ["call_status", "All call statuses", [["new", "New"], ["called", "Called"], ["closed", "Closed"]]],
      detail: BOOKING_DETAIL, reports: true, empty: ["No paid bookings yet", "When a family pays for a consultation, the booking appears here."]
    },
    // Admin
    bookings: {
      title: "Bookings", sub: "Everyone who started a booking, paid or not.", source: "admin_cases", titleKey: "patient_name",
      search: "Search by name, case number or mobile",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["Age", "age"], ["Mobile", "mobile", "phone"], ["Call", "call_type", "call"], ["Amount", "consult_amount", "rupee"], ["Payment", "consult_payment", "pay"], ["Call status", "call_status", "call_st"], ["Booked", "created_at", "date"]],
      filter: ["consult_payment", "All payments", [["paid", "Paid"], ["not_completed", "Not completed"]]],
      detail: BOOKING_DETAIL.filter(function (d) { return ["notes", "report_names", "feeding_route", "contact_name"].indexOf(d[1]) < 0; }),
      empty: ["No bookings yet", "Bookings from the website appear here as soon as someone starts paying."]
    },
    enquiries: {
      title: "Enquiries", sub: "Contact form, hospital enquiries and 'Not sure yet' requests.", source: "admin_enquiries", titleKey: "name",
      search: "Search by name, organisation or mobile",
      cols: [["Reference", "ref", "code"], ["Type", "kind", "kind"], ["Name", "name", "strong"], ["Organisation", "org"], ["Mobile", "mobile", "phone"], ["Message", "message", "clip"], ["Progress", "progress", "progress"], ["Received", "created_at", "date"]],
      filter: ["progress", "All progress", [["new", "New"], ["contacted", "Contacted"], ["sent_to_dietitian", "Sent to dietitian"]]],
      detail: [["Reference", "ref", "code"], ["Type", "kind", "kind"], ["Name", "name", "strong"], ["Organisation", "org"], ["Organisation type", "org_type"], ["Mobile", "mobile", "tel"], ["Progress", "progress", "progress"], ["Received", "created_at", "date"], ["Message", "message", "long"]],
      empty: ["No enquiries yet", "Messages from the website forms appear here."]
    },
    payments: {
      title: "Payments", sub: "Every payment attempt and what happened to it.", source: "admin_payments", titleKey: "case_no",
      search: "Search by case number or patient",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["For", "kind", "pkind"], ["Amount", "amount", "rupee"], ["Status", "status", "pstat"], ["Started", "created_at", "date"], ["Paid", "paid_at", "date"]],
      filter: ["status", "All statuses", [["paid", "Paid"], ["created", "Started"], ["failed", "Failed"]]],
      empty: ["No payments yet", "Payments appear here once someone starts to pay."]
    },
    activity: {
      title: "Activity", sub: "A record of every change: who did it and when.", source: "admin_activity", orderBy: "at", titleKey: "action",
      search: "Search activity",
      cols: [["When", "at", "date"], ["Who", "actor_role", "who"], ["What changed", "action", "what"]],
      empty: ["No activity yet", "Changes to bookings, payments and enquiries are recorded here."]
    },
    kitchen_orders: {
      title: "Orders", sub: "Feed orders to prepare and pack."
    }
  };
  var MINI = {
    bookings: [["Patient", "patient_name", "strong"], ["Call", "call_type", "call"], ["Payment", "consult_payment", "pay"], ["Booked", "created_at", "date"]],
    enquiries: [["Name", "name", "strong"], ["Type", "kind", "kind"], ["Progress", "progress", "progress"], ["Received", "created_at", "date"]]
  };
  var NAV = {
    dietitian: [["bookings", "Bookings", "bookings", "dietitian_bookings"]],
    kitchen: [["orders", "Orders", "orders", "kitchen_orders"]],
    admin: [["overview", "Overview", "overview"], ["bookings", "Bookings", "bookings", "bookings"], ["enquiries", "Enquiries", "enquiries", "enquiries"], ["payments", "Payments", "payments", "payments"], ["activity", "Activity", "activity", "activity"]]
  };

  // ---------------------------------------------------------------- Data
  function load(view, orderBy) {
    return client.from(view).select("*").order(orderBy || "created_at", { ascending: false }).limit(500).then(function (r) {
      if (r.error) {
        if (/jwt|token/i.test(r.error.message || "")) location.replace("/app/");
        throw r.error;
      }
      return r.data || [];
    });
  }
  function rowsFor(v) {
    if (v.source !== "admin_payments") return load(v.source, v.orderBy);
    return Promise.all([load("admin_payments"), load("admin_cases")]).then(function (d) {
      var by = {};
      d[1].forEach(function (c) { by[c.id] = c; });
      d[0].forEach(function (p) { var c = by[p.case_id]; p.case_no = c && c.case_no; p.patient_name = c && c.patient_name; });
      return d[0];
    });
  }

  // ---------------------------------------------------------------- Pieces
  function tableHTML(cols, rows, clickable) {
    var h = '<div class="tablewrap"><table><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c[0]) + "</th>"; }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r, i) {
      h += "<tr" + (clickable ? ' class="is-click" tabindex="0" data-i="' + i + '"' : "") + ">" +
        cols.map(function (c) { return '<td data-label="' + esc(c[0]) + '">' + cell(c[2], r[c[1]], r) + "</td>"; }).join("") + "</tr>";
    });
    return h + "</tbody></table></div>";
  }
  function emptyHTML(ic, title, text) {
    return '<div class="empty"><span class="empty__icon">' + icon(ic, 24) + "</span><h2>" + esc(title) + "</h2><p>" + esc(text) + "</p></div>";
  }
  function skeleton() {
    return '<div class="skel" aria-busy="true" aria-label="Loading"><i></i><i></i><i></i><i></i><i></i></div>';
  }

  // ---------------------------------------------------------------- Role screens
  function screen(role) {
    var profileRow, view, token = 0, opener, reportToken = 0;
    var nav = NAV[role];

    function route() {
      var id = location.hash.slice(1);
      var n = nav.filter(function (x) { return x[0] === id; })[0] || nav[0];
      document.querySelectorAll(".nav a").forEach(function (a) {
        if (a.getAttribute("href") === "#" + n[0]) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      closeDrawer();
      render(n);
    }

    function render(n) {
      var my = ++token, content = $("#content"), v = V[n[3]] || {};
      $("#title").textContent = n[0] === "overview" ? "Overview" : v.title;
      $("#sub").textContent = n[0] === "overview" ? "What is happening across MedMeal right now." : v.sub;
      document.title = $("#title").textContent + " | MedMeal staff";
      if (role === "kitchen") { content.innerHTML = kitchenHTML(); return; }
      content.innerHTML = skeleton();
      var job = n[0] === "overview" ? overview() : list(v);
      job.catch(function () {
        if (my !== token) return;
        content.innerHTML = emptyHTML("refresh", "Could not load this page", "Please check your connection and try again.") + '<p class="center"><button class="btn btn--quiet" id="retry" type="button">Try again</button></p>';
        $("#retry").addEventListener("click", route);
      });
      function guard(fn) { return function (x) { if (my === token) return fn(x); }; }
      function list(v) {
        return rowsFor(v).then(guard(function (rows) {
          var q = "", f = "";
          content.innerHTML =
            '<div class="toolbar"><label class="search">' + icon("search", 16) + '<input id="q" type="search" placeholder="' + esc(v.search) + '" aria-label="' + esc(v.search) + '"></label>' +
            (v.filter ? '<select id="f" aria-label="' + esc(v.filter[1]) + '"><option value="">' + esc(v.filter[1]) + "</option>" + v.filter[2].map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("") + "</select>" : "") +
            '<span class="count" id="count" aria-live="polite"></span></div><div id="tbl"></div>';
          var shown = rows;
          function draw() {
            shown = rows.filter(function (r) {
              if (f && r[v.filter[0]] !== f) return false;
              return !q || cols(r).indexOf(q) >= 0;
            });
            $("#count").textContent = shown.length === rows.length ? rows.length + (rows.length === 1 ? " record" : " records") : shown.length + " of " + rows.length;
            $("#tbl").innerHTML = !rows.length ? emptyHTML(n[2], v.empty[0], v.empty[1])
              : !shown.length ? emptyHTML("search", "Nothing matches", "Try a different search or filter.")
              : tableHTML(v.cols, shown, !!v.detail);
          }
          function cols(r) { return v.cols.map(function (c) { return String(r[c[1]] == null ? "" : r[c[1]]); }).concat(r.mobile ? [String(r.mobile).slice(-10)] : []).join(" ").toLowerCase(); }
          $("#q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
          if (v.filter) $("#f").addEventListener("change", function (e) { f = e.target.value; draw(); });
          $("#tbl").addEventListener("click", function (e) { var tr = e.target.closest("tr[data-i]"); if (tr && !e.target.closest("a")) openDrawer(v, shown[+tr.dataset.i], tr); });
          $("#tbl").addEventListener("keydown", function (e) { var tr = e.target.closest("tr[data-i]"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDrawer(v, shown[+tr.dataset.i], tr); } });
          draw();
        }));
      }
      function overview() {
        return Promise.all([load("admin_cases"), load("admin_enquiries"), load("admin_payments")]).then(guard(function (d) {
          var cases = d[0], enq = d[1], pays = d[2];
          var paid = cases.filter(function (c) { return c.consult_payment === "paid"; }).length;
          var open = cases.length - paid;
          var fresh = enq.filter(function (e) { return e.progress === "new"; }).length;
          var money = pays.reduce(function (s, p) { return s + (p.status === "paid" ? p.amount : 0); }, 0);
          function stat(label, value, hint) { return '<div class="stat"><span>' + label + "</span><b>" + value + "</b><small>" + hint + "</small></div>"; }
          function block(title, id, rows, cols, emptyText) {
            return '<section class="block"><div class="block__head"><h2>' + title + '</h2><a href="#' + id + '">View all</a></div>' +
              (rows.length ? tableHTML(cols, rows.slice(0, 5), false) : '<p class="none pad">' + emptyText + "</p>") + "</section>";
          }
          content.innerHTML =
            '<div class="stats">' + stat("Paid bookings", paid, "Consultations paid for") + stat("Not completed", open, "Started but not paid") + stat("New enquiries", fresh, "Waiting for a first reply") + stat("Collected", rupee(money), "From paid payments") + "</div>" +
            '<div class="two">' + block("Latest bookings", "bookings", cases, MINI.bookings, "No bookings yet.") + block("Latest enquiries", "enquiries", enq, MINI.enquiries, "No enquiries yet.") + "</div>";
        }));
      }
    }

    function kitchenHTML() {
      return '<div class="empty">' + '<span class="empty__icon">' + icon("orders", 24) + "</span><h2>No feed orders yet</h2>" +
        "<p>When a dietitian approves a feed plan and the family pays, the order appears here with the ingredients and the sticker details.</p>" +
        '<p class="steps"><span>Preparing</span><span>Prepared</span><span>Packed</span><span>Ready to dispatch</span></p></div>';
    }

    // Detail panel
    function openDrawer(v, row, from) {
      opener = from;
      var d = $("#drawer");
      $("#drawer-title").textContent = row[v.titleKey] || "Details";
      $("#drawer-body").innerHTML = '<dl class="kv">' + v.detail.map(function (x) {
        return "<div><dt>" + esc(x[0]) + "</dt><dd>" + cell(x[2], row[x[1]], row) + "</dd></div>";
      }).join("") + "</dl>";
      if (v.reports) showReports(row);
      $("#scrim").hidden = false; d.hidden = false;
      $("#drawer-close").focus();
    }
    // The patient's uploaded reports. Each opens through a short-lived private link made on click.
    function showReports(row) {
      var body = $("#drawer-body"), mine = ++reportToken;
      body.insertAdjacentHTML("beforeend", '<section class="reports"><h3>Reports</h3><div id="rep-list"><p class="none">Loading</p></div></section>');
      client.from("dietitian_reports").select("*").eq("case_id", row.id).order("created_at", { ascending: true }).then(function (r) {
        if (mine !== reportToken) return;
        var list = $("#rep-list");
        if (r.error) { list.innerHTML = '<p class="none">Could not load the reports.</p>'; return; }
        if (!r.data.length) { list.innerHTML = '<p class="none">No reports uploaded.</p>'; return; }
        list.innerHTML = "<ul>" + r.data.map(function (f, i) {
          return '<li><span class="fn">' + esc(f.file_name) + '</span><span class="fs">' + fileSize(f.size_bytes) + '</span><button class="btn btn--quiet" type="button" data-i="' + i + '">Open</button></li>';
        }).join("") + "</ul>";
        list.onclick = function (e) {
          var b = e.target.closest("button[data-i]"); if (!b) return;
          var f = r.data[+b.dataset.i], w = window.open("", "_blank"); // opened first so the browser allows it
          b.disabled = true;
          client.storage.from("reports").createSignedUrl(f.path, 120).then(function (x) {
            b.disabled = false;
            if (x.data && x.data.signedUrl && w) w.location = x.data.signedUrl;
            else { if (w) w.close(); b.textContent = "Not found"; }
          });
        };
      });
    }
    function fileSize(b) { return b == null ? "" : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1) + " MB"; }
    function closeDrawer() {
      if ($("#drawer").hidden) return;
      $("#drawer").hidden = true; $("#scrim").hidden = true;
      if (opener && document.contains(opener)) opener.focus();
    }

    setup().then(function () {
      return client.auth.getSession().then(function (s) { return s.data.session ? profile() : null; });
    }).then(function (p) {
      if (!p) return location.replace("/app/");
      if (p.role !== role) return location.replace(SCREEN[p.role]);
      profileRow = p;
      $("#app").innerHTML =
        '<div class="shell"><aside class="side"><div class="side__top"><img src="/favicon-32.png" width="32" height="32" alt=""><span class="brand">MedMeal</span></div>' +
        '<nav class="nav" aria-label="Main">' + nav.map(function (n) { return '<a href="#' + n[0] + '">' + icon(n[2]) + "<span>" + n[1] + "</span></a>"; }).join("") + "</nav>" +
        '<div class="side__user"><span class="avatar" aria-hidden="true">' + esc((p.name || "?").charAt(0).toUpperCase()) + '</span><div class="who"><b>' + esc(p.name) + "</b><span>" + ROLE_LABEL[role] + "</span></div>" +
        '<button class="btn btn--quiet" id="signout" type="button">Sign out</button></div></aside>' +
        '<main class="main"><header class="head"><div><h1 id="title"></h1><p id="sub"></p></div>' +
        '<button class="btn btn--quiet btn--icon" id="refresh" type="button" aria-label="Refresh">' + icon("refresh", 16) + "<span>Refresh</span></button></header><div id=\"content\"></div></main></div>" +
        '<div class="scrim" id="scrim" hidden></div><aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>' +
        '<header><h2 id="drawer-title"></h2><button class="iconbtn" id="drawer-close" type="button" aria-label="Close">' + icon("close") + '</button></header><div id="drawer-body"></div></aside>';
      document.body.hidden = false;
      $("#signout").addEventListener("click", function () { client.auth.signOut().then(function () { location.replace("/app/"); }); });
      $("#refresh").addEventListener("click", route);
      $("#scrim").addEventListener("click", closeDrawer);
      $("#drawer-close").addEventListener("click", closeDrawer);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
      window.addEventListener("hashchange", route);
      route();
    }).catch(function () { location.replace("/app/"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var role = document.body.getAttribute("data-role");
    if (role) screen(role); else login();
  });
})();
