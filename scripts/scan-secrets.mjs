import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "build",
  "dist",
  ".vercel",
]);
const MAX_BYTES = 2 * 1024 * 1024;

const PATTERNS = [
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "Google API Key", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Private Key Block", re: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/g },
  {
    name: "Generic Secret",
    re: /\b(api[_-]?key|secret|token|password|passwd|private[_-]?key|access[_-]?key|client[_-]?secret)\b\s*[:=]\s*[^\s"']{8,}/gi,
  },
];

const matches = [];
const ENV_FILE_ALLOWLIST = new Set([".env.local"]);
const ENV_REF_RE = /process\.env|import\.meta\.env|requiredEnv\(/;

const isIgnoredDir = (dirName) => IGNORE_DIRS.has(dirName);

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) {
        continue;
      }
      walk(fullPath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (ENV_FILE_ALLOWLIST.has(entry.name)) {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_BYTES) {
      // Skip large files to keep scans fast and avoid binary blobs.
      continue;
    }
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (const pattern of PATTERNS) {
      let count = 0;
      for (const line of lines) {
        if (pattern.name === "Generic Secret" && ENV_REF_RE.test(line)) {
          continue;
        }
        const found = line.match(pattern.re);
        if (found) {
          count += found.length;
        }
      }
      if (count) {
        matches.push({
          file: path.relative(ROOT, fullPath),
          type: pattern.name,
          count,
        });
      }
    }
  }
};

walk(ROOT);

if (matches.length) {
  console.error("Secret scan failed. Potential secrets found:");
  for (const m of matches) {
    console.error(`- ${m.type}: ${m.file} (${m.count})`);
  }
  process.exit(1);
} else {
  console.log("Secret scan passed.");
}
