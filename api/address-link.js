// POST /api/address-link  { order_id }   -> { url }
// A dietitian or Admin makes the private address link for an order, to send to the family on WhatsApp after the feed payment.
const staff = require("./_staff");
const token = require("./_token");
const db = require("./_db");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const me = await staff.who(req);
  if (!me) return res.status(401).json({ error: "Please sign in again" });
  if (me.role !== "dietitian" && me.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const id = String((req.body || {}).order_id);
  if (!UUID.test(id)) return res.status(400).json({ error: "Bad request" });

  const r = await db.rpc("address_info", { p_order: id });
  if (!r.ok) return res.status(503).json({ error: "Please try again" });
  if (!r.data) return res.status(404).json({ error: "Order not found" });
  const h = req.headers || {}, host = h["x-forwarded-host"] || h.host || "medmeal.in";
  const scheme = /^(localhost|127\.)/.test(host) ? "http" : "https";
  return res.status(200).json({ url: scheme + "://" + host + "/address.html?t=" + encodeURIComponent(token.make(id, 14 * 86400, "address")) });
};
