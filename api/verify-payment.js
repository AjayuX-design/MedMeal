// POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature, details? }
// Confirms the payment is real: signature = HMAC-SHA256(order_id + "|" + payment_id, key secret).
// Then emails the team the paid booking (a failed email never undoes a valid payment, the reply says notified: false).
const crypto = require("crypto");
const { configured, text, lines, send } = require("./_notify");

const LABELS = { 79900: "Video call", 49900: "Phone call" }; // by amount in paise

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const keyId = process.env.RAZORPAY_KEY_ID;
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

  let notified = false;
  if (configured()) {
    // The reference and amount come from Razorpay's own record of the order, not from the browser.
    let o = {};
    try {
      const r = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(String(order)), {
        headers: { Authorization: "Basic " + Buffer.from(keyId + ":" + secret).toString("base64") },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) o = await r.json();
    } catch (e) { /* the email says the reference could not be confirmed */ }

    const d = b.details || {};
    const paid = o.amount ? "\u20B9" + o.amount / 100 : "";
    const what = LABELS[o.amount] || (paid ? "Paid " + paid : "Unknown amount");
    const sent = await send(
      "PAID booking: " + what + " (" + (o.receipt || String(order)) + ")",
      lines([
        ["Status", "PAID"], ["Reference", o.receipt || "could not be confirmed, find it in Razorpay by the order ID"], ["Consultation", what],
        ["Amount paid", paid], ["Payment ID", String(payment)], ["Order ID", String(order)],
      ]) + "\n\n" + lines([
        ["Patient", text(d.patient, 100)], ["Age", text(d.age, 3)], ["How fed", text(d.route, 60)], ["Contact name", text(d.contactName, 100)],
        ["Mobile", text(d.mobile, 20)], ["Notes", text(d.notes, 2000)], ["Reports attached (names only)", text(d.reports, 500)],
      ]),
    );
    notified = sent.ok;
    if (!sent.ok) console.error("email failed for paid order", String(order), sent.error);
  }

  return res.status(200).json({ ok: true, payment_id: String(payment), notified });
};
