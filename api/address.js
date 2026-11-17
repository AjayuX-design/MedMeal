// The delivery address page talks to this.
//   GET  /api/address?t=PASS            -> { patient, order_no, confirmed, address }   what the family sees
//   POST /api/address { t, name, mobile, line1, area, city, pincode, landmark, notes }   saves it (until the dietitian confirms)
// PASS is the private link a staff member shares with the family after the feed payment. It names one order and expires.
const { text } = require("./_notify");
const { MOBILE } = require("./_booking");
const token = require("./_token");
const db = require("./_db");

const clean = (b) => {
  const f = { name: text(b.name, 100), line1: text(b.line1, 200), area: text(b.area, 100), city: text(b.city, 60), pincode: text(b.pincode, 6), landmark: text(b.landmark, 100), notes: text(b.notes, 200) };
  const mobile = text(b.mobile, 20).replace(/[\s-]/g, "");
  if (f.name.length < 2 || f.line1.length < 5 || f.area.length < 2 || f.city.length < 2) return { error: "Please fill in all required fields" };
  if (!MOBILE.test(mobile)) return { error: "Enter a 10 digit mobile number" };
  if (!/^\d{6}$/.test(f.pincode)) return { error: "Enter a 6 digit pincode" };
  return { f, mobile: "+91" + mobile.slice(-10) };
};

module.exports = async (req, res) => {
  if (!db.configured()) return res.status(503).json({ error: "Not set up yet" });
  const body = req.body || {};
  const t = req.method === "GET" ? (req.query && req.query.t) || new URL(req.url || "/", "http://x").searchParams.get("t") : body.t;
  const orderId = token.check(t, "address");
  if (!orderId) return res.status(401).json({ error: "This link has expired" });
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const r = await db.rpc("address_info", { p_order: orderId });
    if (!r.ok) return res.status(503).json({ error: "Please try again" });
    return r.data ? res.status(200).json(r.data) : res.status(404).json({ error: "Order not found" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });

  if (body.website) return res.status(200).json({ ok: true }); // a bot filled the hidden field: pretend it worked
  const c = clean(body);
  if (c.error) return res.status(400).json({ error: c.error });
  const r = await db.rpc("submit_address", { p_order: orderId, p_name: c.f.name, p_mobile: c.mobile, p_line1: c.f.line1, p_area: c.f.area, p_city: c.f.city, p_pincode: c.f.pincode, p_landmark: c.f.landmark, p_notes: c.f.notes });
  if (!r.ok) return res.status(503).json({ error: "Could not save. Please try again" });
  if (r.data === "confirmed") return res.status(409).json({ error: "confirmed" });
  if (r.data !== "ok") return res.status(404).json({ error: "Order not found" });
  return res.status(200).json({ ok: true });
};
