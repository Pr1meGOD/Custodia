/**
 * sync-config.js
 * Copies the compiled ABI (and the deployed address, if present) from
 * build/contracts/EvidenceManagement.json into BOTH frontend configs:
 *   - src/config.js            (legacy vanilla app)
 *   - custodia/src/config.js   (React app)
 *
 * Usage (from project root):
 *   npx truffle migrate --reset
 *   node scripts/sync-config.js
 *
 * Pinata keys and any other fields in the config files are left untouched.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifactPath = path.join(root, "build", "contracts", "EvidenceManagement.json");
const targets = [path.join(root, "src", "config.js"), path.join(root, "custodia", "src", "config.js")];

if (!fs.existsSync(artifactPath)) {
  console.error("✖ Artifact not found. Run `npx truffle compile` (or migrate) first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const abiJson = JSON.stringify(artifact.abi, null, 2)
  .split("\n")
  .map((l, i) => (i === 0 ? l : "  " + l))
  .join("\n");

// Pick the most recently deployed network entry (Ganache network ids are timestamps)
const networks = artifact.networks || {};
const latest = Object.entries(networks).sort((a, b) => Number(b[0]) - Number(a[0]))[0];
const address = latest ? latest[1].address : null;

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.warn("⚠ Skipping missing file:", path.relative(root, file));
    continue;
  }
  let src = fs.readFileSync(file, "utf8");
  // CONTRACT_ABI is the last key in CONFIG — replace from it up to the closing "};"
  src = src.replace(/CONTRACT_ABI:\s*\[[\s\S]*\]\s*\r?\n\};/, `CONTRACT_ABI: ${abiJson}\n};`);
  if (address) {
    src = src.replace(/CONTRACT_ADDRESS:\s*"[^"]*"/, `CONTRACT_ADDRESS: "${address}"`);
  }
  fs.writeFileSync(file, src);
  console.log(`✔ Updated ${path.relative(root, file)}${address ? ` (address ${address})` : " (ABI only — no deployment found)"}`);
}
