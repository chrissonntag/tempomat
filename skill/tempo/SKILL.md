---
name: tempo
description: "Log, list, edit, copy, import and delete Tempo worklogs and time trackers through the tempomat CLI (`tempo`) from a plain-language request. Use when the user wants to book, review or correct their working time in Tempo. Triggers: log time, worklog, timesheet, Zeiten buchen, '2h on ABC-123 yesterday from 9', 'what did I log this week', 'show me the week before last'."
# Claude Code extensions: writes go to the user's real Tempo account, so the
# skill only runs when the user invokes /tempo.
disable-model-invocation: true
argument-hint: "[what to log, show or change]"
---

# Tempo time tracking

Manage the user's Tempo worklogs with the `tempo` CLI. The request is in
`$ARGUMENTS`. If it is empty, show today's worklogs and ask what to do.

## Ground rules

- **Never** run `tempo setup`. It asks for API tokens interactively. If the
  CLI reports missing or invalid tokens, tell the user to run
  `! tempo setup` themselves.
- **Never** read, print or edit `~/.tempomat`. It may hold tokens. Use
  `tempo config`, `tempo alias:list` and `tempo tracker:list` instead.
- **Never** pass `--debug`, and never call the Tempo or Jira APIs directly
  (`curl` and the like). Report CLI errors instead.
- Run every write as a separate Bash call. Do not chain writes with `&&` or
  loops, so one failure cannot hide another.
- Add `--json` when you need to compute with the output. Show the normal
  tables when the user only wants to see their time.

## Reading

Reading needs no confirmation.

| Request | Command |
|---|---|
| A day | `tempo ls [DAY] -v` |
| This week | `tempo ls week` |
| Last week | `tempo ls week last` |
| N weeks ago ("the week before last" is 2) | `tempo ls week -N` |
| Calendar week 41 (ISO, Monday to Sunday) | `tempo ls week 41` |
| Week 41 of another year | `tempo ls week 41/2025` |
| This, last or a given month | `tempo ls month`, `month last`, `month 2026-09` |
| Any date range | `tempo ls --from DAY --to DAY` |
| Settings and default work type | `tempo config` |
| Work types | `tempo wa` |
| Aliases, trackers | `tempo alias:list`, `tempo tracker:list` |

Add `-v` to week and month views to see every worklog with its id, gaps
("not logged") and work type. Day views mark overlapping worklogs.

`DAY` is `YYYY-MM-DD`, `y`, `t-2`, a weekday (`mon`, `fri`, also German
`mo`, `fr`) meaning its most recent occurrence, or `last-fri` for Friday of
the previous week. Say which date you resolved a relative day to.

When summarizing a range, report the total against the required time, the
days below their required time, and the biggest issues.

## Writing

| Request | Command |
|---|---|
| Log a duration | `tempo l KEY 1h30m [DAY] [-s HH:mm] [-d "text"] [-w TYPE]` |
| Log an interval | `tempo l KEY 9-11:30 [DAY] [-d "text"] [-w TYPE]` |
| Change a worklog | `tempo e ID [-t 2h\|9-11] [-s 9:30] [--date DAY] [-d "text"] [-w TYPE] [-i KEY]` |
| Copy a worklog to another day | `tempo cp ID [DAY] [-s HH:mm]` |
| Many worklogs at once | `tempo import FILE` (see below) |
| Delete worklogs | `tempo d ID [ID...] -y` |
| Undo the last write | `tempo undo -y` |
| Trackers | `tempo start KEY`, `tempo pause KEY`, `tempo resume KEY`, `tempo stop KEY [-w TYPE]` |
| Aliases | `tempo alias:set NAME KEY [-w TYPE]`, `tempo alias:delete NAME` |
| Default work type | `tempo config:set work-type TYPE` |

- Issue keys look like `ABC-123`; lowercase is fine. Anything else may be an
  alias: check `tempo alias:list` before guessing a key.
- **Work type:** without `-w`, the CLI uses the alias's work type, then the
  default from `tempo config`. Pass `-w` only when the user names another
  type. If neither exists and the instance requires one, ask the user and
  offer to save their answer with `tempo config:set work-type`.
- Without `-s`, a duration starts at the current time. Use `-s` whenever the
  user gives a start time.
- `tempo e` keeps everything it is not told to change. Moving a worklog to
  another issue (`-i`) gives it a new id.

### Before writing

Every write command accepts `--dry-run`, which shows exactly what would be
sent and changes nothing. Use it whenever you are unsure how the CLI reads
the request.

- **Log, copy, edit, trackers, aliases:** run directly when the request
  names the issue, the time and the day without ambiguity. Otherwise state
  the exact command with resolved dates and ask first.
- **Delete and undo:** always show what will be removed (run the command
  with `--dry-run`), wait for the user's yes, then run it with `-y`. The CLI
  refuses without `-y` when it cannot ask itself.
- **Several worklogs** (a day or a week): write them to a file in your
  scratchpad, one per line with the arguments of `tempo l`, for example

  ```
  ABC-123 1h30m 2026-10-13 -s 9 -d "code review"
  ABC-124 13-17 mon -w Konzeption
  ```

  Run `tempo import FILE --dry-run`, show the preview table, and after the
  user's yes run `tempo import FILE -y`. The import checks every line before
  logging anything; if it stops halfway, it names what was logged.

## After writing

- Show the affected day or week (`tempo ls DAY` or `tempo ls week ...`).
- Mention ids of new worklogs and that `tempo undo` reverts the last write.
- Pass on overlap warnings the CLI prints.
- If a command failed, quote its error, say what did and did not run, and
  stop. Do not retry a log blindly: check `tempo ls` first, so time is not
  logged twice.
