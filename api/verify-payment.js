// POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Confirms the payment is real: signature = HMAC-SHA256(order_id + "|" + payment_id, key secret).
const crypto = require("crypto");

module.exports = (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(500).json({ error: "Payment is not set up yet" });

  const b = req.body || {};
  const order = b.razorpay_order_id, payment = b.razorpay_payment_id, sig = b.razorpay_signature;
  if (!order || !payment || !sig) return res.status(400).json({ error: "Missing fields" });

  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(String(order) + "|" + String(payment)).digest("hex"));
  const given = Buffer.from(String(sig));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return res.status(400).json({ error: "Signature mismatch" }); // never mark as paid
  }
  return res.status(200).json({ ok: true, payment_id: String(payment) });
};
