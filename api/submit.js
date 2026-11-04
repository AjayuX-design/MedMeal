// POST /api/submit  { form: "contact" | "hospital" | "booking", ...fields }
// Saves the message as an enquiry (when the database is set up), emails the team, and returns a reference for the visitor.
// "booking" here is the unpaid "Not sure yet" request. Paid bookings are saved by create-order and verify-payment.
const { text, ref, lines, send } = require("./_notify");
const { cleanBooking, MOBILE } = require("./_booking");
const db = require("./_db");

const FORMS = {
  contact: {
    need: ["name", "mobile", "message"],
    subject: (b, r) => "New message from " + text(b.name, 100) + " (" + r + ")",
    body: (b, r, mobile) => lines([["Reference", r], ["Name", text(b.name, 100)], ["Mobile", mobile], ["Message", text(b.message, 2000)]]),
    row: (b, mobile) => ({ kind: "contact", name: text(b.name, 100), mobile, message: text(b.message, 2000) }),
  },
  hospital: {
    need: ["org", "type", "name", "mobile"],
    subject: (b, r) => "New hospital enquiry: " + text(b.org, 150) + " (" + r + ")",
    body: (b, r, mobile) => lines([["Reference", r], ["Organisation", text(b.org, 150)], ["Type", text(b.type, 60)], ["Name", text(b.name, 100)], ["Mobile", mobile], ["Message", text(b.message, 2000)]]),
    row: (b, mobile) => ({ kind: "hospital", name: text(b.name, 100), org: text(b.org, 150), org_type: text(b.type, 60), mobile, message: text(b.message, 2000) }),
  },
  booking: {
    need: ["patient", "age", "route", "contactName", "mobile"],
    subject: (b, r) => "New booking request, fee not chosen (" + r + ")",
    body: (b, r, mobile) => lines([
      ["Reference", r], ["Status", "Not paid. Visitor chose \"Not sure yet\""], ["Patient", text(b.patient, 100)], ["Age", text(b.age, 3)],
      ["How fed", text(b.route, 60)], ["Contact name", text(b.contactName, 100)], ["Mobile", mobile], ["Notes", text(b.notes, 2000)], ["Reports attached (names only)", text(b.reports, 500)],
    ]),
    row: (b, mobile) => ({ kind: "not_sure", name: text(b.contactName, 100), mobile, details: cleanBooking(b).row }),
  },
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = req.body || {};
  const f = FORMS[b.form];
  if (!f) return res.status(400).json({ error: "Unknown form" });

  // Hidden field that real visitors never fill. Bots do: pretend it worked and send nothing.
  if (b.website) return res.status(200).json({ ok: true, reference: ref() });

  for (const k of f.need) if (!text(b[k], 2000)) return res.status(400).json({ error: "Please fill in all required fields" });
  const mobile = text(b.mobile, 20).replace(/[\s-]/g, "");
  if (!MOBILE.test(mobile)) return res.status(400).json({ error: "Enter a 10 digit mobile number" });
  if (b.form === "booking") {
    const age = Number(text(b.age, 3));
    if (!(age >= 0 && age <= 120)) return res.status(400).json({ error: "Enter a valid age" });
  }

  let reference = ref(), saved = false;
  if (db.configured()) {
    for (let i = 0; i < 3 && !saved; i++) {
      const r = await db.insert("enquiries", Object.assign({ ref: reference }, f.row(b, "+91" + mobile.slice(-10))));
      if (r.row) saved = true;
      else if (r.conflict) reference = ref();
      else break;
    }
    if (!saved) console.error("enquiry not saved for", reference);
  }
  const sent = await send(f.subject(b, reference), f.body(b, reference, mobile));
  if (!saved && !sent.ok) {
    console.error("email failed for", reference, sent.error);
    return res.status(500).json({ error: "Could not send. Please call us." });
  }
  return res.status(200).json({ ok: true, reference });
};
