import { readdir, mkdir } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const [inbox, outDir] = process.argv.slice(2);
if (!inbox || !outDir) {
  console.error("usage: node scripts/optimize-photos.mjs <inbox> <out-dir>");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const files = (await readdir(inbox)).filter((f) => /\.(jpe?g|png)$/i.test(f));

if (files.length === 0) {
  console.error(`no .jpg/.png files found in ${inbox}`);
  process.exit(1);
}

for (const file of files.sort()) {
  const out = join(outDir, `${parse(file).name.toLowerCase()}.webp`);
  const { width, height, size } = await sharp(join(inbox, file))
    .rotate() // bakes EXIF orientation in before metadata is dropped
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`${file} -> ${out}  ${width}x${height}  ${Math.round(size / 1024)} KB`);
}
