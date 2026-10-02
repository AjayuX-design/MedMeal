// POST /api/create-order  { consult: "video" | "phone" }
// Creates a Razorpay order. The price is set here, never taken from the browser.
const PRICES = { video: 799, phone: 499 }; // rupees

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) return res.status(500).json({ error: "Payment is not set up yet" });

  const rupees = PRICES[(req.body || {}).consult];
  if (!rupees) return res.status(400).json({ error: "Choose a video or phone consultation" });
  const amount = rupees * 100; // paise
  if (amount < 100) return res.status(400).json({ error: "Amount too small" });

  // Reference like MM-261002-4F7K. ponytail: random suffix, swap for a database ID once one exists.
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const receipt = "MM-" + String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
    "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

  let r;
  try {
    r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(keyId + ":" + secret).toString("base64"),
      },
      body: JSON.stringify({ amount, currency: "INR", receipt }),
    });
  } catch (e) {
    return res.status(500).json({ error: "Could not reach Razorpay" });
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) return res.status(401).json({ error: "Razorpay rejected the keys" });
  if (!r.ok) return res.status(500).json({ error: "Razorpay could not create the order" });

  // key_id is public by design, sent so the page and server can never use different keys.
  return res.status(200).json({ order_id: data.id, amount: data.amount, currency: data.currency, receipt: data.receipt, key_id: keyId });
};
