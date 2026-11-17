// Staff action "order-cod" (sent as POST /api/staff with action: "order-cod").  { order_id, amount }
// The Admin alone decides cash on delivery: this confirms the family will pay cash on delivery, and the amount to collect (rupees). The order then reaches the kitchen.
// Only for an order that is not yet paid. Recorded with who did it.
const staff = require("../../api/_staff");
const db = require("../../api/_db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "admin") return res.status(403).json({ error: "Only the Admin decides cash on delivery" });

  const b = req.body || {}, amount = Number(b.amount);
  if (!UUID.test(String(b.order_id)) || !Number.isInteger(amount) || amount < 1 || amount > 1000000) return res.status(400).json({ error: "Enter the amount to collect in rupees" });

  const r = await db.rpc("staff_confirm_cod", { p_actor: me.id, p_order: b.order_id, p_amount: amount });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data !== true) return res.status(409).json({ error: "This order is already paid or set to cash on delivery" });
  return res.status(200).json({ ok: true });
};
