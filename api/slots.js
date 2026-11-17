// GET /api/slots  -> the days and call times a patient can choose, with the taken ones marked.
const slots = require("./_slots");
const db = require("./_db");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const now = Date.now(), days = slots.generate(now);
  const all = days.flatMap((d) => d.slots.map((s) => s.ts));
  const busy = all.length ? await slots.taken(db, Math.min(...all), Math.max(...all), now) : new Set();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    days: days.map((d) => ({ date: d.date, label: d.label, slots: d.slots.map((s) => ({ start: s.start, label: s.label, free: !busy.has(s.ts) })) })),
  });
};
