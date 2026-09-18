# Plan: Čundry — a chronicle of ČB adventures

A third top-level area of the site, alongside _posts_ and _grains_, holding one entry per year of
hiking with the Čundr boys.

## Decisions

Settled during design review. Recorded here so the reasoning survives.

| # | Decision | Rationale |
|---|---|---|
| 1 | Each entry is its own Zola page with its own URL | Shareable per-year links; 128 photos on one page is too heavy |
| 2 | Content model: section + page bundles (the Blog pattern, not the Grains JSON pattern) | Bundles give colocated images, markdown bodies and per-page URLs; grains are one-liners with no assets |
| 3 | Photos are committed to the repository, downscaled first | ~30 MB total at 1600 px WebP, ~4 MB per new year. No external account to outlive |
| 4 | Thumbnails generated at build time by Zola `resize_image` | One source file per photo in git; derivatives are build artifacts |
| 5 | Timeline is hand-rolled CSS in `sass/custom.scss` | ~40 lines of SCSS against a dependency that must be kept alive for a page that changes once a year |
| 6 | Nav label `čundry`; all prose in English | Matches the site's existing voice; Czech terms kept and used as-is |
| 7 | Country flags are committed SVGs under `static/img/flags/` | Flags never change; six 2 KB files beat a 1 MB npm dependency and a CI step |
| 8 | Downscale script is Node + `sharp` | Cross-platform, arrives with `npm install`. Caveat: no HEIC support in prebuilt binaries |
| 9 | A size guard in `npm test` fails on any committed image over 700 KB | Catches the one failure mode that is expensive to undo — a fat photo in git history. Threshold raised from 400 KB after real photos measured 65–579 KB at 1600 px q82 |
| 10 | EXIF is stripped (sharp's default) | Photos must not ship GPS coordinates of campsites and homes |
| 11 | ASCII on disk and in URLs: `content/cundry/`, entries as `2026-kosovo/` | Diacritics live in the rendered title and nav label only |
| 12 | Front matter carries country, country code, mountains, city, thumbnail | `date` is the single source of truth for the year |
| 13 | Gallery is a thumbnail grid plus one Bootstrap modal lightbox | Bootstrap JS is already loaded; square thumbs tidy a mix of portrait and landscape |
| 14 | Timeline nodes stay terse: year, flag, country, mountains, thumbnail | Eight nodes should scan in roughly one screen |
| 15 | Ship the machinery plus one fully real entry (2026 Kosovo) | Proves the pipeline end to end before curating 128 photos |
| 16 | Alt text auto-generated, with an optional per-photo caption override | Lint-clean on day one; enrich later without touching templates |
| 17 | Flag SVGs lifted from `flag-icons` (MIT), committed with attribution | Includes `xk` for Kosovo |
| 18 | One reused modal with a small click handler; `page.content` wrapped in `eslint-disable` | Avoids 16 duplicate ids; markdown output cannot satisfy the indent rule |
| 19 | Per-entry `description`; `og:image` is **not** overridden | Site-wide wheat glyph stays the preview image |
| 20 | No intro paragraph on the index; no homepage change | The nav link is sufficient discovery |

### Known constraint: lint targets rendered output

[eslint.config.js](eslint.config.js#L9) lints `public/**/*.html`, not `templates/`. Consequences for
every new template:

- `npm run lint` requires a `zola build` first.
- Generated HTML must be indented with 2 spaces — this is why existing templates carry unusual
  indentation.
- `require-img-alt` applies to all 128 photos.
- `no-duplicate-id` rules out one-modal-per-photo.

## Phase 1 — Scaffolding

- [x] Create `content/cundry/_index.md`:
      ```toml
      +++
      title = "Čundry"
      sort_by = "date"
      template = "cundry.html"
      page_template = "cundry-entry.html"
      +++
      ```
- [x] Add `templates/cundry.html` and `templates/cundry-entry.html` as minimal stubs extending
      `base.html`, so the section builds before any styling exists.
- [x] Add the nav link to [templates/header.html](templates/header.html#L15-L18), following the
      existing wheat-glyph-plus-anchor pattern:
      `<a href="{{ get_url(path='@/cundry/_index.md') }}">čundry</a>`.
- [x] `zola build` and confirm `/cundry/` renders and `npm run lint` passes.

`cundry-entry.html` is written but not yet exercised — the section has no pages until Phase 5.

## Phase 2 — Photo pipeline

- [x] Add `sharp` as a **devDependency** — CI runs `npm install --omit=dev`, so it never reaches the
      build.
- [x] Create `scripts/optimize-photos.mjs` (max 1600 px, WebP q82, EXIF orientation baked in then
      metadata dropped):
      ```js
      import sharp from "sharp";
      import { readdir, mkdir } from "node:fs/promises";
      import { join, parse } from "node:path";

      const [inbox, outDir] = process.argv.slice(2);
      if (!inbox || !outDir) {
        console.error("usage: node scripts/optimize-photos.mjs <inbox> <out-dir>");
        process.exit(1);
      }

      await mkdir(outDir, { recursive: true });
      const files = (await readdir(inbox)).filter((f) => /\.(jpe?g|png)$/i.test(f));

      for (const file of files.sort()) {
        const out = join(outDir, `${parse(file).name.toLowerCase()}.webp`);
        const { width, height, size } = await sharp(join(inbox, file))
          .rotate() // bakes EXIF orientation in before metadata is dropped
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(out);
        console.log(`${file} -> ${out}  ${width}x${height}  ${Math.round(size / 1024)} KB`);
      }
      ```
- [x] Create `scripts/check-photos.mjs` — walks `content/`, fails on any image over 700 KB. Must use
      **node builtins only** so it can run in CI without devDependencies. Uses a hand-rolled
      recursive walk rather than `readdir({ recursive: true })`, which needs Node 20.1+ — the CI
      runner installs node via `apt`, so the version is not guaranteed.
- [x] Wire up [package.json](package.json#L6):
      `"optimize_photos": "node scripts/optimize-photos.mjs"`,
      `"check_photos": "node scripts/check-photos.mjs"`,
      `"test": "npm run check_photos && npm run lint"`.
- [x] **Resolved:** a `Check photo sizes` step now runs `npm run check_photos` in
      [deploy.yml](.github/workflows/deploy.yml#L45-L46), before `zola build`.

Headroom note: the largest existing image is `content/blog/landscape-of-deployment/timeline.png` at
395 KB, well inside the 700 KB guard. Real čundr photos at 1600 px q82 measured 65–579 KB, which is
why the threshold was raised from the original 400 KB guess.

## Phase 3 — Timeline (index page)

- [x] SCSS in [sass/custom.scss](sass/custom.scss): vertical spine as a `::before` pseudo-element on
      the timeline container, dots as pseudo-elements on each node, nodes alternating via
      `:nth-child(odd|even)` with Bootstrap's grid, collapsing to a single right-aligned column below
      the `md` breakpoint. Colours from the existing `$wheat` / `$dark-wheat` palette.
- [x] `templates/cundry.html` iterates `section.pages` (newest first, matching the sketch) and emits
      per node: year from `page.date`, flag `<img>`, country, mountains, and a 200×200 `op="fill"`
      thumbnail from `page.extra.thumb`, the whole node linking to `page.permalink`.
- [x] Verify the rendered output passes the 2-space indent rule.
- [x] Pulled forward from Phase 5: the six flag SVGs, since the timeline cannot be reviewed without
      them. Copied out of `flag-icons` 7.5.0 (MIT) installed with `--no-save`, then uninstalled;
      attribution added to [README.md](README.md#L48).

Node layout is a horizontal card: 6 rem square thumbnail on the left, flag + year + country as the
heading, mountains beneath. Odd nodes sit left of the spine so the newest entry is on the left,
matching the sketch. Verified at 390 px and 1536 px, in light and dark mode, against two throwaway
entries that were then deleted.

## Phase 4 — Entry page

- [x] `templates/cundry-entry.html` extends `base.html`; head block reuses the
      `title_and_description` component exactly as [templates/blog-page.html](templates/blog-page.html#L7)
      does. No `og:image` override.
- [x] Header: title, flag, mountains + city, year.
- [x] Body: `{{ page.content | safe }}` wrapped in `<!-- eslint-disable -->` / `<!-- eslint-enable -->`.
- [x] Gallery: discover photos from `page.assets`, derive each basename, and feed
      `resize_image(path=page.colocated_path ~ "img/" ~ name, width=320, height=320, op="fill",
      format="webp")` for the grid. The modal shows the committed 1600 px file, served from
      `page.permalink ~ "img/" ~ name`.
- [x] Alt text: defaults to `Photo N from <country> <year>`, overridden when the filename appears in
      `page.extra.captions`. Verified: `captions[name] | default(value=...)` works both with no
      `captions` table at all and with a partially populated one, so the array-of-tables fallback is
      not needed.
- [x] One modal element per page; a small handler swaps `src` and `alt` on thumbnail click.
- [x] Neither existing SCSS rule caused trouble: `.flag-chip` carries `filter: none` to cancel the
      wheat tint that `header img` would otherwise apply to the flag.

Three things discovered while building this:

1. **`page.assets` uses backslashes on Windows** (`/cundry\2026-kosovo\img\01.webp`) and forward
   slashes on Linux CI. The basename is extracted with
   `split(pat="/") | last | split(pat="\\") | last`, which is correct on both.
2. **Zola 0.23's Tera rejects `is matching("...")`** with "Found string but expected identifier".
   The extension filter is done with `name | split(pat=".") | last == "webp"` instead.
3. **`@html-eslint/attrs-newline`** requires one attribute per line once an element carries more
   than a couple, which shaped the modal markup.

The lightbox uses a transparent `.modal-content` and caps the photo at `85vh` so portrait shots fit
the screen. Verified at 390 px and 1100 px, light and dark, with both landscape and portrait photos.

## Phase 5 — First real entry

- [ ] `content/cundry/2026-kosovo/index.md`:
      ```toml
      +++
      title = "Kosovo"
      date = 2026-08-15
      description = "..."
      [extra]
      country = "Kosovo"
      country_code = "xk"
      mountains = "Šar planina"
      city = "Pristina"
      thumb = "img/01.webp"
      +++
      ```
- [x] Run the photo inbox through `npm run optimize_photos` into
      `content/cundry/2026-kosovo/img/`, 16 photos. 4.7 MB total, named `01`–`16` chronologically.
- [x] Commit `static/img/flags/xk.svg` with the MIT attribution comment. All six flags are in place
      (`ba`, `cz`, `ge`, `me`, `sk`, `xk`). Note `me.svg` is 56 KB — Montenegro's coat of arms is
      detailed; the rest are 0.2–8 KB.
- [ ] Write the paragraph. Also replace the `description` placeholder in the front matter.
- [ ] Once the real body is in, re-check the `Unused eslint-disable directive` warning on the entry
      page. It fires because a single-line body happens to land at valid indentation; a
      multi-paragraph body should make the directive necessary. If it persists, drop the directive.

## Phase 6 — Polish

- [ ] Check the timeline and gallery at `sm`, `md` and `lg` breakpoints, in both light and dark mode.
- [ ] Confirm `npm test` is green and repository size is still sane.
- [ ] Remaining seven entries (2019 Georgia, 2020 Slovakia, 2021 Czechia, 2022 Montenegro,
      2023 Czechia, 2024 Bosnia and Herzegovina, 2025 Czechia) added one at a time as photos are dug
      up — each is a folder, a front-matter block, a flag SVG and a paragraph.
