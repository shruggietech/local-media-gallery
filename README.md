# Local Media Gallery

A lightweight, interactive gallery for browsing local images and videos.

Your media presented beautifully.

## Start here

Read the [documentation](docs/v0.0.0/index.md) and [contribution guide](CONTRIBUTING.md). Product requirements, frameworks, packaging and supported platforms will be agreed during discovery before application implementation.

## Local development

Node.js 24 or newer runs the dependency-free repository tools. This does not select the application's runtime or framework.

```text
npm ci
npm run check
npm test
```

Spec Kit is installed with Codex skills under `.agents/skills/`, templates and Python helpers under `.specify/`, and a [project constitution](.specify/memory/constitution.md). Python 3.11 or newer is required for those helpers. Start feature work with `$speckit-specify` after agreeing the intended behavior, then clarify, plan, generate tasks and analyze before implementation. Internal planning lives in `specs/`.

## Brand maintenance

The brand comes from [ShruggieTech's brand repository](https://github.com/shruggietech/shruggie-brand), which publishes [brand.shruggie.tech](https://brand.shruggie.tech/). The updater verifies archive and manifest hashes, records provenance in `brand/lock.json`, and preserves the delivered kit bytes.

```text
npm run brand:verify
npm run brand:check
npm run brand:update
```

`brand:check` is read-only. `brand:update` imports the newest stable release containing this project's kit. A supplied candidate can be imported explicitly with `node scripts/sync-brand-kit.mjs --import PATH_TO_ZIP`; its candidate status remains recorded until a formal release replaces it. See [brand integration](docs/v0.0.0/brand.md).

## Contributing and support

Use the local contribution workflow for now. GitHub Issues, milestones and Projects become the tracking system after repository publication is authorized. See [security reporting](SECURITY.md), [community conduct](CODE_OF_CONDUCT.md) and the [changelog](CHANGELOG.md).

## License

Source code and original documentation use [Apache 2.0](LICENSE). Upstream assets retain their own notices; see [NOTICE](NOTICE) and the kit's licensing files.

A [ShruggieTech](https://shruggie.tech/) project
