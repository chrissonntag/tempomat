# Importing many worklogs

[Documentation index](README.md)

`tempo import` logs many worklogs at once. Write one worklog per line with
the arguments of [`tempo log`](logging.md). Empty lines and lines starting
with `#` are ignored. For example, `week.txt`:

```
# Monday
ABC-123 1h30m 2026-10-12 -s 9 -d "code review"
ABC-124 13-17 mon -w Konzeption
```

tempomat checks every line before logging anything, shows a preview and
asks for confirmation:

```sh
tempo import week.txt
tempo import week.txt --dry-run      # only the preview
cat week.txt | tempo import - -y     # from stdin, without asking
```

`tempo undo` removes all worklogs of the last import.
