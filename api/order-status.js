// POST /api/order-status  { order_id, status }   status: new | preparing | prepared | packed
// The kitchen moves a feed order one step. Needs the staff sign-in token. The database function allows one step forward
// or one step back, and records who did it.
const staff = require("./_staff");
const db = require("./_db");

const STATUS = ["new", "preparing", "prepared", "packed"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "kitchen") return res.status(403).json({ error: "Only the kitchen can do this" });

  const b = req.body || {};
  if (!STATUS.includes(b.status) || !UUID.test(String(b.order_id))) return res.status(400).json({ error: "Bad request" });

  const r = await db.rpc("staff_set_order_status", { p_actor: me.id, p_order: b.order_id, p_status: b.status });
  if (r.status >= 400 && r.status < 500) return res.status(409).json({ error: "That step is not allowed. The order may already have moved" });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data !== true) return res.status(404).json({ error: "Order not found" });
  return res.status(200).json({ ok: true, status: b.status });
};
