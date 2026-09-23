# blog

```shell
choco install fnm
```

```shell
fnm install latest
```

```shell
fnm use latest
```

```shell
npm install
```

```shell
npm run copy_js_deps
```

```shell
zola serve
```

## Linting

The rendered HTML output in `public/` is linted with ESLint (`@html-eslint`). `templates/**/*.html` are Tera templates, not plain HTML, so they are excluded from linting. Run `zola build` before linting to make sure `public/` is up to date.

This check is mandatory and must pass before committing/pushing changes:

```shell
npm run lint
```

## Photos

Photos under `content/` must be downscaled before they are committed:

```shell
npm run optimize_photos <inbox-folder> content/cundry/<entry>/img
```

This writes 1600 px WebP files with EXIF metadata stripped. `npm run check_photos` fails on any
image over 700 KB and runs both in `npm test` and in CI.

## Third-party assets

The country flags in `static/img/flags/` are taken from
[flag-icons](https://github.com/lipis/flag-icons) 7.5.0 (MIT).
