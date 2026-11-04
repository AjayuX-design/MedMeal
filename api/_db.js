// Tiny Supabase helper: talks to the database's REST address with fetch, no packages. Not a route. Never throws.
// Settings (Vercel environment variables): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret, server only).
const base = () => String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const configured = () => !!(base() && process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = (v) => encodeURIComponent(String(v));

async function call(method, path, body) {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const r = await fetch(base() + "/rest/v1/" + path, {
      method,
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
}

// { ok, conflict, row }: conflict means a unique value (such as the case number) already exists.
async function insert(table, row) {
  const r = await call("POST", table, row);
  return { ok: r.ok, conflict: r.status === 409, row: r.ok && Array.isArray(r.data) ? r.data[0] || null : null };
}

// One row where column equals value, or null (also null if the database cannot be reached).
async function find(table, col, val) {
  const r = await call("GET", table + "?" + col + "=eq." + q(val) + "&limit=1");
  return r.ok && Array.isArray(r.data) ? r.data[0] || null : null;
}

async function update(table, col, val, patch) {
  return (await call("PATCH", table + "?" + col + "=eq." + q(val), patch)).ok;
}

module.exports = { configured, insert, find, update };
