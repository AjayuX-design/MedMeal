// Staff action "call-status" (sent as POST /api/staff with action: "call-status").  { case_id, status }   status: new | called | closed
// The dietitian marks a booking's call. Needs the staff sign-in token. The change is written by a database function
// that records who did it, so the Activity page shows "Dietitian" and not "System".
const staff = require("../../api/_staff");
const db = require("../../api/_db");

const STATUS = ["new", "called", "closed"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "dietitian") return res.status(403).json({ error: "Only the dietitian can do this" });

  const b = req.body || {};
  if (!STATUS.includes(b.status) || !UUID.test(String(b.case_id))) return res.status(400).json({ error: "Bad request" });

  const r = await db.rpc("staff_set_call_status", { p_actor: me.id, p_case: b.case_id, p_status: b.status });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data !== true) return res.status(404).json({ error: "Booking not found" });
  return res.status(200).json({ ok: true, status: b.status });
};
