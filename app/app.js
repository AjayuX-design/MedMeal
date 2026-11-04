// Staff screens: sign in, and keep each role on its own screen.
// The page gets the database address and public key from /api/config. The database itself decides what each role may read.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var SCREEN = { dietitian: "/app/dietitian.html", kitchen: "/app/kitchen.html", admin: "/app/admin.html" };
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
  function count(view) {
    return client.from(view).select("id", { count: "exact", head: true }).then(function (r) { return r.error ? "?" : r.count; });
  }

  // Login page
  function login() {
    setup().then(function () {
      return client.auth.getSession().then(function (s) { return s.data.session ? profile() : null; });
    }).then(function (p) {
      if (p && SCREEN[p.role]) location.replace(SCREEN[p.role]);
    }).catch(function () { fail("Sign in is not set up yet. Please ask Pixxel Nesst."); });

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
        if (r.error) throw new Error("bad login");
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
          : m.indexOf("wrong role:") === 0 ? "This is a " + m.slice(11) + " account. Please choose " + m.slice(11) + " above."
          : "The email or password is not right. Please try again.");
      });
    });
  }

  // A role screen
  function screen(role) {
    setup().then(function () {
      return client.auth.getSession().then(function (s) { return s.data.session ? profile() : null; });
    }).then(function (p) {
      if (!p) return location.replace("/app/");
      if (p.role !== role) return location.replace(SCREEN[p.role]);
      $("#who-name").textContent = p.name;
      document.body.hidden = false;
      var counts = { dietitian: [["dietitian_cases", "Paid bookings"]], admin: [["admin_cases", "Bookings"], ["admin_enquiries", "Enquiries"]], kitchen: [] }[role];
      return Promise.all(counts.map(function (c) { return count(c[0]); })).then(function (n) {
        $("#tiles").innerHTML = counts.map(function (c, i) { return '<div class="tile"><b>' + n[i] + "</b><span>" + c[1] + "</span></div>"; }).join("");
      });
    }).catch(function () { location.replace("/app/"); });

    $("#signout").addEventListener("click", function () {
      client.auth.signOut().then(function () { location.replace("/app/"); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var role = document.body.getAttribute("data-role");
    if (role) screen(role); else login();
  });
})();
