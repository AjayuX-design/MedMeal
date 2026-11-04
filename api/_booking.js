// Checks the patient details from the booking form. Not a route. Used by create-order and submit.
const { text } = require("./_notify");

const MOBILE = /^(\+?91)?[6-9]\d{9}$/;

// Returns { error } or { row } with the patient fields as the cases table stores them.
function cleanBooking(b) {
  b = b || {};
  const patient = text(b.patient, 100), route = text(b.route, 60), contactName = text(b.contactName, 100);
  if (!patient || !text(b.age, 3) || !route || !contactName) return { error: "Please fill in all required fields" };
  const mobile = text(b.mobile, 20).replace(/[\s-]/g, "");
  if (!MOBILE.test(mobile)) return { error: "Enter a 10 digit mobile number" };
  const age = Number(text(b.age, 3));
  if (!(age >= 0 && age <= 120)) return { error: "Enter a valid age" };
  return {
    row: {
      patient_name: patient, age, feeding_route: route, contact_name: contactName,
      mobile: "+91" + mobile.slice(-10), notes: text(b.notes, 2000), report_names: text(b.reports, 500),
    },
  };
}

module.exports = { cleanBooking, MOBILE };
