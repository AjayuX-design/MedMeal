// A short-lived pass that lets one paid booking upload its reports. Not a route.
// Format: caseId.expiry.signature. The signature uses the server's secret key, so the browser cannot make one.
const crypto = require("crypto");

// The scope keeps passes apart: an upload pass can never open an address page.
const mac = (s, scope) => crypto.createHmac("sha256", scope + ":" + (process.env.SUPABASE_SERVICE_ROLE_KEY || "")).update(s).digest("base64url");

function make(id, seconds = 7200, scope = "upload") {
  const body = id + "." + (Math.floor(Date.now() / 1000) + seconds);
  return body + "." + mac(body, scope);
}

// The id inside the pass if it is genuine, for this scope and not expired, otherwise null.
function check(token, scope = "upload") {
  const p = String(token || "").split(".");
  if (p.length !== 3 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const want = Buffer.from(mac(p[0] + "." + p[1], scope)), got = Buffer.from(p[2]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  return Number(p[1]) > Date.now() / 1000 ? p[0] : null;
}

module.exports = { make, check };
