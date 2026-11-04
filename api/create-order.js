// POST /api/create-order  { consult: "video" | "phone", details }
// Saves the booking as a case (Not completed) when the database is set up, then creates the Razorpay order.
// The price is set here, never taken from the browser.
const { ref } = require("./_notify");
const { cleanBooking } = require("./_booking");
const db = require("./_db");

const PRICES = { video: 799, phone: 499 }; // rupees

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return res.status(500).json({ error: "Payment is not set up yet" });

  const b = req.body || {};
  const rupees = PRICES[b.consult];
  if (!rupees) return res.status(400).json({ error: "Choose a video or phone consultation" });
  const amount = rupees * 100; // paise
  if (amount < 100) return res.status(400).json({ error: "Amount too small" });

  // The hidden trap field, and the patient details when we are saving them.
  if (b.details && b.details.website) return res.status(400).json({ error: "Not allowed" });
  const clean = b.details ? cleanBooking(b.details) : null;
  if (clean && clean.error) return res.status(400).json({ error: clean.error });

  // Save the case first, so a patient who starts paying and stops is still on record. A database hiccup never blocks the payment.
  let caseNo = ref(), saved = null;
  if (clean && db.configured()) {
    for (let i = 0; i < 3 && !saved; i++) {
      const r = await db.insert("cases", Object.assign({ case_no: caseNo, call_type: b.consult, consult_amount: rupees }, clean.row));
      if (r.row) saved = r.row;
      else if (r.conflict) caseNo = ref(); // that number was taken, try another
      else break;
    }
    if (!saved) console.error("case not saved for", caseNo);
  }

  let r;
  try {
    r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(keyId + ":" + secret).toString("base64"),
      },
      body: JSON.stringify({ amount, currency: "INR", receipt: caseNo }),
    });
  } catch (e) {
    return res.status(500).json({ error: "Could not reach Razorpay" });
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) return res.status(401).json({ error: "Razorpay rejected the keys" });
  if (!r.ok) return res.status(500).json({ error: "Razorpay could not create the order" });

  if (saved) {
    const p = await db.insert("payments", { case_id: saved.id, kind: "consultation", razorpay_order_id: data.id, amount: rupees });
    if (!p.row) console.error("payment row not saved for", caseNo);
  }

  // key_id is public by design, sent so the page and server can never use different keys.
  return res.status(200).json({ order_id: data.id, amount: data.amount, currency: data.currency, receipt: data.receipt, key_id: keyId });
};
