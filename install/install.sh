#!/bin/sh
# Installs the latest tempomat release for the current user on Linux and macOS.
set -eu

REPO="${TEMPOMAT_REPO:-chrissonntag/tempomat}"
DATA_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/tempomat"
BIN_DIR="${TEMPOMAT_BIN_DIR:-$HOME/.local/bin}"

fail() {
    echo "tempomat install: $*" >&2
    exit 1
}

case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail "unsupported system $(uname -s); on Windows use install.ps1" ;;
esac
case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) fail "unsupported processor $(uname -m)" ;;
esac

command -v curl >/dev/null || fail "curl is required"
if command -v sha256sum >/dev/null; then
    sha256() { sha256sum "$1" | cut -d ' ' -f 1; }
elif command -v shasum >/dev/null; then
    sha256() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
else
    fail "sha256sum or shasum is required"
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
    release=$(curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/$REPO/releases/latest")
else
    release=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
fi
tag=$(printf '%s' "$release" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)
[ -n "$tag" ] || fail "could not find the latest release of $REPO"
version=${tag#v}
tarball_url=$(printf '%s' "$release" | sed -n "s/.*\"browser_download_url\": *\"\([^\"]*-$os-$arch\.tar\.gz\)\".*/\1/p" | head -n 1)
sums_url=$(printf '%s' "$release" | sed -n 's/.*"browser_download_url": *"\([^"]*\/SHA256SUMS\)".*/\1/p' | head -n 1)
[ -n "$tarball_url" ] || fail "release $tag has no build for $os-$arch"
[ -n "$sums_url" ] || fail "release $tag has no SHA256SUMS"

temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT
name=$(basename "$tarball_url")
echo "Downloading tempomat $version ($os-$arch)"
curl -fsSL -o "$temp/$name" "$tarball_url"
curl -fsSL -o "$temp/SHA256SUMS" "$sums_url"
expected=$(awk -v file="$name" '$2 == file || $2 == "*" file { print $1 }' "$temp/SHA256SUMS")
[ -n "$expected" ] || fail "SHA256SUMS has no entry for $name"
[ "$(sha256 "$temp/$name")" = "$expected" ] || fail "checksum mismatch for $name"

target="$DATA_ROOT/versions/$version"
rm -rf "$target.partial"
mkdir -p "$target.partial"
tar -xzf "$temp/$name" -C "$target.partial"
rm -rf "$target"
mv "$target.partial" "$target"
ln -sfn "$target/tempo" "$DATA_ROOT/current"
mkdir -p "$BIN_DIR"
ln -sfn "$DATA_ROOT/current/bin/tempo" "$BIN_DIR/tempo"

echo "Installed tempomat $version to $DATA_ROOT"
case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *) echo "Add $BIN_DIR to your PATH, e.g. in ~/.zshrc or ~/.bashrc: export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac
echo "Next: run 'tempo setup'. Later, 'tempo update' installs new releases."
