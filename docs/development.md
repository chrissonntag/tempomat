# Development and releases

[Documentation index](README.md)

* [Working on tempomat](#working-on-tempomat)
* [Command reference](#command-reference)
* [Versions](#versions)
* [Releasing](#releasing)

## Working on tempomat

```sh
npm ci
npm run build
npm test
npm run lint
bin/run --help
```

Every push and pull request runs the tests on Linux, macOS and Windows.
Standalone archives are only built for a release. To check the packaging
before tagging, start the CI workflow by hand under Actions › CI › Run
workflow; it then also builds the archives.

## Command reference

[commands.md](commands.md) is generated from the commands' help texts. After
changing a command, regenerate it:

```sh
npm run docs
```

## Versions

Releases use calendar versions, `YEAR.MONTH.PATCH`: the first release in
October 2026 is `2026.10.0`, the next one in that month `2026.10.1`, the
first one in January 2027 `2027.1.0`. Months have no leading zero, so every
version is also a valid semantic version and sorts correctly.

A version number does not say whether a release breaks something. The
changelog lists such changes under **Breaking changes** instead.

## Releasing

1. Rename the `## [Unreleased]` section of [CHANGELOG.md](../CHANGELOG.md)
   to the new version, e.g. `## [2026.11.0] - 2026-11-03`. It becomes the
   release notes.
2. Bump the version and tag it: `npm version 2026.11.0`. This also
   regenerates the command reference.
3. Push the commit and the tag: `git push --follow-tags`.

The tag starts the release workflow. It runs the tests, builds standalone
archives for Linux, macOS and Windows on x64 and arm64, publishes them with
`SHA256SUMS` and the install scripts as a GitHub release, and then installs
that release on every platform to check it. `tempo update` and the update
notice pick it up from there. The skill is updated with the app because it
ships inside every release.
