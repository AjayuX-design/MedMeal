// POST /api/upload-url  { token, files: [{ name, size }] }
// Gives the booking page a one-time address for each report, so the file goes straight to private storage.
// Only a paid booking holds a valid token (verify-payment hands it out). Type, size and count are checked here.
const crypto = require("crypto");
const { text } = require("./_notify");
const token = require("./_token");
const db = require("./_db");

const TYPES = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const MAX_SIZE = 10 * 1024 * 1024, MAX_PER_CASE = 8, MAX_PER_CALL = 5;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!db.configured()) return res.status(503).json({ error: "Uploads are not set up yet" });

  const b = req.body || {};
  const caseId = token.check(b.token);
  if (!caseId) return res.status(401).json({ error: "This upload link has expired" });
  const files = Array.isArray(b.files) ? b.files.slice(0, MAX_PER_CALL) : [];
  if (!files.length) return res.status(400).json({ error: "No files" });

  const have = await db.list("reports", "case_id", caseId);
  if (have === null) return res.status(503).json({ error: "Please try again" });
  let room = MAX_PER_CASE - have.length;

  const out = [];
  for (const f of files) {
    const name = text(f && f.name, 120), ext = (name.split(".").pop() || "").toLowerCase(), size = Number(f && f.size);
    if (!TYPES[ext] || !(size > 0 && size <= MAX_SIZE)) { out.push({ name, error: "Only PDF, JPG or PNG files up to 10 MB" }); continue; }
    if (room <= 0) { out.push({ name, error: "Too many files for one booking" }); continue; }
    const path = caseId + "/" + crypto.randomUUID() + "." + ext;
    const url = await db.signUpload("reports", path);
    const row = url && (await db.insert("reports", { case_id: caseId, path, file_name: name, size_bytes: Math.round(size) })).row;
    if (!row) { out.push({ name, error: "Could not prepare the upload" }); continue; }
    room--;
    out.push({ name, url, type: TYPES[ext] });
  }
  return res.status(200).json({ files: out });
};
