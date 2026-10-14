# Claude Code skill

[Documentation index](README.md)

tempomat ships a `/tempo` skill for
[Claude Code](https://claude.com/claude-code). With it you ask in plain
language, for example:

* `/tempo show me the week before last`
* `/tempo log 2h on ABC-123 yesterday from 9`
* `/tempo move my standup from Monday to Tuesday`

The skill uses the `tempo` command, so set up tempomat first. It always asks
before it deletes anything.

## Installing

`tempo setup` offers to install the skill. To install it later:

```sh
tempo skill:install            # asks where
tempo skill:install --user     # for all your projects
tempo skill:install --project  # for the current project only
tempo skill:install --dir ~/agents/skills
```

An existing skill named `tempo` that tempomat did not install is kept as a
backup next to the new one.

## Keeping it current

`tempo update` updates every skill copy together with tempomat. After an
update from source, the next `tempo` command refreshes outdated copies.

```sh
tempo skill                    # where it is installed and whether it is current
tempo skill:update
tempo skill:uninstall          # removes only copies tempomat installed
```
