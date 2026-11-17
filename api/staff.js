// POST /api/staff  { action, ...fields }   One doorway for every action a signed-in staff member takes.
// Each action lives in lib/actions and checks the sign-in token and the role itself. (One file here keeps the site under
// the free plan's limit of 12 serverless functions.)
const actions = {
  "call-status": require("../lib/actions/call-status"),
  "order-status": require("../lib/actions/order-status"),
  "address-link": require("../lib/actions/address-link"),
  "address-confirm": require("../lib/actions/address-confirm"),
  "order-cod": require("../lib/actions/order-cod"),
  "order-delivered": require("../lib/actions/order-delivered"),
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const run = Object.prototype.hasOwnProperty.call(actions, (req.body || {}).action) ? actions[req.body.action] : null;
  if (!run) return res.status(404).json({ error: "Unknown action" });
  return run(req, res);
};
