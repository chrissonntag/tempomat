# Logging time

[Documentation index](README.md)

* [Durations and intervals](#durations-and-intervals)
* [Days](#days)
* [Descriptions and work types](#descriptions-and-work-types)
* [Picking a recent issue](#picking-a-recent-issue)
* [Aliases](#aliases)
* [Trackers](#trackers)

## Durations and intervals

`tempo log` (or `tempo l`) logs time on an issue, either as a duration or
as an interval:

```sh
tempo l abc-123 1h30m          # 1h30m, ending now
tempo l abc-123 15m
tempo l abc-123 2h -s 9        # 2h starting at 9:00
tempo l abc-123 9-11:30        # an interval
tempo l abc-123 11.35-14.20    # dots work as well
```

A duration without `-s` ends at the current time. Issue keys are not case
sensitive.

## Days

The worklog goes on today unless you name a day after the time:

```sh
tempo l abc-123 9-11:30 y          # yesterday
tempo l abc-123 2h t-2 -s 9        # the day before yesterday
tempo l abc-123 2h fri -s 9        # the most recent Friday
tempo l abc-123 2h last-fri -s 9   # Friday of the previous week
tempo l abc-123 2h 2026-10-12 -s 9
```

Days are `YYYY-MM-DD`, `y` or `yesterday`, `t` or `today`, `t-N`, a weekday
such as `mon` or `fri` (its most recent occurrence; German short names such
as `di` work too) or `last-` followed by a weekday for that day of the
previous week. The same forms work in every command that takes a day.

## Descriptions and work types

```sh
tempo l abc-123 1h -d "code review"
tempo l abc-123 1h -w Design
tempo l abc-123 1h -r 4h           # set the remaining estimate to 4h
```

Without `-w`, the work type comes from the alias or your default, see
[Work types](getting-started.md#work-types).

tempomat warns when a new worklog overlaps one you already logged.

## Picking a recent issue

Leave out the issue to pick one of the issues you worked on recently:

```sh
tempo l 1h
```

## Aliases

Aliases are short names for issues you log on often. An alias can bring its
own work type:

```sh
tempo alias:set lunch abc-123
tempo alias:set standup abc-124 -w Projektmanagement
tempo l standup 15m -s 9:30
tempo alias:list
tempo alias:delete lunch
```

## Trackers

A tracker measures time while you work and logs it when you stop:

```sh
tempo start abc-123 -d "code review"
tempo pause abc-123
tempo resume abc-123
tempo stop abc-123                 # logs the tracked time
tempo tracker:list
tempo tracker:delete abc-123       # discard without logging
```

`tempo start --stop-previous` logs a running tracker of the same issue
before starting a new one.
