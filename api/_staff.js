// Who is asking? Not a route. Staff screens send their sign-in token; this checks it with Supabase and looks up the role.
// Returns { id, role } for an active staff member, otherwise null. Never throws.
const db = require("./_db");

async function who(req) {
  try {
    const m = /^Bearer (.+)$/.exec(String((req.headers && (req.headers.authorization || req.headers.Authorization)) || ""));
    const url = String(process.env.SUPABASE_URL || "").replace(/\/+$/, ""), anon = process.env.SUPABASE_ANON_KEY;
    if (!m || !url || !anon) return null;
    const r = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + m[1] }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const user = await r.json().catch(() => null);
    if (!user || !user.id) return null;
    const row = await db.find("staff", "id", user.id);
    return row && row.active ? { id: user.id, role: row.role } : null;
  } catch (e) {
    return null;
  }
}

module.exports = { who };
