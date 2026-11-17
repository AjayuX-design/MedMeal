// POST /api/order-delivered  { order_id, delivered }   delivered: true marks it, false undoes it
// The Admin marks a packed order Delivered. For cash on delivery that also records the cash received. Recorded with who did it.
const staff = require("./_staff");
const db = require("./_db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "admin") return res.status(403).json({ error: "Only the Admin can do this" });

  const b = req.body || {};
  if (!UUID.test(String(b.order_id)) || typeof b.delivered !== "boolean") return res.status(400).json({ error: "Bad request" });

  const r = await db.rpc("staff_set_delivered", { p_actor: me.id, p_order: b.order_id, p_delivered: b.delivered });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data !== true) return res.status(409).json({ error: b.delivered ? "Only a packed, paid order can be marked delivered" : "This order is not marked delivered" });
  return res.status(200).json({ ok: true });
};
