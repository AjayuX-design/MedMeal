// Delivery address page. The private link (?t=...) names one order. The server checks it, so nothing here is trusted.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var t = new URLSearchParams(location.search).get("t");
  var state = $("#addr-state"), form = $("#addr-form"), done = $("#addr-done");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function help(msg, type) {
    state.innerHTML = '<p class="alert alert--' + type + '" role="status"><span>' + msg + "</span></p>";
    form.hidden = true;
  }
  var expired = function () { help("This link has expired or is not valid. Please call or WhatsApp us and we will send you a new one.", "info"); };

  function fieldError(input, msg) {
    var wrap = input.closest(".field"), p = wrap.querySelector(".field-error");
    if (!p) { p = document.createElement("p"); p.className = "field-error"; p.setAttribute("role", "alert"); wrap.appendChild(p); }
    p.textContent = msg || ""; p.classList.toggle("is-shown", !!msg);
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    return !msg;
  }
  function check(input) {
    var v = input.value.trim();
    if (input.required && !v) return fieldError(input, "This field is required.");
    if (input.name === "mobile" && v && !/^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ""))) return fieldError(input, "Enter a 10 digit mobile number.");
    if (input.name === "pincode" && v && !/^\d{6}$/.test(v)) return fieldError(input, "Enter a 6 digit pincode.");
    return fieldError(input, "");
  }

  if (!t) return expired();
  fetch("/api/address?t=" + encodeURIComponent(t), { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("bad");
    return r.json();
  }).then(function (d) {
    if (d.confirmed) return help("Your delivery address is confirmed. To change it, please call or WhatsApp us.", "success");
    $("#addr-for").innerHTML = "<span>Delivery for <strong>" + esc(d.patient) + "</strong>. Our dietitian will check this address and call you back if anything is unclear.</span>";
    if (d.address) Object.keys(d.address).forEach(function (k) {
      var el = form.elements[k]; if (!el || d.address[k] == null) return;
      el.value = k === "mobile" ? String(d.address[k]).replace(/^\+91/, "") : d.address[k];
    });
    form.hidden = false;
  }).catch(expired);

  Array.prototype.forEach.call(form.elements, function (el) { if (el.tagName === "INPUT" && !el.classList.contains("hp")) el.addEventListener("blur", function () { check(el); }); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = null;
    Array.prototype.forEach.call(form.querySelectorAll("input[name]:not(.hp)"), function (el) { if (!check(el) && !bad) bad = el; });
    if (bad) return bad.focus();
    var btn = $("#addr-btn"), label = btn.textContent, err = $("#addr-error"), body = { t: t };
    err.hidden = true; btn.disabled = true; btn.textContent = "Saving...";
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) body[el.name] = el.value.trim(); });
    fetch("/api/address", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var x = new Error(d.error || "failed"); x.status = r.status; throw x; } });
    }).then(function () {
      form.hidden = true; done.hidden = false;
      $("#done-name").textContent = body.name;
      $("#done-addr").textContent = [body.line1, body.area, body.city + " " + body.pincode].join(", ");
      done.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (x) {
      if (x.status === 409) return help("Your delivery address is already confirmed. To change it, please call or WhatsApp us.", "info");
      if (x.status === 401) return expired();
      err.innerHTML = '<span>' + (x.status === 400 ? esc(x.message) + "." : "We could not save your address. Please try again, or call us.") + "</span>"; err.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = label; });
  });
})();
