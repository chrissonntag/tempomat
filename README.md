<img src="logo.svg" width="280" alt="tempomat">

[Tempo.io](https://tempo.io) cloud CLI

[![CI](https://github.com/chrissonntag/tempomat/actions/workflows/ci.yml/badge.svg)](https://github.com/chrissonntag/tempomat/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/chrissonntag/tempomat)](https://github.com/chrissonntag/tempomat/releases/latest)
[![License](https://img.shields.io/github/license/chrissonntag/tempomat)](LICENSE)

Log, review and correct your Tempo Cloud worklogs from the terminal. A
bundled Claude Code skill lets you do the same in plain language with
`/tempo`.

This is a fork of
[szymonkozak/tempomat](https://github.com/szymonkozak/tempomat), based on its
version 2.0.1. The fork has its own calendar versions such as `2026.10.0`,
which are unrelated to the upstream version numbers.

## Table of contents

* [Installation](#installation)
* [Updates](#updates)
* [Documentation](#documentation)
* [License](#license)

## Installation

The releases bundle their own Node.js, so nothing else is needed.

**Linux and macOS**

```sh
curl -fsSL https://github.com/chrissonntag/tempomat/releases/latest/download/install.sh | sh
```

This installs into `~/.local/share/tempomat` and links `tempo` into
`~/.local/bin`. Set `TEMPOMAT_BIN_DIR` to link it somewhere else.

**Windows (PowerShell)**

```powershell
irm https://github.com/chrissonntag/tempomat/releases/latest/download/install.ps1 | iex
```

This installs into `%LOCALAPPDATA%\tempomat` and adds it to your `PATH`.

Both scripts verify the download against the release's `SHA256SUMS`. To
check them first, download them from the
[latest release](https://github.com/chrissonntag/tempomat/releases/latest)
and read them before running.

**From source** (needs Node.js 20 or newer)

```sh
git clone https://github.com/chrissonntag/tempomat.git
cd tempomat
npm ci
npm run build
npm link
```

Then run `tempo setup` once to connect tempomat to Jira and Tempo, see
[Getting started](docs/getting-started.md).

## Updates

```sh
tempo update           # install the latest release
tempo update --check   # only tell whether a newer release exists
```

`tempo update` downloads the latest release, verifies its checksum and
switches to it. It also updates every copy of the Claude Code skill that
tempomat installed. Once a day, any command tells you when a new release is
out.

A source checkout is updated with `git pull`, `npm ci` and `npm run build`.

## Documentation

The [user documentation](docs/README.md) covers setup, logging, reviewing
and correcting worklogs, imports, the Claude Code skill and every command.
The [changelog](CHANGELOG.md) lists the changes of each release.

## License

```
MIT License

Copyright (c) 2020 Szymon Kozak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
