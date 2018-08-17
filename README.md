# fancy-rollup

[![npm](https://img.shields.io/npm/v/fancy-rollup.svg)](https://www.npmjs.com/package/fancy-rollup) [![Dependencies](https://img.shields.io/david/timdp/fancy-rollup.svg)](https://david-dm.org/timdp/fancy-rollup) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)

Multi-process [Rollup](https://rollupjs.org/) wrapper.

![Preview](preview.png)

## Purpose

Rollup already has the ability to run multiple builds concurrently. All you need
to do is export an array of build configurations from your configuration file.

However, Rollup will just run the builds in parallel inside the same process,
and therefore only leverage one CPU core. Additionally, it will be hard for you
to track progress of the individual builds.

What fancy-rollup does is start multiple Node processes that run Rollup, which
leverages all the available processing power and dramatically speeds up builds.
Additionally, it comes with multiple reporters that provide a nice overview of
build progress.

## Installation

For convenience, you can install fancy-rollup globally:

```bash
yarn global add fancy-rollup
```

However, you probably want to make it a devDependency of your package instead:

```bash
yarn add fancy-rollup --dev
```

## Configuration

Like Rollup itself, fancy-rollup will read `rollup.config.js` in the current
working directory. Just export an array of build configurations and you're good
to go.

## Usage

Simply invoke fancy-rollup from the command line:

```bash
fancy-rollup
```

An API for invoking fancy-rollup from your JavaScript code is in the works.

## Options

| Option | Description |
|--------|-------------|
| <nobr>`-c <filename>`<br>`--config`</nobr> | Specify config file name. Identical to Rollup's option. |
| <nobr>`-t <id>`<br>`--target`</nobr> | Select targets to build. May be specified multiple times. Default is all. |
| <nobr>`-r <name>`<br>`--reporter`</nobr> | Select style for reporting progress. See below. |
| <nobr>`-p <number>`<br>`--concurrency`</nobr> | Limit number of concurrent builds. Default is one per CPU core. |
| <nobr>`-v`<br>`--version`</nobr> | Show version number. |
| <nobr>`-h`<br>`--help`</nobr> | Show help. |

## Reporters

| Reporter | Description |
|----------|-------------|
| `interactive` | Tailing logger with progress bar and timer. Default. |
| `dumb` | Tailing logger only. Default for non-TTY environments. |
| `simple` | Live-updating one-line status. |
| `list` | Live-updating checklist using [Listr](https://www.npmjs.com/package/listr). |
| `essential` | Rollup output only. |
| `silent` | No output. |

## Author

[Tim De Pauw](https://tmdpw.eu/)

## License

MIT
