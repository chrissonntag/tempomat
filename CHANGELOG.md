# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Standalone releases for Linux, macOS and Windows (x64 and arm64) with
  bundled Node.js, install scripts and `SHA256SUMS`
- `tempo update` installs the latest release after verifying its checksum;
  a daily notice tells you when one is out
- Claude Code skill: `tempo skill:install`, `skill:update`,
  `skill:uninstall` and `tempo skill`; setup offers to install it
- Week, month and date range views: `tempo ls week [last|-N|N|N/YYYY]`,
  `tempo ls month [last|-N|YYYY-MM]`, `tempo ls --from --to`, with logged
  versus required time per day and a per-issue summary
- Weekday dates such as `fri`, `mo` and `last-fri` wherever a day is given
- `tempo edit` changes a worklog in place, `tempo copy` copies one to another
  day, `tempo undo` reverts the last log, copy, import, edit or delete
- `tempo import` logs many worklogs from a file or stdin after checking all
  of them and showing a preview
- Work types: `-w` on `log` and `stop`, a default work type
  (`tempo config:set work-type`), a work type per alias and
  `tempo work-attributes`
- `tempo config` shows settings; `config:set token-storage keychain` keeps
  tokens in the macOS Keychain, the Secret Service keyring or Windows Data
  Protection
- `--dry-run` on every command that changes worklogs, `--json` on listings
- `tempo l 1h` without an issue offers your recent issues
- Day view shows unlogged gaps, overlapping worklogs and the work type

### Changed
- `tempo setup` checks every answer right away, reads your account id from
  Jira instead of asking for a profile URL, keeps stored values on Enter and
  asks where to keep your tokens
- `tempo delete` shows the worklogs and asks before deleting; scripts pass
  `-y`. Several ids are deleted, not only the first one
- Failed commands exit with status 1
- The user documentation moved from the README to `docs/`; the README keeps
  installation, updates and the license

### Security
- `--debug` no longer prints tokens
- Issue keys and ids are validated before they reach the Jira API
- Pagination links are only followed to Tempo hosts
- Dependencies with known vulnerabilities were updated or replaced
- The config file is written atomically with mode 600 and is never replaced
  when it cannot be read

## [2.0.1] - 2025-12-04

### Changed
- Setup flow updated to handle new Jira profile URL structure

## [2.0.0] - 2025-04-08

### Changed
- Migrated from Tempo API v3 to v4
- Switched from using issueKey to issueId for worklogs (which is required in API v4)
- Added integration with Atlassian API to fetch issueId based on issueKey
- Requires reconfiguration after installation (run `tempo setup`)
- New configuration requires Atlassian user email and Atlassian token
- See [#66](https://github.com/szymonkozak/tempomat/issues/66) for more details about why Atlassian token is needed
- Updated most of dependencies

## [1.1.0] - 2020-08-13

### Added
- Tracker feature
- Display aliases in the worklogs table

### Changed
- Adapted setup instructions to fit new tempo version

### Fixed
- Error handling issues
- Time related issues

## [1.0.5] - 2020-07-29

- Initial release 
