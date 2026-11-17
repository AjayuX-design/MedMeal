// Dietitian call times. Not a route. Everything in India time (IST, no daylight saving).
// Change the rules here and nowhere else.
const CFG = {
  open: 7, close: 19,        // calls run 7 am to 7 pm, so the last 1 hour slot starts at 6 pm
  minutes: 60,               // length of one call slot
  days: 7,                   // how many days ahead a patient can choose from
  noticeMin: 120,            // nothing sooner than 2 hours from now
  holdMin: 15,               // a started but unpaid booking keeps its slot for 15 minutes
  closedWeekdays: [],        // days with no calls, 0 = Sunday ... 6 = Saturday. None: Sunday is open too.
};
const IST = 330 * 6e4, DAY = 864e5, MIN = 6e4;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const clock = (m) => { const h = Math.floor(m / 60); return (h % 12 || 12) + ":" + String(m % 60).padStart(2, "0") + " " + (h < 12 ? "am" : "pm"); };

// The days a patient can choose from, each with its slots: [{ date, label, slots: [{ ts, start, label }] }]
function generate(now = Date.now()) {
  const base = Math.floor((now + IST) / DAY) * DAY; // today's midnight on the India clock
  const out = [];
  for (let d = 0; d < CFG.days; d++) {
    const dayStart = base + d * DAY, dt = new Date(dayStart), wd = dt.getUTCDay();
    if (CFG.closedWeekdays.includes(wd)) continue;
    const slots = [];
    for (let m = CFG.open * 60; m + CFG.minutes <= CFG.close * 60; m += CFG.minutes) {
      const ts = dayStart + m * MIN - IST;
      if (ts >= now + CFG.noticeMin * MIN) slots.push({ ts, start: new Date(ts).toISOString(), label: clock(m) });
    }
    out.push({ date: dt.toISOString().slice(0, 10), label: WD[wd] + " " + dt.getUTCDate() + " " + MO[dt.getUTCMonth()], slots });
  }
  return out;
}

// The slot time (ms) if the text is exactly one of the offered slots, otherwise null.
function valid(text, now = Date.now()) {
  const ts = Date.parse(String(text || ""));
  if (isNaN(ts)) return null;
  return generate(now).some((d) => d.slots.some((s) => s.ts === ts)) ? ts : null;
}

// "Tue 18 Nov, 10:30 am"
function describe(ts) {
  const d = new Date(ts + IST), m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return WD[d.getUTCDay()] + " " + d.getUTCDate() + " " + MO[d.getUTCMonth()] + ", " + clock(m);
}

// Slots (ms) already taken between two times: paid bookings, and bookings started in the last few minutes.
// If the database cannot be asked, nothing is reported taken.
async function taken(db, from, to, now = Date.now()) {
  const hold = new Date(now - CFG.holdMin * MIN).toISOString();
  const path = "cases?select=slot_at&slot_at=gte." + encodeURIComponent(new Date(from).toISOString()) + "&slot_at=lte." + encodeURIComponent(new Date(to).toISOString()) +
    "&or=" + encodeURIComponent("(consult_payment.eq.paid,created_at.gte." + hold + ")");
  const rows = await db.query(path);
  return new Set((rows || []).map((r) => Date.parse(r.slot_at)));
}

module.exports = { CFG, generate, valid, describe, taken };
