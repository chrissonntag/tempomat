# Development and releases

[Documentation index](README.md)

* [Working on tempomat](#working-on-tempomat)
* [Command reference](#command-reference)
* [Releasing](#releasing)

## Working on tempomat

```sh
npm ci
npm run build
npm test
npm run lint
bin/run --help
```

Pull requests run the tests on Linux, macOS and Windows.

## Command reference

[commands.md](commands.md) is generated from the commands' help texts. After
changing a command, regenerate it:

```sh
npm run docs
```

## Releasing

1. Add a section for the new version to [CHANGELOG.md](../CHANGELOG.md),
   e.g. `## [2.1.0] - 2026-10-14`. It becomes the release notes.
2. Bump the version and tag it: `npm version minor` (or `patch`, `major`).
   This also regenerates the command reference.
3. Push the commit and the tag: `git push --follow-tags`.

The tag starts the release workflow. It runs the tests, builds standalone
archives for Linux, macOS and Windows on x64 and arm64, publishes them with
`SHA256SUMS` and the install scripts as a GitHub release, and then installs
that release on every platform to check it. `tempo update` and the update
notice pick it up from there. The skill is updated with the app because it
ships inside every release.
