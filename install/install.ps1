# Installs the latest tempomat release for the current user on Windows.
$ErrorActionPreference = 'Stop'

$repo = if ($env:TEMPOMAT_REPO) { $env:TEMPOMAT_REPO } else { 'chrissonntag/tempomat' }
$dataRoot = Join-Path $env:LOCALAPPDATA 'tempomat'
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }

$headers = @{}
if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "Bearer $env:GITHUB_TOKEN" }
$release = Invoke-RestMethod -UseBasicParsing -Headers $headers "https://api.github.com/repos/$repo/releases/latest"
$version = $release.tag_name -replace '^v', ''
$tarball = $release.assets | Where-Object { $_.name -match "-win32-$arch\.tar\.gz$" } | Select-Object -First 1
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
if (-not $tarball) { throw "Release $($release.tag_name) has no build for win32-$arch." }
if (-not $sums) { throw "Release $($release.tag_name) has no SHA256SUMS." }

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("tempomat-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
    Write-Host "Downloading tempomat $version (win32-$arch)"
    $archive = Join-Path $temp $tarball.name
    Invoke-WebRequest -UseBasicParsing $tarball.browser_download_url -OutFile $archive
    $sumsFile = Join-Path $temp 'SHA256SUMS'
    Invoke-WebRequest -UseBasicParsing $sums.browser_download_url -OutFile $sumsFile
    $line = Get-Content $sumsFile | Where-Object { ($_ -split '\s+\*?')[1] -eq $tarball.name } | Select-Object -First 1
    if (-not $line) { throw "SHA256SUMS has no entry for $($tarball.name)." }
    $expected = ($line -split '\s+')[0].ToLower()
    $actual = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLower()
    if ($actual -ne $expected) { throw "Checksum mismatch for $($tarball.name)." }

    $target = Join-Path $dataRoot "versions\$version"
    $staging = "$target.partial"
    if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
    New-Item -ItemType Directory -Path $staging | Out-Null
    tar -xzf $archive -C $staging
    if ($LASTEXITCODE -ne 0) { throw 'Extracting the archive failed.' }
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Move-Item $staging $target

    $binDir = Join-Path $dataRoot 'bin'
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    Set-Content -Encoding ascii -Path (Join-Path $binDir 'tempo.cmd') -Value "@echo off`r`n`"%~dp0..\versions\$version\tempo\bin\tempo.cmd`" %*"

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not (($userPath -split ';') -contains $binDir)) {
        [Environment]::SetEnvironmentVariable('Path', ((@($userPath, $binDir) | Where-Object { $_ }) -join ';'), 'User')
        Write-Host "Added $binDir to your PATH. Open a new terminal to use it."
    }
    Write-Host "Installed tempomat $version to $dataRoot"
    Write-Host "Next: run 'tempo setup'. Later, 'tempo update' installs new releases."
} finally {
    Remove-Item -Recurse -Force $temp
}
