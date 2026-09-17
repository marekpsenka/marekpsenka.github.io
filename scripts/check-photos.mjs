// Runs in CI without devDependencies, so it must stick to node builtins.
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "content";
// Sits above the largest 1600 px q82 photo (~580 KB) and below the smallest unprocessed original (~1 MB).
const MAX_BYTES = 700 * 1024;
const IMAGE = /\.(jpe?g|png|webp|gif)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (IMAGE.test(entry.name)) {
      yield path;
    }
  }
}

const offenders = [];
for await (const path of walk(ROOT)) {
  const { size } = await stat(path);
  if (size > MAX_BYTES) {
    offenders.push({ path, size });
  }
}

if (offenders.length > 0) {
  console.error(`Images larger than ${MAX_BYTES / 1024} KB:`);
  for (const { path, size } of offenders) {
    console.error(`  ${path}  ${Math.round(size / 1024)} KB`);
  }
  console.error("Run: npm run optimize_photos <inbox> <out-dir>");
  process.exit(1);
}

console.log(`All images under ${ROOT}/ are within ${MAX_BYTES / 1024} KB.`);
