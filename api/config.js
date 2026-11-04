// GET /api/config
// Gives the staff screens the public database address and public key. Both are safe to show. The secret key never leaves the server.
module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL, anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(503).json({ error: "Not set up yet" });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ url, anonKey });
};
