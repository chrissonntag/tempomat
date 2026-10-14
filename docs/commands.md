# Command reference

[Documentation index](README.md)

Generated from the help of each command. `tempo help COMMAND` shows the
same in the terminal.

<!-- commands -->
* [`tempo alias:delete ALIAS_NAME`](#tempo-aliasdelete-alias_name)
* [`tempo alias:list`](#tempo-aliaslist)
* [`tempo alias:set ALIAS ISSUE_KEY`](#tempo-aliasset-alias-issue_key)
* [`tempo autocomplete [SHELL]`](#tempo-autocomplete-shell)
* [`tempo config`](#tempo-config)
* [`tempo config:set KEY VALUE`](#tempo-configset-key-value)
* [`tempo config:unset KEY`](#tempo-configunset-key)
* [`tempo copy WORKLOG_ID [WHEN]`](#tempo-copy-worklog_id-when)
* [`tempo delete WORKLOG_ID`](#tempo-delete-worklog_id)
* [`tempo edit WORKLOG_ID`](#tempo-edit-worklog_id)
* [`tempo help [COMMAND]`](#tempo-help-command)
* [`tempo import FILE`](#tempo-import-file)
* [`tempo list [WHEN] [WHICH]`](#tempo-list-when-which)
* [`tempo log ISSUE_KEY_OR_ALIAS [DURATION_OR_INTERVAL] [WHEN]`](#tempo-log-issue_key_or_alias-duration_or_interval-when)
* [`tempo setup`](#tempo-setup)
* [`tempo skill`](#tempo-skill)
* [`tempo skill:install`](#tempo-skillinstall)
* [`tempo skill:uninstall`](#tempo-skilluninstall)
* [`tempo skill:update`](#tempo-skillupdate)
* [`tempo tracker:delete ISSUE_KEY_OR_ALIAS`](#tempo-trackerdelete-issue_key_or_alias)
* [`tempo tracker:list`](#tempo-trackerlist)
* [`tempo tracker:pause ISSUE_KEY_OR_ALIAS`](#tempo-trackerpause-issue_key_or_alias)
* [`tempo tracker:resume ISSUE_KEY_OR_ALIAS`](#tempo-trackerresume-issue_key_or_alias)
* [`tempo tracker:start ISSUE_KEY_OR_ALIAS`](#tempo-trackerstart-issue_key_or_alias)
* [`tempo tracker:stop ISSUE_KEY_OR_ALIAS`](#tempo-trackerstop-issue_key_or_alias)
* [`tempo undo`](#tempo-undo)
* [`tempo update`](#tempo-update)
* [`tempo work-attributes`](#tempo-work-attributes)

## `tempo alias:delete ALIAS_NAME`

delete issue key alias

```
USAGE
  $ tempo alias:delete ALIAS_NAME [-h] [--debug]

ARGUMENTS
  ALIAS_NAME  Alias name

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  delete issue key alias

EXAMPLES
  $ tempo alias:delete lunch
```

_See code: [src/commands/alias/delete.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/alias/delete.ts)_

## `tempo alias:list`

print aliases list

```
USAGE
  $ tempo alias:list [-h] [--debug] [--json]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials
      --json   print machine-readable JSON instead of tables

DESCRIPTION
  print aliases list

EXAMPLES
  $ tempo alias:list
```

_See code: [src/commands/alias/list.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/alias/list.ts)_

## `tempo alias:set ALIAS ISSUE_KEY`

set issue key alias, then alias can be used instead of issue key

```
USAGE
  $ tempo alias:set ALIAS ISSUE_KEY [-h] [--debug] [-w <value>]

ARGUMENTS
  ALIAS      alias name
  ISSUE_KEY  issue key

FLAGS
  -h, --help               Show CLI help.
  -w, --work-type=<value>  work type used when logging with this alias, unless -w is given
      --debug              print requests and responses without credentials

DESCRIPTION
  set issue key alias, then alias can be used instead of issue key

EXAMPLES
  $ tempo alias:set lunch abc-123

  $ tempo alias:set standup abc-124 -w Projektmanagement
```

_See code: [src/commands/alias/set.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/alias/set.ts)_

## `tempo autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ tempo autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ tempo autocomplete

  $ tempo autocomplete bash

  $ tempo autocomplete zsh

  $ tempo autocomplete powershell

  $ tempo autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v4.0.4/src/commands/autocomplete/index.ts)_

## `tempo config`

show your settings; tokens are never printed

```
USAGE
  $ tempo config [-h] [--debug] [--json]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials
      --json   print machine-readable JSON instead of tables

DESCRIPTION
  show your settings; tokens are never printed

EXAMPLES
  $ tempo config

  $ tempo config:set work-type Entwicklung

  $ tempo config:unset work-type
```

_See code: [src/commands/config/index.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/config/index.ts)_

## `tempo config:set KEY VALUE`

change a setting: work-type is used for every worklog logged without -w, token-storage moves your tokens between keychain and file

```
USAGE
  $ tempo config:set KEY VALUE [-h] [--debug]

ARGUMENTS
  KEY    (work-type|token-storage) setting name
  VALUE  new value

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  change a setting: work-type is used for every worklog logged without -w, token-storage moves your tokens between
  keychain and file

EXAMPLES
  $ tempo config:set work-type Entwicklung

  $ tempo config:set token-storage keychain
```

_See code: [src/commands/config/set.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/config/set.ts)_

## `tempo config:unset KEY`

remove a setting

```
USAGE
  $ tempo config:unset KEY [-h] [--debug]

ARGUMENTS
  KEY  (work-type) setting name

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  remove a setting

EXAMPLES
  $ tempo config:unset work-type
```

_See code: [src/commands/config/unset.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/config/unset.ts)_

## `tempo copy WORKLOG_ID [WHEN]`

[or cp], log a copy of a worklog on another day, with the same issue, time, description and work type

```
USAGE
  $ tempo copy WORKLOG_ID [WHEN] [-h] [--debug] [--json] [--dry-run] [-s <value>]

ARGUMENTS
  WORKLOG_ID  worklog id to copy, like 123456
  [WHEN]      day of the copy, defaulted to today: YYYY-MM-DD, y, t-2, fri, last-fri

FLAGS
  -h, --help           Show CLI help.
  -s, --start=<value>  start time (HH:mm) of the copy, defaults to the original start time
      --debug          print requests and responses without credentials
      --dry-run        show what would be sent to Tempo without changing anything
      --json           print machine-readable JSON instead of tables

DESCRIPTION
  [or cp], log a copy of a worklog on another day, with the same issue, time, description and work type

ALIASES
  $ tempo cp

EXAMPLES
  $ tempo copy 123456

  $ tempo cp 123456 y

  $ tempo cp 123456 2026-10-13 -s 9:30
```

_See code: [src/commands/copy.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/copy.ts)_

## `tempo delete WORKLOG_ID`

[or d], delete worklogs with the given ids after showing them and asking for confirmation

```
USAGE
  $ tempo delete WORKLOG_ID... [-h] [--debug] [--json] [--dry-run] [-y]

ARGUMENTS
  WORKLOG_ID...  worklog ids to delete, like 123456

FLAGS
  -h, --help     Show CLI help.
  -y, --yes      do not ask for confirmation
      --debug    print requests and responses without credentials
      --dry-run  show what would be sent to Tempo without changing anything
      --json     print machine-readable JSON instead of tables

DESCRIPTION
  [or d], delete worklogs with the given ids after showing them and asking for confirmation

ALIASES
  $ tempo d

EXAMPLES
  $ tempo delete 123456

  $ tempo d 123456

  $ tempo delete 123456 123457

  $ tempo d 123456 -y
```

_See code: [src/commands/delete.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/delete.ts)_

## `tempo edit WORKLOG_ID`

[or e], change a worklog in place: time, start, day, description, work type or issue

```
USAGE
  $ tempo edit WORKLOG_ID [-h] [--debug] [--json] [--dry-run] [-t <value>] [-s <value>] [--date <value>]
    [-d <value>] [-w <value>] [-i <value>] [-r <value>]

ARGUMENTS
  WORKLOG_ID  worklog id, like 123456

FLAGS
  -d, --description=<value>         new description
  -h, --help                        Show CLI help.
  -i, --issue=<value>               move to another issue key or alias; the worklog gets a new id
  -r, --remaining-estimate=<value>  new remaining estimate of the issue
  -s, --start=<value>               new start time (HH:mm), keeps the duration
  -t, --time=<value>                new duration (e.g. 1h15m) or interval (e.g. 9-11:30)
  -w, --work-type=<value>           work type name, e.g. Entwicklung (see tempo work-attributes); defaults to tempo
                                    config work-type
      --date=<value>                move to another day: YYYY-MM-DD, y, t-2, fri, last-fri
      --debug                       print requests and responses without credentials
      --dry-run                     show what would be sent to Tempo without changing anything
      --json                        print machine-readable JSON instead of tables

DESCRIPTION
  [or e], change a worklog in place: time, start, day, description, work type or issue

ALIASES
  $ tempo e

EXAMPLES
  $ tempo edit 123456 -t 2h

  $ tempo e 123456 -t 9-11:30

  $ tempo edit 123456 --start 9:30

  $ tempo edit 123456 --date y

  $ tempo edit 123456 -d "new description" -w Konzeption

  $ tempo edit 123456 --issue abc-124

  $ tempo edit 123456 -t 3h --dry-run
```

_See code: [src/commands/edit.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/edit.ts)_

## `tempo help [COMMAND]`

Display help for tempo.

```
USAGE
  $ tempo help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for tempo.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.27/src/commands/help.ts)_

## `tempo import FILE`

log many worklogs from a file or stdin, after checking all of them and showing a preview

```
USAGE
  $ tempo import FILE [-h] [--debug] [--json] [--dry-run] [-y]

ARGUMENTS
  FILE  file with one worklog per line, or - for stdin

FLAGS
  -h, --help     Show CLI help.
  -y, --yes      do not ask for confirmation
      --debug    print requests and responses without credentials
      --dry-run  show what would be sent to Tempo without changing anything
      --json     print machine-readable JSON instead of tables

DESCRIPTION
  log many worklogs from a file or stdin, after checking all of them and showing a preview
  Write one worklog per line with the arguments of tempo log, e.g.:
  ABC-123 1h30m 2026-10-13 -s 9 -d "code review"
  ABC-124 13-17 mon -w Konzeption
  Empty lines and lines starting with # are ignored.

EXAMPLES
  $ tempo import week.txt

  $ tempo import week.txt --dry-run

  cat week.txt | tempo import - -y
```

_See code: [src/commands/import.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/import.ts)_

## `tempo list [WHEN] [WHICH]`

[or ls], print worklogs of a day, a week, a month or a date range

```
USAGE
  $ tempo list [WHEN] [WHICH] [-h] [--debug] [--json] [-v] [--from <value> --to <value>]

ARGUMENTS
  [WHEN]   day, week or month to show, defaulted to today
           * date in YYYY-MM-DD format, y, t-2
           * weekday like mon or fri (most recent), last-fri (previous week)
           * week [last|-N|N|N/YYYY|YYYY-Www], ISO weeks starting on Monday
           * month [last|-N|YYYY-MM]
  [WHICH]  which week or month, see WHEN

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose       verbose output: work type, description and link per worklog; in week and month views every worklog
      --debug         print requests and responses without credentials
      --from=<value>  first day of a date range
      --json          print machine-readable JSON instead of tables
      --to=<value>    last day of a date range

DESCRIPTION
  [or ls], print worklogs of a day, a week, a month or a date range

ALIASES
  $ tempo ls

EXAMPLES
  $ tempo list

  $ tempo ls

  $ tempo ls y

  $ tempo ls fri

  $ tempo ls last-fri

  $ tempo ls 2020-02-17

  $ tempo ls -v

  $ tempo ls week

  $ tempo ls week last

  $ tempo ls week -2

  $ tempo ls week 41

  $ tempo ls week 2025-W41

  $ tempo ls month last

  $ tempo ls --from 2026-10-01 --to 2026-10-14
```

_See code: [src/commands/list.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/list.ts)_

## `tempo log ISSUE_KEY_OR_ALIAS [DURATION_OR_INTERVAL] [WHEN]`

[or l], add a new worklog using duration or interval (abc-123 15m or abc-123 11-12:30)

```
USAGE
  $ tempo log ISSUE_KEY_OR_ALIAS [DURATION_OR_INTERVAL] [WHEN] [-h] [--debug] [--json] [--dry-run] [-d
    <value>] [-s <value>] [-r <value>] [-w <value>]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS      issue key or alias
  [DURATION_OR_INTERVAL]  worklog duration (e.g 15m) or interval (e.g 11:30-14); leave out the issue to pick one of your
                          recent issues
  [WHEN]                  date to add worklog, defaulted to today
                          * date in YYYY-MM-DD format, y, t-2
                          * weekday like mon or fri (most recent), last-fri (previous week)

FLAGS
  -d, --description=<value>         description for worklog
  -h, --help                        Show CLI help.
  -r, --remaining-estimate=<value>  remaining estimate
  -s, --start=<value>               start time (HH:mm format), used when the input is a duration
  -w, --work-type=<value>           work type name, e.g. Entwicklung (see tempo work-attributes); defaults to tempo
                                    config work-type
      --debug                       print requests and responses without credentials
      --dry-run                     show what would be sent to Tempo without changing anything
      --json                        print machine-readable JSON instead of tables

DESCRIPTION
  [or l], add a new worklog using duration or interval (abc-123 15m or abc-123 11-12:30)

ALIASES
  $ tempo l

EXAMPLES
  $ tempo log abc-123 1h 

  $ tempo l abc-123 1h 

  $ tempo log abc-123 15m 

  $ tempo log abc-123 1h15m 

  $ tempo log abc-123 11-14

  $ tempo log abc-123 11-14:30

  $ tempo log abc-123 11:35-14:20 

  $ tempo log abc-123 11.35-14.20 

  $ tempo log abc-123 1h15m 2019-02-17

  $ tempo log abc-123 1h15m y

  $ tempo log abc-123 1h15m yesterday

  $ tempo log abc-123 1h15m -d "worklog description"

  $ tempo log abc-123 1h15m --start 10:30

  $ tempo log abc-123 1h15m -s 9

  $ tempo log abc-123 1h15m -w Entwicklung

  $ tempo log abc-123 2h fri -s 9

  $ tempo log abc-123 1h --dry-run

  $ tempo log 1h
```

_See code: [src/commands/log.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/log.ts)_

## `tempo setup`

setup cli, this is required before the first use

```
USAGE
  $ tempo setup

DESCRIPTION
  setup cli, this is required before the first use

EXAMPLES
  $ tempo setup
```

_See code: [src/commands/setup.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/setup.ts)_

## `tempo skill`

show where the tempo skill is installed and whether it is up to date

```
USAGE
  $ tempo skill [-h] [--debug] [--json]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials
      --json   print machine-readable JSON instead of tables

DESCRIPTION
  show where the tempo skill is installed and whether it is up to date

EXAMPLES
  $ tempo skill
```

_See code: [src/commands/skill/index.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/skill/index.ts)_

## `tempo skill:install`

install the tempo skill for Claude Code, so you can manage your time with /tempo

```
USAGE
  $ tempo skill:install [-h] [--debug] [-y] [--user | --project | --dir <value>]

FLAGS
  -h, --help         Show CLI help.
  -y, --yes          do not ask for confirmation
      --debug        print requests and responses without credentials
      --dir=<value>  into another skills directory
      --project      for the current project only (./.claude/skills/tempo)
      --user         for all your projects (~/.claude/skills/tempo)

DESCRIPTION
  install the tempo skill for Claude Code, so you can manage your time with /tempo

EXAMPLES
  $ tempo skill:install

  $ tempo skill:install --user

  $ tempo skill:install --project

  $ tempo skill:install --dir ~/agents/skills
```

_See code: [src/commands/skill/install.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/skill/install.ts)_

## `tempo skill:uninstall`

remove skill copies installed by tempomat; files you wrote yourself are never removed

```
USAGE
  $ tempo skill:uninstall [-h] [--debug] [--dir <value>]

FLAGS
  -h, --help         Show CLI help.
      --debug        print requests and responses without credentials
      --dir=<value>  remove only this installation

DESCRIPTION
  remove skill copies installed by tempomat; files you wrote yourself are never removed

EXAMPLES
  $ tempo skill:uninstall

  $ tempo skill:uninstall --dir ~/.claude/skills/tempo
```

_See code: [src/commands/skill/uninstall.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/skill/uninstall.ts)_

## `tempo skill:update`

replace every skill copy installed by tempomat with the version bundled with this release

```
USAGE
  $ tempo skill:update [-h] [--debug]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  replace every skill copy installed by tempomat with the version bundled with this release

EXAMPLES
  $ tempo skill:update
```

_See code: [src/commands/skill/update.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/skill/update.ts)_

## `tempo tracker:delete ISSUE_KEY_OR_ALIAS`

delete a tracker

```
USAGE
  $ tempo tracker:delete ISSUE_KEY_OR_ALIAS [-h] [--debug]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS  issue key or alias

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  delete a tracker

EXAMPLES
  $ tempo tracker:delete abc-123
```

_See code: [src/commands/tracker/delete.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/delete.ts)_

## `tempo tracker:list`

list all trackers

```
USAGE
  $ tempo tracker:list [-h] [--debug] [--json]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials
      --json   print machine-readable JSON instead of tables

DESCRIPTION
  list all trackers

EXAMPLES
  $ tempo tracker:list
```

_See code: [src/commands/tracker/list.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/list.ts)_

## `tempo tracker:pause ISSUE_KEY_OR_ALIAS`

[or pause], pause a tracker that is currently running

```
USAGE
  $ tempo tracker:pause ISSUE_KEY_OR_ALIAS [-h] [--debug]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS  issue key or alias

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  [or pause], pause a tracker that is currently running

ALIASES
  $ tempo pause

EXAMPLES
  $ tempo tracker:pause abc-123

  $ tempo pause abc-123
```

_See code: [src/commands/tracker/pause.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/pause.ts)_

## `tempo tracker:resume ISSUE_KEY_OR_ALIAS`

resume tracking time

```
USAGE
  $ tempo tracker:resume ISSUE_KEY_OR_ALIAS [-h] [--debug]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS  issue key or alias

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials

DESCRIPTION
  resume tracking time

EXAMPLES
  $ tempo tracker:resume abc-123

  $ tempo resume abc-123
```

_See code: [src/commands/tracker/resume.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/resume.ts)_

## `tempo tracker:start ISSUE_KEY_OR_ALIAS`

[or start], start a new tracker

```
USAGE
  $ tempo tracker:start ISSUE_KEY_OR_ALIAS [-h] [--debug] [-d <value>] [--stop-previous]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS  issue key or alias

FLAGS
  -d, --description=<value>  description for worklog once tracker is stopped
  -h, --help                 Show CLI help.
      --debug                print requests and responses without credentials
      --stop-previous        stops and logs previous tracker with the same issue key if it exists

DESCRIPTION
  [or start], start a new tracker

ALIASES
  $ tempo start

EXAMPLES
  $ tempo tracker:start abc-123

  $ tempo start abc-123

  $ tempo tracker:start abc-123 -d "worklog description"
```

_See code: [src/commands/tracker/start.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/start.ts)_

## `tempo tracker:stop ISSUE_KEY_OR_ALIAS`

[or stop], stop a tracker and log it

```
USAGE
  $ tempo tracker:stop ISSUE_KEY_OR_ALIAS [-h] [--debug] [-d <value>] [-r <value>] [-w <value>]

ARGUMENTS
  ISSUE_KEY_OR_ALIAS  issue key or alias

FLAGS
  -d, --description=<value>         description for worklog
  -h, --help                        Show CLI help.
  -r, --remaining-estimate=<value>  remaining estimate
  -w, --work-type=<value>           work type name, e.g. Entwicklung (see tempo work-attributes); defaults to tempo
                                    config work-type
      --debug                       print requests and responses without credentials

DESCRIPTION
  [or stop], stop a tracker and log it

ALIASES
  $ tempo stop

EXAMPLES
  $ tempo tracker:stop abc-123

  $ tempo stop abc-123

  $ tempo tracker:stop abc-123 -d "worklog description"
```

_See code: [src/commands/tracker/stop.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/tracker/stop.ts)_

## `tempo undo`

undo your last log, copy, import, edit or delete

```
USAGE
  $ tempo undo [-h] [--debug] [--json] [--dry-run] [-y]

FLAGS
  -h, --help     Show CLI help.
  -y, --yes      do not ask for confirmation
      --debug    print requests and responses without credentials
      --dry-run  show what would be sent to Tempo without changing anything
      --json     print machine-readable JSON instead of tables

DESCRIPTION
  undo your last log, copy, import, edit or delete

EXAMPLES
  $ tempo undo

  $ tempo undo --dry-run

  $ tempo undo -y
```

_See code: [src/commands/undo.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/undo.ts)_

## `tempo update`

update tempomat to the latest release, together with every skill copy it installed

```
USAGE
  $ tempo update [-h] [--debug] [-y] [--check] [--force]

FLAGS
  -h, --help   Show CLI help.
  -y, --yes    do not ask for confirmation
      --check  only tell whether a newer release exists
      --debug  print requests and responses without credentials
      --force  reinstall the latest release even if it is not newer

DESCRIPTION
  update tempomat to the latest release, together with every skill copy it installed

EXAMPLES
  $ tempo update

  $ tempo update --check

  $ tempo update -y
```

_See code: [src/commands/update.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/update.ts)_

## `tempo work-attributes`

[or wa], print the work attributes of the Tempo instance and their allowed values

```
USAGE
  $ tempo work-attributes [-h] [--debug] [--json]

FLAGS
  -h, --help   Show CLI help.
      --debug  print requests and responses without credentials
      --json   print machine-readable JSON instead of tables

DESCRIPTION
  [or wa], print the work attributes of the Tempo instance and their allowed values

ALIASES
  $ tempo wa

EXAMPLES
  $ tempo work-attributes

  $ tempo wa
```

_See code: [src/commands/work-attributes.ts](https://github.com/chrissonntag/tempomat/blob/v2.0.1/src/commands/work-attributes.ts)_
<!-- commandsstop -->
