# Correcting worklogs

[Documentation index](README.md)

* [Editing](#editing)
* [Copying](#copying)
* [Deleting](#deleting)
* [Undo](#undo)
* [Trying changes first](#trying-changes-first)

Every worklog has an id. `tempo ls` shows it in the first column.

## Editing

`tempo edit` (or `tempo e`) changes a worklog in place:

```sh
tempo e 123456 -t 2h                   # new duration
tempo e 123456 -t 9-11:30              # new interval
tempo e 123456 -s 9:30                 # new start, same duration
tempo e 123456 --date mon              # move to another day
tempo e 123456 -d "new description" -w Konzeption
tempo e 123456 -i abc-124              # move to another issue
```

Moving a worklog to another issue logs it there and deletes the original,
so it gets a new id.

## Copying

`tempo copy` (or `tempo cp`) logs a copy of a worklog with the same issue,
time, description and work type:

```sh
tempo cp 123456 y                      # same start time, yesterday
tempo cp 123456 2026-10-13 -s 9:30
```

## Deleting

`tempo delete` (or `tempo d`) shows the worklogs and asks before deleting
them. `-y` skips the question, for scripts.

```sh
tempo d 123456
tempo d 123456 123457
tempo d 123456 -y
```

## Undo

`tempo undo` reverts your last log, copy, import, edit or delete. It shows
what it will do and asks first.

```sh
tempo undo
```

## Trying changes first

Every command that changes worklogs accepts `--dry-run`. It shows what would
be sent to Tempo and changes nothing.

```sh
tempo e 123456 -t 3h --dry-run
tempo undo --dry-run
```
