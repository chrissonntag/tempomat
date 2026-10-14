# Getting started

[Documentation index](README.md)

* [Running setup](#running-setup)
* [Token storage](#token-storage)
* [Settings](#settings)
* [Work types](#work-types)
* [Completion and shortcuts](#completion-and-shortcuts)

## Running setup

Run `tempo setup` once after installing. It asks for five things and checks
each one right away:

1. **Atlassian site**, e.g. `yourcompany.atlassian.net`. A pasted Jira URL
   works too. Setup asks again before it uses a host outside
   `atlassian.net`.
2. **Atlassian account email**
3. **Atlassian API token**, created at
   <https://id.atlassian.com/manage-profile/security/api-tokens>. Setup signs
   in to Jira with it and reads your account id.
4. **Tempo API token**, created in Tempo under Settings › API integration
5. **Default work type**, if your Tempo has work types. It is used for every
   worklog you log without `-w`.

Run `tempo setup` again at any time. Press Enter to keep a stored value.

## Token storage

Setup asks where to keep your tokens:

* **Keychain**: the macOS Keychain, the Secret Service keyring on Linux
  (needs `secret-tool`), or Windows Data Protection for your user account
* **File**: `~/.tempomat`, readable only by you

Move them later with `tempo config:set token-storage keychain` or
`tempo config:set token-storage file`. Tokens are never printed, also not by
`--debug`.

## Settings

`tempo config` shows your settings, and `tempo config:set` changes them:

```sh
tempo config
tempo config:set work-type Entwicklung
tempo config:set token-storage keychain
tempo config:unset work-type
```

## Work types

If your Tempo requires a work type for every worklog, tempomat picks it in
this order:

1. `-w` on the command
2. the work type of the [alias](logging.md#aliases) you log with
3. the default from `tempo config:set work-type`

`tempo work-attributes` (or `tempo wa`) lists the work attributes of your
Tempo instance and the allowed values.

## Completion and shortcuts

`tempo autocomplete` prints the instructions to complete commands and flags
in bash, zsh or PowerShell.

Every common command has a short form: `l` for `log`, `ls` for `list`,
`e` for `edit`, `cp` for `copy`, `d` for `delete` and `wa` for
`work-attributes`. Setup suggests shell aliases such as `tl` for `tempo l`.
