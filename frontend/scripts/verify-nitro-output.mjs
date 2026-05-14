import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nitroEntry = path.join(root, ".output", "server", "index.mjs");
const wranglerArtifact = path.join(root, "dist", "server", "wrangler.json");

if (!fs.existsSync(nitroEntry)) {
  if (fs.existsSync(wranglerArtifact)) {
    console.error(`
[@nexus/frontend] Wrong build target: output matches Cloudflare Workers (dist/server/wrangler.json),
but Nitro Node bundle is missing (.output/server/index.mjs).

Fix on the server:
  cd /var/www/nexus && git fetch origin && git status && git pull origin main
  cd frontend && rm -rf node_modules dist .output && npm ci && npm run build

Then: test -f .output/server/index.mjs && echo OK
`);
  } else {
    console.error(
      "[@nexus/frontend] Missing .output/server/index.mjs — Nitro did not run or build failed.",
    );
  }
  process.exit(1);
}

console.log("[@nexus/frontend] Nitro bundle OK:", nitroEntry);
