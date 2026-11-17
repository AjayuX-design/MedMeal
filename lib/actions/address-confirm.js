// Staff action "address-confirm" (sent as POST /api/staff with action: "address-confirm").  { order_id }
// The dietitian confirms the delivery address the family sent. Recorded with who did it.
const staff = require("../../api/_staff");
const db = require("../../api/_db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "dietitian") return res.status(403).json({ error: "Only the dietitian can do this" });
  const id = String((req.body || {}).order_id);
  if (!UUID.test(id)) return res.status(400).json({ error: "Bad request" });

  const r = await db.rpc("staff_confirm_address", { p_actor: me.id, p_order: id });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data !== true) return res.status(404).json({ error: "No address to confirm yet" });
  return res.status(200).json({ ok: true });
};
