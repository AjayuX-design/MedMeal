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
  // A write to our own server, with the signed-in person's token. The server checks who it is.
  function post(path, body) {
    return client.auth.getSession().then(function (r) {
      return fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + r.data.session.access_token }, body: JSON.stringify(body) });
    });
  }
  // Every staff action goes to one place: POST /api/staff with the action name.
  function act(action, body) { return post("/api/staff", Object.assign({ action: action }, body)); }
  // Shows the message in the always-present alert box and moves focus to the thing to fix (or to the message).
  function fail(text, el) {
    var m = $("#msg"); if (!m) return;
    m.textContent = text; m.classList.add("is-shown");
    [$("#email"), $("#password")].forEach(function (i) { i.removeAttribute("aria-invalid"); });
    if (el && el.setAttribute && el.tagName === "INPUT" && el.type !== "radio") el.setAttribute("aria-invalid", "true");
    (el || m).focus();
  }
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
      this.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    // Pre-pick the role this device used last (or ?role=kitchen in the link).
    var last = new URLSearchParams(location.search).get("role");
    try { last = last || localStorage.getItem("mm_role"); } catch (e) {}
    var pre = last && document.querySelector('input[name=role][value="' + last + '"]');
    if (pre) pre.checked = true;

    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("#login-btn"), msgBox = $("#msg"); msgBox.classList.remove("is-shown"); msgBox.textContent = "";
      function busy(on) { btn.disabled = on; btn.textContent = on ? "Signing in..." : "Sign in"; btn.setAttribute("aria-busy", on); }
      if (!client) return fail("Sign in is not set up yet. Please ask Pixxel Nesst.");
      var picked = document.querySelector("input[name=role]:checked");
      if (!picked) return fail("Please choose your role first.", document.querySelector("input[name=role]"));
      busy(true);
      client.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value }).then(function (r) {
        if (r.error) throw new Error(r.error.status === 400 || r.error.status === 422 ? "bad login" : "network");
        return profile();
      }).then(function (p) {
        if (!p) throw new Error("no role");
        if (p.role !== picked.value) throw new Error("wrong role:" + p.role);
        try { localStorage.setItem("mm_role", p.role); } catch (e) {}
        location.replace(SCREEN[p.role]);
      }).catch(function (err) {
        busy(false);
        client.auth.signOut();
        var m = String(err.message);
        var wrong = m.indexOf("wrong role:") === 0, bad = !(m === "no role" || m === "network" || err instanceof TypeError || wrong);
        fail(m === "no role" ? "This account has no role yet. Please ask the admin."
          : m === "network" || err instanceof TypeError ? "Could not reach the sign in service. Check your connection and try again. If it keeps happening, tell Pixxel Nesst."
          : wrong ? "This is a " + m.slice(11) + " account. Please choose " + m.slice(11) + " above."
          : "The email or password is not right. Please try again.",
          wrong ? document.querySelector("input[name=role]:checked") : bad ? $("#password") : null);
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
    chevron: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'
  };
  function icon(n, size) {
    size = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>";
  }
  function note(type, text) { return '<p class="alert alert--' + type + '" role="' + (type === "error" ? "alert" : "status") + '">' + icon(type === "success" ? "check" : "alert", 16) + "<span>" + esc(text) + "</span></p>"; }
  var DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  function date(v) { var d = new Date(v); return isNaN(d) ? String(v) : DATE.format(d); }
  function phone(v) {
    var d = String(v).replace(/\D/g, "");
    return d.length === 12 && d.indexOf("91") === 0 ? "+91 " + d.slice(2, 7) + " " + d.slice(7) : String(v);
  }
  function rupee(v) { return "&#8377;" + Number(v).toLocaleString("en-IN"); }
  function badge(kind, text) { return '<span class="badge badge--' + kind + '"><i></i>' + esc(text) + "</span>"; }
  var DATE_LONG = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  function ago(v) {
    var m = Math.max(0, Math.round((Date.now() - new Date(v)) / 6e4));
    return m < 2 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + (m < 2880 ? " day ago" : " days ago");
  }

  var MAP = {
    pay: { paid: ["ok", "Paid"], not_completed: ["warn", "Not completed"] },
    call_st: { new: ["info", "New"], called: ["ok", "Called"], closed: ["muted", "Closed"] },
    progress: { new: ["info", "New"], contacted: ["ok", "Contacted"], sent_to_dietitian: ["muted", "Sent to dietitian"] },
    pstat: { created: ["muted", "Started"], paid: ["ok", "Paid"], failed: ["bad", "Failed"] },
    astat: { none: ["warn", "Not received"], submitted: ["info", "To confirm"], confirmed: ["ok", "Confirmed"] },
    paystat: { unpaid: ["warn", "Not paid"], online: ["ok", "Paid online"], cod: ["info", "Cash on delivery"], cash: ["ok", "Cash received"] },
    ostat: { new: ["info", "Waiting"], preparing: ["warn", "Preparing"], prepared: ["info", "Prepared"], packed: ["ok", "Packed"], delivered: ["muted", "Delivered"] }
  };
  var KIND = { contact: "Contact form", hospital: "Hospital enquiry", not_sure: "Not sure yet" };
  var TABLE_NAME = { cases: "a booking", payments: "a payment", enquiries: "an enquiry", staff: "a staff member", reports: "a report", orders: "an order", delivery_addresses: "a delivery address" };
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
  var BOOKING_DETAIL = [
    ["#", "Patient"], ["Name", "patient_name", "strong"], ["Age", "age"], ["Feeding route", "feeding_route"],
    ["#", "Contact"], ["Contact person", "contact_name"], ["Mobile", "mobile", "tel"],
    ["#", "Consultation"], ["Amount", "consult_amount", "rupee"], ["Booked", "created_at", "date"], ["Paid", "paid_at", "date"],
    ["#", "Health"], ["Health notes", "notes", "long"], ["Reports shared", "report_names", "long"]
  ];
  var BOOKING_HERO = { badges: [["consult_payment", "pay"], ["call_status", "call_st"]], time: "slot_at", type: "call_type" };
  var ORDER_DETAIL = [
    ["#", "Order"], ["Order number", "order_no", "code"], ["Case", "case_no", "code"], ["Quantity", "quantity"], ["Created", "created_at", "date"],
    ["#", "Payment"], ["Payment", "pay_view", "paystat"], ["Amount", "amount", "rupee"], ["Delivered", "delivered_at", "date"],
    ["#", "Delivery address"], ["Deliver to", "addr_name", "strong"], ["Mobile", "addr_mobile", "tel"], ["Address", "addr_text", "long"], ["Delivery notes", "addr_notes", "long"]
  ];
  var V = {
    // Dietitian
    dietitian_bookings: {
      title: "Bookings", sub: "Paid consultations. Open a booking to see the health details.", source: "dietitian_cases", titleKey: "patient_name",
      search: "Search name, case or mobile",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["Age", "age"], ["Feeding route", "feeding_route"], ["Mobile", "mobile", "phone"], ["Call", "call_type", "call"], ["Call time", "slot_at", "date"], ["Call status", "call_status", "call_st"]],
      filter: ["call_status", "All statuses", [["new", "New"], ["called", "Called"], ["closed", "Closed"]]],
      group: callGroup, day: true, mobile: ["patient_name", "slot_at", "call_type", "call_status"],
      detail: BOOKING_DETAIL, hero: BOOKING_HERO, subKey: "case_no", reports: true, callStatus: true, empty: ["No paid bookings yet", "When a family pays for a consultation, the booking appears here."]
    },
    // Admin
    bookings: {
      title: "Bookings", sub: "Everyone who started a booking, paid or not.", source: "admin_cases", titleKey: "patient_name",
      search: "Search name, case or mobile",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["Age", "age"], ["Mobile", "mobile", "phone"], ["Call", "call_type", "call"], ["Call time", "slot_at", "date"], ["Amount", "consult_amount", "rupee"], ["Payment", "consult_payment", "pay"], ["Call status", "call_status", "call_st"]],
      filter: ["consult_payment", "All payments", [["paid", "Paid"], ["not_completed", "Not completed"]]],
      mobile: ["patient_name", "slot_at", "consult_payment", "call_status"],
      detail: BOOKING_DETAIL.filter(function (d) { return ["notes", "report_names", "feeding_route", "contact_name"].indexOf(d[1]) < 0 && d[1] !== "Health"; }).filter(function (d, i, all) { return d[0] !== "#" || (all[i + 1] && all[i + 1][0] !== "#"); }),
      hero: BOOKING_HERO, subKey: "case_no",
      empty: ["No bookings yet", "Bookings from the website appear here as soon as someone starts paying."]
    },
    enquiries: {
      title: "Enquiries", sub: "Contact form, hospital enquiries and 'Not sure yet' requests.", source: "admin_enquiries", titleKey: "name",
      search: "Search name, org or mobile",
      cols: [["Reference", "ref", "code"], ["Type", "kind", "kind"], ["Name", "name", "strong"], ["Organisation", "org"], ["Mobile", "mobile", "phone"], ["Message", "message", "clip"], ["Progress", "progress", "progress"], ["Received", "created_at", "date"]],
      filter: ["progress", "All progress", [["new", "New"], ["contacted", "Contacted"], ["sent_to_dietitian", "Sent to dietitian"]]],
      mobile: ["name", "kind", "progress", "created_at"],
      detail: [["Name", "name", "strong"], ["Organisation", "org"], ["Organisation type", "org_type"], ["Mobile", "mobile", "tel"], ["Received", "created_at", "date"], ["Message", "message", "long"]],
      hero: { badges: [["kind", "kind"], ["progress", "progress"]] }, subKey: "ref",
      empty: ["No enquiries yet", "Messages from the website forms appear here."]
    },
    payments: {
      title: "Payments", sub: "Every payment attempt and what happened to it.", source: "admin_payments", titleKey: "case_no",
      search: "Search case or patient",
      cols: [["Case", "case_no", "code"], ["Patient", "patient_name", "strong"], ["For", "kind", "pkind"], ["Amount", "amount", "rupee"], ["Status", "status", "pstat"], ["Started", "created_at", "date"], ["Paid", "paid_at", "date"]],
      filter: ["status", "All statuses", [["paid", "Paid"], ["created", "Started"], ["failed", "Failed"]]],
      mobile: ["patient_name", "amount", "status", "created_at"],
      empty: ["No payments yet", "Payments appear here once someone starts to pay."]
    },
    activity: {
      title: "Activity", sub: "A record of every change: who did it and when.", source: "admin_activity", orderBy: "at", titleKey: "action",
      search: "Search activity",
      cols: [["When", "at", "date"], ["Who", "actor_role", "who"], ["What changed", "action", "what"]],
      empty: ["No activity yet", "Changes to bookings, payments and enquiries are recorded here."]
    },
    dietitian_orders: {
      title: "Orders", sub: "Feed orders. Confirm the delivery address once the family has sent it.", source: "dietitian_orders", titleKey: "patient_name", subKey: "order_no",
      search: "Search order, case or patient",
      cols: [["Order", "order_no", "code"], ["Patient", "patient_name", "strong"], ["Status", "status", "ostat"], ["Payment", "pay_view", "paystat"], ["Address", "addr_status", "astat"], ["Updated", "updated_at", "date"]],
      filter: ["addr_status", "All addresses", [["none", "Not received"], ["submitted", "To confirm"], ["confirmed", "Confirmed"]]],
      mobile: ["patient_name", "status", "pay_view", "addr_status"],
      detail: ORDER_DETAIL, hero: { badges: [["status", "ostat"], ["pay_view", "paystat"], ["addr_status", "astat"]] }, addressTools: true,
      empty: ["No orders yet", "Feed orders appear here once a family has paid for a feed plan."]
    },
    orders: {
      title: "Orders", sub: "Where every feed order is, and its delivery address.", source: "admin_orders", titleKey: "patient_name", subKey: "order_no",
      detail: ORDER_DETAIL, hero: { badges: [["status", "ostat"], ["pay_view", "paystat"], ["addr_status", "astat"]] }, addressTools: true, orderTools: true,
      search: "Search order, case or patient",
      cols: [["Order", "order_no", "code"], ["Patient", "patient_name", "strong"], ["Status", "status", "ostat"], ["Payment", "pay_view", "paystat"], ["Address", "addr_status", "astat"], ["Updated", "updated_at", "date"]],
      filter: ["status", "All statuses", [["new", "Waiting"], ["preparing", "Preparing"], ["prepared", "Prepared"], ["packed", "Packed"], ["delivered", "Delivered"]]],
      mobile: ["patient_name", "status", "pay_view", "addr_status"],
      empty: ["No orders yet", "Feed orders appear here once a family has paid for a feed plan."]
    },
    kitchen_orders: {
      title: "Orders", sub: "Feed orders to prepare and pack."
    }
  };
  var MINI = {
    bookings: [["Patient", "patient_name", "strong"], ["Payment", "consult_payment", "pay"], ["Call time", "slot_at", "date"]],
    enquiries: [["Name", "name", "strong"], ["Progress", "progress", "progress"], ["Received", "created_at", "date"]]
  };
  // Links from "Needs attention" open a list with one of these filters already on: #orders?show=cod
  var PRESETS = {
    cod: { view: "orders", label: "Orders waiting for a cash on delivery decision", test: function (r) { return r.pay_view === "unpaid"; } },
    address: { view: "orders", label: "Addresses to confirm", test: function (r) { return r.addr_status === "submitted"; } },
    unpaid: { view: "bookings", label: "Bookings not paid", test: function (r) { return r.consult_payment === "not_completed"; } },
    fresh: { view: "enquiries", label: "New enquiries", test: function (r) { return r.progress === "new"; } }
  };
  var NAV = {
    dietitian: [["bookings", "Bookings", "bookings", "dietitian_bookings"], ["orders", "Orders", "orders", "dietitian_orders"]],
    kitchen: [["orders", "Orders", "orders", "kitchen_orders"]],
    admin: [["overview", "Overview", "overview"], ["bookings", "Bookings", "bookings", "bookings"], ["orders", "Orders", "orders", "orders"], ["enquiries", "Enquiries", "enquiries", "enquiries"], ["payments", "Payments", "payments", "payments"], ["activity", "Activity", "activity", "activity"]]
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
  function payView(r) { return r.cash_collected_at ? "cash" : r.pay_status === "cod" ? "cod" : r.pay_status === "paid" ? "online" : "unpaid"; }
  function withAddress(rows) {
    rows.forEach(function (r) { r.pay_view = payView(r); r.addr_text = r.addr_line1 ? [r.addr_line1, r.addr_area, r.addr_city + " " + r.addr_pincode, r.addr_landmark ? "Landmark: " + r.addr_landmark : ""].filter(Boolean).join("\n") : null; });
    return rows;
  }
  function rowsFor(v) {
    if (/_orders$/.test(v.source)) return load(v.source, v.orderBy).then(withAddress);
    if (v.source !== "admin_payments") return load(v.source, v.orderBy);
    return Promise.all([load("admin_payments"), load("admin_cases")]).then(function (d) {
      var by = {};
      d[1].forEach(function (c) { by[c.id] = c; });
      d[0].forEach(function (p) { var c = by[p.case_id]; p.case_no = c && c.case_no; p.patient_name = c && c.patient_name; });
      return d[0];
    });
  }

  // ---------------------------------------------------------------- Pieces
  // Call-time groups for the dietitian list, in the order they are shown.
  var GROUPS = ["Today", "Tomorrow", "Later", "Earlier", "No call time"];
  function callGroup(r) {
    var d = r.slot_at && new Date(r.slot_at);
    if (!d || isNaN(d)) return 4;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var n = Math.round((new Date(d).setHours(0, 0, 0, 0) - t) / 864e5);
    return n === 0 ? 0 : n === 1 ? 1 : n > 1 ? 2 : 3;
  }
  // x.mobile: the only columns kept in the phone cards. x.group: a function that puts rows under headings.
  function tableHTML(cols, rows, clickable, titleKey, x) {
    x = x || {};
    var counts = {}, last = -1, open = false, span = cols.length + (clickable ? 1 : 0);
    if (x.group) rows.forEach(function (r) { var g = x.group(r); counts[g] = (counts[g] || 0) + 1; });
    var h = '<div class="tablewrap"><table><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c[0]) + "</th>"; }).join("") +
      (clickable ? '<th scope="col" class="go"><span class="sr">Details</span></th>' : "") + "</tr></thead>";
    if (!x.group) { h += "<tbody>"; open = true; }
    rows.forEach(function (r, i) {
      if (x.group) {
        var g = x.group(r);
        if (g !== last) { last = g; h += (open ? "</tbody>" : "") + '<tbody><tr class="grp"><th scope="rowgroup" colspan="' + span + '">' + GROUPS[g] + " <span>" + counts[g] + "</span></th></tr>"; open = true; }
      }
      // The row is clickable with a mouse or finger; keyboard and screen readers use the real Details button.
      h += "<tr" + (clickable ? ' class="is-click" data-i="' + i + '"' : "") + ">" +
        cols.map(function (c) { return "<td" + (x.mobile && x.mobile.indexOf(c[1]) < 0 ? ' class="m-hide"' : "") + ' data-label="' + esc(c[0]) + '">' + cell(c[2], r[c[1]], r) + "</td>"; }).join("") +
        (clickable ? '<td class="go"><button class="rowbtn" type="button" aria-haspopup="dialog" aria-label="Open details for ' + esc(r[titleKey] || "this row") + '"><span class="go__t">Details</span> ' + icon("chevron", 16) + "</button></td>" : "") + "</tr>";
    });
    return h + (open ? "</tbody>" : "") + "</table></div>";
  }
  // A table that scrolls sideways with nothing inside to tab to gets its own tab stop, so a keyboard can scroll it.
  function scrollable() {
    document.querySelectorAll(".tablewrap").forEach(function (w) {
      var on = w.scrollWidth > w.clientWidth + 1 && !w.querySelector("button, a[href]");
      if (on) { w.setAttribute("tabindex", "0"); w.setAttribute("role", "region"); w.setAttribute("aria-label", ($("#title").textContent || "Data") + " table, scrolls sideways"); }
      else { w.removeAttribute("tabindex"); w.removeAttribute("role"); w.removeAttribute("aria-label"); }
    });
  }
  function emptyHTML(ic, title, text) {
    return '<div class="empty"><span class="empty__icon">' + icon(ic, 24) + "</span><h2>" + esc(title) + "</h2><p>" + esc(text) + "</p></div>";
  }
  function skeleton() {
    return '<div class="skel" role="status" aria-busy="true"><span class="sr">Loading</span><i></i><i></i><i></i><i></i><i></i></div>';
  }

  // ---------------------------------------------------------------- Role screens
  function screen(role) {
    var profileRow, view, token = 0, opener, reportToken = 0, silent = null, preset = null;
    var TIME = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
    function stamp() { var u = $("#updated"); if (u) u.textContent = "Updated " + TIME.format(new Date()).toLowerCase(); }
    var nav = NAV[role];

    function route() {
      var parts = location.hash.slice(1).split("?"), id = parts[0];
      var n = nav.filter(function (x) { return x[0] === id; })[0] || nav[0];
      var pr = PRESETS[new URLSearchParams(parts[1] || "").get("show")];
      preset = pr && V[n[3]] && pr.view === n[3] ? pr : null;
      document.querySelectorAll(".nav a").forEach(function (a) {
        if (a.getAttribute("href") === "#" + n[0]) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      closeDrawer();
      render(n);
    }

    function render(n) {
      var my = ++token, content = $("#content"), v = V[n[3]] || {};
      silent = null;
      $("#title").textContent = n[0] === "overview" ? "Overview" : v.title;
      $("#sub").textContent = n[0] === "overview" ? "What is happening across MedMeal right now." : v.sub;
      document.title = $("#title").textContent + " | MedMeal staff";
      if (role === "kitchen") {
        content.innerHTML = skeleton();
        load("kitchen_orders").then(function (rows) { if (my === token) { orders = rows; drawBoard(); stamp(); } }).catch(function () {
          if (my !== token) return;
          content.innerHTML = emptyHTML("refresh", "Could not load the orders", "Please check your connection and try again.") + '<p class="center"><button class="btn btn--quiet" id="retry" type="button">Try again</button></p>';
          $("#retry").addEventListener("click", route);
        });
        return;
      }
      content.innerHTML = skeleton();
      var job = n[0] === "overview" ? overview() : list(v);
      if (n[0] === "overview") silent = overview;
      job.catch(function () {
        if (my !== token) return;
        content.innerHTML = emptyHTML("refresh", "Could not load this page", "Please check your connection and try again.") + '<p class="center"><button class="btn btn--quiet" id="retry" type="button">Try again</button></p>';
        $("#retry").addEventListener("click", route);
      });
      function guard(fn) { return function (x) { if (my === token) return fn(x); }; }
      function list(v) {
        return rowsFor(v).then(guard(function (rows) {
          var q = "", f = "", day = "", pre = preset;
          content.innerHTML = (pre ? '<p class="chip"><span>Showing: ' + esc(pre.label) + '</span><a href="#' + n[0] + '">Show all</a></p>' : "") +
            '<div class="toolbar"><label class="search">' + icon("search", 16) + '<input id="q" type="search" placeholder="' + esc(v.search) + '" aria-label="' + esc(v.search) + '"></label>' +
            (v.filter ? '<select id="f" aria-label="' + esc(v.filter[1]) + '"><option value="">' + esc(v.filter[1]) + "</option>" + v.filter[2].map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("") + "</select>" : "") +
            (v.day ? '<select id="d" aria-label="Call day"><option value="">All days</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select>' : "") +
            '<span class="count" id="count" aria-live="polite"></span></div><div id="tbl"></div>';
          var shown = rows;
          function draw() {
            shown = rows.filter(function (r) {
              if (pre && !pre.test(r)) return false;
              if (f && r[v.filter[0]] !== f) return false;
              if (day && callGroup(r) !== (day === "today" ? 0 : 1)) return false;
              return !q || cols(r).indexOf(q) >= 0;
            });
            if (v.group) shown.sort(function (a, b) { var ga = v.group(a), gb = v.group(b); return ga - gb || (ga === 3 ? new Date(b.slot_at) - new Date(a.slot_at) : new Date(a.slot_at) - new Date(b.slot_at)) || 0; });
            $("#count").textContent = shown.length === rows.length ? rows.length + (rows.length === 1 ? " record" : " records") : shown.length + " of " + rows.length;
            $("#tbl").innerHTML = !rows.length ? emptyHTML(n[2], v.empty[0], v.empty[1])
              : !shown.length ? (pre && !q && !f && !day ? emptyHTML("check", "All clear", "Nothing needs attention here right now.") : day && !q && !f ? emptyHTML("check", "No calls " + day, "Nothing is booked for " + day + ".") : emptyHTML("search", "Nothing matches", "Try a different search or filter."))
              : tableHTML(v.cols, shown, !!v.detail, v.titleKey, { mobile: v.mobile, group: v.group });
            scrollable();
          }
          function cols(r) { return v.cols.map(function (c) { return String(r[c[1]] == null ? "" : r[c[1]]); }).concat(r.mobile ? [String(r.mobile).slice(-10)] : []).join(" ").toLowerCase(); }
          $("#q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
          if (v.filter) $("#f").addEventListener("change", function (e) { f = e.target.value; draw(); });
          if (v.day) $("#d").addEventListener("change", function (e) { day = e.target.value; draw(); });
          silent = function () { return rowsFor(v).then(guard(function (fresh) { rows = fresh; draw(); stamp(); })); }; // quiet refresh: keeps the search and filters
          $("#tbl").addEventListener("click", function (e) { var tr = e.target.closest("tr[data-i]"); if (tr && !e.target.closest("a")) openDrawer(v, shown[+tr.dataset.i], tr.querySelector(".rowbtn") || tr, draw); });
          draw(); stamp();
        }));
      }
      function overview() {
        return Promise.all([load("admin_cases"), load("admin_enquiries"), load("admin_payments"), load("admin_orders")]).then(guard(function (d) {
          var ords = withAddress(d[3]);
          var cases = d[0], enq = d[1], pays = d[2], cash = d[3].reduce(function (t, o) { return t + (o.pay_status === "cod" && o.status !== "delivered" ? o.amount || 0 : 0); }, 0);
          var paid = cases.filter(function (c) { return c.consult_payment === "paid"; }).length;
          var open = cases.length - paid;
          var fresh = enq.filter(function (e) { return e.progress === "new"; }).length;
          var money = pays.reduce(function (s, p) { return s + (p.status === "paid" ? p.amount : 0); }, 0);
          function stat(label, value, hint, ic, tone) { return '<div class="stat"><span class="stat__ic stat__ic--' + (tone || "ok") + '">' + icon(ic) + "</span><span>" + label + "</span><b>" + value + "</b><small>" + hint + "</small></div>"; }
          function block(title, id, rows, cols, emptyText) {
            return '<section class="block"><div class="block__head"><h2>' + title + '</h2><a href="#' + id + '">View all</a></div>' +
              (rows.length ? tableHTML(cols, rows.slice(0, 5), false) : '<p class="none pad">' + emptyText + "</p>") + "</section>";
          }
          function need(count, label, show, view) {
            return '<a class="attn__item' + (count ? "" : " is-zero") + '" href="#' + view + "?show=" + show + '"><b>' + count + "</b><span>" + label + "</span></a>";
          }
          var attn = '<section class="attn" aria-labelledby="attn-h"><h2 id="attn-h">Needs attention</h2><div class="attn__row">' +
            need(ords.filter(PRESETS.cod.test).length, "Cash on delivery to decide", "cod", "orders") +
            need(ords.filter(PRESETS.address.test).length, "Addresses to confirm", "address", "orders") +
            need(cases.filter(PRESETS.unpaid.test).length, "Bookings not paid", "unpaid", "bookings") +
            need(enq.filter(PRESETS.fresh.test).length, "New enquiries", "fresh", "enquiries") + "</div></section>";
          content.innerHTML = attn +
            '<div class="stats">' + stat("Paid bookings", paid, "Consultations paid for", "check") + stat("Not completed", open, "Started but not paid", "alert", "warn") + stat("New enquiries", fresh, "Waiting for a first reply", "enquiries", "info") + stat("Collected", rupee(money), "From paid payments", "payments") + stat("Cash to collect", rupee(cash), "Cash on delivery, not yet delivered", "payments", "warn") + "</div>" +
            '<div class="two">' + block("Latest bookings", "bookings", cases, MINI.bookings, "No bookings yet.") + block("Latest enquiries", "enquiries", enq, MINI.enquiries, "No enquiries yet.") + "</div>";
          scrollable(); stamp();
        }));
      }
    }

    // Kitchen board: one column per step. Each card shows what to cook, what to avoid, and one big button for the next step.
    var STEPS = [["new", "New"], ["preparing", "Preparing"], ["prepared", "Prepared"], ["packed", "Packed, ready to dispatch"]];
    var NEXT = { new: ["preparing", "Start preparing"], preparing: ["prepared", "Mark prepared"], prepared: ["packed", "Mark packed"] };
    var BACK = { preparing: "new", prepared: "preparing", packed: "prepared" };
    var orders = [], busy = false;
    function orderCard(o) {
      var items = (Array.isArray(o.items) ? o.items : []).map(function (i) {
        return "<li><span>" + esc(i.name) + "</span><span>" + esc(i.qty) + " " + esc(i.unit || "") + "</span></li>";
      }).join("");
      return '<article class="order"><header><b>' + esc(o.patient_name) + '</b><span class="code">' + esc(o.order_no) + "</span></header>" +
        '<p class="qty">' + (o.quantity ? "<strong>" + esc(o.quantity) + "</strong>" : "") + "<span>Ordered " + esc(ago(o.created_at)) + "</span></p>" +
        (items ? '<ul class="ing">' + items + "</ul>" : "") +
        (o.avoid ? '<p class="alert alert--warning" role="status">' + icon("alert", 16) + "<span><strong>Do not include:</strong> " + esc(o.avoid) + "</span></p>" : "") +
        '<div class="act">' + (NEXT[o.status] ? '<button class="btn" type="button" data-id="' + o.id + '" data-to="' + NEXT[o.status][0] + '">' + NEXT[o.status][1] + "</button>" : "") +
        (BACK[o.status] ? '<button class="linkbtn" type="button" data-id="' + o.id + '" data-to="' + BACK[o.status] + '">Undo</button>' : "") + "</div></article>";
    }
    function drawBoard(msg) {
      var content = $("#content");
      if (!orders.length) { content.innerHTML = kitchenHTML(); return; }
      content.innerHTML = '<div id="board-msg" aria-live="polite">' + (msg || "") + '</div><div class="board">' + STEPS.map(function (st) {
        var list = orders.filter(function (o) { return o.status === st[0]; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
        return '<section class="col" data-step="' + st[0] + '" aria-label="' + esc(st[1]) + '"><h2><span>' + esc(st[1]) + '</span><span class="pill">' + list.length + "</span></h2>" +
          (list.length ? list.map(orderCard).join("") : '<p class="none">Nothing here</p>') + "</section>";
      }).join("") + "</div>";
    }
    function moveOrder(id, to) {
      if (busy) return; busy = true;
      document.querySelectorAll(".order button").forEach(function (b) { b.disabled = true; });
      act("order-status", { order_id: id, status: to }).then(function (resp) {
        if (resp.ok) { orders.forEach(function (o) { if (o.id === id) o.status = to; }); drawBoard(); return; }
        return load("kitchen_orders").then(function (rows) { orders = rows; drawBoard(note("warning", "That order has already moved. The board is up to date now.")); });
      }).catch(function () { drawBoard(note("error", "Could not save. Please check your connection and try again.")); }).then(function () { busy = false; });
    }
    function kitchenHTML() {
      return '<div class="empty">' + '<span class="empty__icon">' + icon("orders", 24) + "</span><h2>No feed orders yet</h2>" +
        "<p>When a dietitian approves a feed plan and the family pays, the order appears here with the ingredients and the sticker details.</p>" +
        '<p class="steps"><span>Preparing</span><span>Prepared</span><span>Packed</span><span>Ready to dispatch</span></p></div>';
    }

    // Detail panel
    function openDrawer(v, row, from, redraw) {
      opener = from;
      var d = $("#drawer");
      $("#drawer-title").textContent = row[v.titleKey] || "Details";
      $("#drawer-sub").textContent = v.subKey ? row[v.subKey] || "" : "";
      var h = v.hero, hero = "";
      if (h) {
        hero = '<div class="hero"><div class="hero__badges">' + h.badges.map(function (x) { return cell(x[1], row[x[0]], row); }).join("") + "</div>" +
          (h.time && row[h.time] ? '<p class="hero__line"><strong>' + esc(DATE_LONG.format(new Date(row[h.time]))) + "</strong><span>" + cell("call", row[h.type], row) + "</span></p>" : "") + "</div>";
      }
      // Each "#" entry is a heading, and a heading cannot sit inside a <dl>, so every section gets its own <dl>.
      var body = "", inList = false;
      v.detail.forEach(function (x) {
        if (x[0] === "#") { body += (inList ? "</dl>" : "") + '<h3 class="kv__h">' + esc(x[1]) + '</h3><dl class="kv">'; inList = true; return; }
        if (!inList) { body += '<dl class="kv">'; inList = true; }
        body += '<div class="' + (x[2] === "long" ? "kv__wide" : "") + '"><dt>' + esc(x[0]) + '</dt><dd data-k="' + x[1] + '">' + cell(x[2], row[x[1]], row) + "</dd></div>";
      });
      $("#drawer-body").innerHTML = hero + body + (inList ? "</dl>" : "");
      if (v.orderTools && role === "admin") showOrderActions(v, row, redraw);
      if (v.addressTools) showAddressTools(row, redraw);
      if (v.callStatus) showCallStatus(row, redraw);
      if (v.reports) showReports(row);
      $(".shell").inert = true; // the page behind stays out of reach while the panel is open
      $("#scrim").hidden = false; d.hidden = false;
      $("#drawer-close").focus();
    }
    // Redraws the summary badges and detail values of the open panel after a change.
    function repaint(v, row) {
      row.pay_view = payView(row);
      var hb = $(".hero__badges"); if (hb && v.hero) hb.innerHTML = v.hero.badges.map(function (x) { return cell(x[1], row[x[0]], row); }).join("");
      v.detail.forEach(function (x) { var dd = x[0] === "#" ? null : $('#drawer-body dd[data-k="' + x[1] + '"]'); if (dd) dd.innerHTML = cell(x[2], row[x[1]], row); });
    }
    // Admin: confirm cash on delivery, and mark a packed order Delivered (with the cash received for cash on delivery).
    function showOrderActions(v, row, redraw, msg) {
      var old = $("#oa"); if (old) old.remove();
      var unpaid = row.pay_status === "pending", packed = row.status === "packed" && !unpaid, done = row.status === "delivered", html = "";
      if (unpaid) html += '<div class="act-block"><label for="cod-amt">Cash on delivery: amount to collect (rupees)</label><div class="act-row"><input id="cod-amt" class="num" type="number" inputmode="numeric" min="1" placeholder="For example 1500"><button class="btn btn--quiet" type="button" data-o="cod">Confirm cash on delivery</button></div><p class="hint">Use this when the family chooses to pay in cash on delivery. The order then goes to the kitchen.</p></div>';
      if (packed) html += (row.addr_status !== "confirmed" ? note("warning", "The delivery address is not confirmed yet.") : "") + '<div class="act-row"><button class="btn" type="button" data-o="deliver">' + (row.payment_method === "cod" ? "Mark delivered, cash " + rupee(row.amount) + " received" : "Mark delivered") + "</button></div>";
      else if (done) html += '<p class="hint">Delivered ' + esc(date(row.delivered_at)) + (row.cash_collected_at ? ". Cash " + rupee(row.amount) + " received." : ".") + '</p><div class="act-row"><button class="btn btn--quiet" type="button" data-o="undo">Undo delivered</button></div>';
      else if (!unpaid) html += '<p class="hint">You can mark this order delivered once the kitchen has packed it.</p>';
      if (!html && !msg) return;
      $("#drawer-body").insertAdjacentHTML("beforeend", '<section class="sec" id="oa"><h3>Payment and delivery</h3>' + html + '<div id="oa-msg" aria-live="polite">' + (msg || "") + "</div></section>");
      var box = $("#oa");
      box.onclick = function (e) {
        var b = e.target.closest("button[data-o]"); if (!b || b.disabled) return;
        var what = b.getAttribute("data-o"), body, url, amt;
        if (what === "cod") {
          amt = parseInt($("#cod-amt").value, 10);
          if (!(amt > 0)) { $("#oa-msg").innerHTML = note("error", "Enter the amount to collect, in rupees."); return $("#cod-amt").focus(); }
          url = "order-cod"; body = { order_id: row.id, amount: amt };
        } else { url = "order-delivered"; body = { order_id: row.id, delivered: what === "deliver" }; }
        box.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
        act(url, body).then(function (resp) {
          if (!resp.ok) return resp.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || "failed"); });
          var now = new Date().toISOString();
          if (what === "cod") { row.pay_status = "cod"; row.payment_method = "cod"; row.amount = amt; }
          else if (what === "deliver") { row.status = "delivered"; row.delivered_at = now; row.cash_collected_at = row.payment_method === "cod" ? now : null; }
          else { row.status = "packed"; row.delivered_at = null; row.cash_collected_at = null; }
          repaint(v, row); if (redraw) redraw();
          showOrderActions(v, row, redraw, note("success", what === "cod" ? "Cash on delivery confirmed. The order is now on the kitchen board." : what === "deliver" ? "Marked delivered." : "Delivered undone. The order is packed again."));
        }).catch(function (err) {
          box.querySelectorAll("button").forEach(function (x) { x.disabled = false; });
          $("#oa-msg").innerHTML = note("error", err.message && err.message !== "failed" ? err.message + "." : "Could not save. Please try again.");
        });
      };
    }
    // After the feed payment, a staff member sends the family a private link to add the address. The dietitian confirms it.
    function showAddressTools(row, redraw) {
      var canConfirm = role === "dietitian" && row.addr_status === "submitted", canLink = row.addr_status !== "confirmed";
      if (!canConfirm && !canLink) return;
      $("#drawer-body").insertAdjacentHTML("beforeend", '<section class="sec" id="at"><h3>Address actions</h3><div class="act-row">' +
        (canConfirm ? '<button class="btn" type="button" data-a="confirm">Confirm address</button>' : "") +
        (canLink ? '<button class="btn btn--quiet" type="button" data-a="link">Copy address link</button>' : "") + '</div><div id="at-msg" aria-live="polite"></div></section>');
      var box = $("#at"), msg = $("#at-msg");
      box.onclick = function (e) {
        var b = e.target.closest("button[data-a]"); if (!b || b.disabled) return;
        var all = box.querySelectorAll("button"); all.forEach(function (x) { x.disabled = true; });
        var link = b.getAttribute("data-a") === "link";
        act(link ? "address-link" : "address-confirm", { order_id: row.id }).then(function (resp) {
          if (!resp.ok) throw new Error("failed");
          return resp.json();
        }).then(function (d) {
          if (link) {
            return (navigator.clipboard ? navigator.clipboard.writeText(d.url) : Promise.reject()).then(function () {
              msg.innerHTML = note("success", "Link copied. Send it to the family on WhatsApp once the feed is paid.");
            }, function () {
              msg.innerHTML = note("info", "Copy this link and send it to the family on WhatsApp:") + '<input class="copybox" readonly value="' + esc(d.url) + '" aria-label="Address link">';
              $(".copybox").select();
            });
          }
          row.addr_status = "confirmed"; row.addr_confirmed_at = new Date().toISOString();
          var hb = $(".hero__badges"); if (hb) hb.innerHTML = cell("ostat", row.status, row) + cell("astat", "confirmed", row);
          var cb = box.querySelector('[data-a="confirm"]'); if (cb) cb.remove();
          var lb = box.querySelector('[data-a="link"]'); if (lb) lb.remove();
          if (redraw) redraw();
          msg.innerHTML = note("success", "Address confirmed.");
        }).catch(function () {
          msg.innerHTML = note("error", "Could not do that. Please try again.");
        }).then(function () { all.forEach(function (x) { x.disabled = false; }); });
      };
    }
    // The dietitian marks the call: New, Called or Closed. The server checks who is asking and records the change.
    function showCallStatus(row, redraw) {
      var STEPS = [["new", "New"], ["called", "Called"], ["closed", "Closed"]];
      $("#drawer-body").insertAdjacentHTML("beforeend", '<section class="sec" id="cs"><h3>Call status</h3><div class="seg" role="group" aria-label="Call status">' + STEPS.map(function (x) {
        return '<button type="button" class="seg__btn' + (row.call_status === x[0] ? " is-on" : "") + '" data-s="' + x[0] + '" aria-pressed="' + (row.call_status === x[0]) + '">' + x[1] + "</button>";
      }).join("") + '</div><div id="cs-msg" aria-live="polite"></div></section>');
      var box = $("#cs"), msg = $("#cs-msg"), timer;
      box.onclick = function (e) {
        var b = e.target.closest("button[data-s]"), next = b && b.getAttribute("data-s");
        if (!b || b.disabled || next === row.call_status) return;
        var all = box.querySelectorAll("button"); all.forEach(function (x) { x.disabled = true; });
        act("call-status", { case_id: row.id, status: next }).then(function (resp) {
          if (!resp.ok) throw new Error("failed");
          row.call_status = next;
          all.forEach(function (x) { var on = x.getAttribute("data-s") === next; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on); });
          var hb = $(".hero__badges"); if (hb) hb.innerHTML = cell("pay", row.consult_payment, row) + cell("call_st", next, row);
          if (redraw) redraw();
          msg.innerHTML = note("success", "Saved: " + STEPS.filter(function (x) { return x[0] === next; })[0][1]);
        }).catch(function () {
          msg.innerHTML = note("error", "Could not save. Please try again.");
        }).then(function () {
          all.forEach(function (x) { x.disabled = false; });
          clearTimeout(timer); timer = setTimeout(function () { msg.innerHTML = ""; }, 4000);
        });
      };
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
      $(".shell").inert = false;
      if (opener && document.contains(opener)) opener.focus();
    }

    setup().then(function () {
      return client.auth.getSession().then(function (s) { return s.data.session ? profile() : null; });
    }).then(function (p) {
      if (!p) return location.replace("/app/");
      if (p.role !== role) return location.replace(SCREEN[p.role]);
      profileRow = p;
      $("#app").innerHTML =
        '<a class="skip-link" href="#main">Skip to content</a><div class="shell"><aside class="side"><div class="side__top"><img src="/favicon-32.png" width="32" height="32" alt=""><span class="brand">MedMeal</span></div>' +
        '<nav class="nav" aria-label="Main">' + nav.map(function (n) { return '<a href="#' + n[0] + '">' + icon(n[2]) + "<span>" + n[1] + "</span></a>"; }).join("") + "</nav>" +
        '<div class="side__user"><span class="avatar" aria-hidden="true">' + esc((p.name || "?").charAt(0).toUpperCase()) + '</span><div class="who"><b>' + esc(p.name) + "</b><span>" + ROLE_LABEL[role] + "</span></div>" +
        '<button class="btn btn--quiet" id="signout" type="button">Sign out</button></div></aside>' +
        '<main class="main" id="main" tabindex="-1"><header class="head"><div><h1 id="title" tabindex="-1"></h1><p id="sub"></p></div>' +
        '<div class="head__tools"><span class="updated" id="updated"></span><button class="btn btn--quiet btn--icon" id="refresh" type="button" aria-label="Refresh">' + icon("refresh", 16) + "<span>Refresh</span></button></div></header><div id=\"content\"></div></main></div>" +
        '<div class="scrim" id="scrim" hidden></div><aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>' +
        '<header><div><h2 id="drawer-title"></h2><p id="drawer-sub"></p></div><button class="iconbtn" id="drawer-close" type="button" aria-label="Close">' + icon("close") + '</button></header><div id="drawer-body"></div></aside>';
      document.body.hidden = false;
      $("#signout").addEventListener("click", function () { client.auth.signOut().then(function () { location.replace("/app/"); }); });
      $("#refresh").addEventListener("click", route);
      $(".skip-link").addEventListener("click", function (e) { e.preventDefault(); $("#main").focus(); }); // not a #link: the page uses the hash to pick a screen
      if (role === "kitchen") {
        $("#content").addEventListener("click", function (e) { var b = e.target.closest(".order button[data-id]"); if (b) moveOrder(b.getAttribute("data-id"), b.getAttribute("data-to")); });
        setInterval(function () { // new orders show up without pressing Refresh
          if (busy || document.hidden || !$(".board, .empty")) return;
          load("kitchen_orders").then(function (rows) { if (!busy && JSON.stringify(rows) !== JSON.stringify(orders)) { orders = rows; drawBoard(); } stamp(); }).catch(function () {});
        }, 45000);
      } else {
        setInterval(function () { // lists and the overview refresh every minute, unless a panel is open or the tab is hidden
          if (document.hidden || !$("#drawer").hidden || !silent) return;
          var a = document.activeElement;
          if (a && a.closest && a.closest("#tbl")) return; // do not pull the row away from someone using the keyboard
          silent().catch(function () {});
        }, 60000);
      }
      $("#scrim").addEventListener("click", closeDrawer);
      $("#drawer-close").addEventListener("click", closeDrawer);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") return closeDrawer();
        if (e.key !== "Tab" || $("#drawer").hidden) return;
        var f = Array.prototype.filter.call($("#drawer").querySelectorAll("button, a[href], input, select, textarea"), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      // After a menu click, put focus on the new page title so a screen reader announces the change.
      window.addEventListener("hashchange", function () { route(); $("#title").focus({ preventScroll: true }); });
      window.addEventListener("resize", scrollable);
      route();
    }).catch(function () { location.replace("/app/"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var role = document.body.getAttribute("data-role");
    if (role) screen(role); else login();
  });
})();
