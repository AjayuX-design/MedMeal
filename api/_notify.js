// Shared helper: emails the team through Brevo's transactional email API.
// Not a route (the leading underscore keeps Vercel from turning it into one). Never throws.
// Settings (Vercel environment variables): EMAIL_API_KEY, EMAIL_FROM (a sender verified in Brevo), EMAIL_TO (one or more addresses, comma separated).
const crypto = require("crypto");

const configured = () => !!(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM && process.env.EMAIL_TO);

// Trim and cap user text.
const text = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

// Reference like MM-261002-4F7K, dated in India time. ponytail: random suffix, swap for a database ID once one exists.
function ref() {
  const d = new Date(Date.now() + 19800000); // IST = UTC + 5:30
  const p = (n) => String(n).padStart(2, "0");
  return "MM-" + String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "-" +
    crypto.randomInt(36 ** 4).toString(36).toUpperCase().padStart(4, "0");
}

// Lines like "Name: Asha" from [label, value] pairs; empty values are skipped.
const lines = (pairs) => pairs.filter((p) => p[1] !== "" && p[1] != null).map((p) => p[0] + ": " + p[1]).join("\n");

async function send(subject, body) {
  if (!configured()) return { ok: false, error: "not set up" };
  const to = process.env.EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email }));
  const payload = JSON.stringify({
    sender: { name: "MedMeal website", email: process.env.EMAIL_FROM },
    to,
    subject: String(subject).replace(/\s+/g, " ").slice(0, 200),
    textContent: body,
  });
  let error = "unreachable";
  for (let attempt = 0; attempt < 2; attempt++) { // one retry for a passing hiccup
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.EMAIL_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
        body: payload,
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return { ok: true };
      error = "email service " + r.status;
    } catch (e) {
      error = "unreachable";
    }
  }
  return { ok: false, error };
}

module.exports = { configured, text, ref, lines, send };
