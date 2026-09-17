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
