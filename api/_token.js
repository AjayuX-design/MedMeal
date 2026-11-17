// A short-lived pass that lets one paid booking upload its reports. Not a route.
// Format: caseId.expiry.signature. The signature uses the server's secret key, so the browser cannot make one.
const crypto = require("crypto");

const mac = (s) => crypto.createHmac("sha256", "upload:" + (process.env.SUPABASE_SERVICE_ROLE_KEY || "")).update(s).digest("base64url");

function make(caseId, seconds = 7200) {
  const body = caseId + "." + (Math.floor(Date.now() / 1000) + seconds);
  return body + "." + mac(body);
}

// The case id if the pass is genuine and not expired, otherwise null.
function check(token) {
  const p = String(token || "").split(".");
  if (p.length !== 3 || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const want = Buffer.from(mac(p[0] + "." + p[1])), got = Buffer.from(p[2]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  return Number(p[1]) > Date.now() / 1000 ? p[0] : null;
}

module.exports = { make, check };
