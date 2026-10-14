# Reviewing worklogs

[Documentation index](README.md)

* [A day](#a-day)
* [A week](#a-week)
* [A month or any range](#a-month-or-any-range)
* [Output for scripts](#output-for-scripts)

## A day

`tempo list` (or `tempo ls`) shows the worklogs of a day, today by default:

```sh
tempo ls
tempo ls y
tempo ls fri
tempo ls 2026-10-12
tempo ls -v                    # with work type, description and link
```

Gaps between worklogs show up as "not logged" rows, and overlapping
worklogs are marked. Days take the same forms as in
[Logging time](logging.md#days).

## A week

Weeks are ISO weeks from Monday to Sunday. The week view shows the total of
every day and the issues you spent the most time on.

```sh
tempo ls week                  # this week
tempo ls week last             # last week
tempo ls week -2               # the week before last
tempo ls week 41               # calendar week 41 of this year
tempo ls week 41/2025          # calendar week 41 of 2025
tempo ls week 2025-W41
tempo ls week last -v          # every worklog of last week
```

`woche` works instead of `week`.

## A month or any range

```sh
tempo ls month                 # this month
tempo ls month last
tempo ls month -2
tempo ls month 2026-09
tempo ls --from 2026-10-01 --to fri
```

`monat` works instead of `month`.

## Output for scripts

Listing commands accept `--json` and then print machine-readable JSON
instead of tables. A command that fails sets a non-zero exit code.
