const { blue, cyan, gray, magenta, yellow, red } = require('chalk')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')
const E = require('../constants/events')
const formatDate = require('./format-date')
const prefixLines = require('./prefix-lines')
const stringifyError = require('./stringify-error')

const COLORS = {
  info: blue,
  warn: yellow,
  error: red
}

const startTimes = {}

const num = magenta
const str = cyan

const time = (id = '\0') => {
  startTimes[id] = Date.now()
}

const timeEnd = (id = '\0') => {
  const endTime = Date.now()
  const startTime = startTimes[id]
  delete startTimes[id]
  return endTime - startTime
}

const proxyChannel = log => ({ target, data }) => {
  log(prefixLines(data.toString(), `${target}: `))
}

const createCreateLog = logImpl => level => {
  const color = COLORS[level]
  const levelPrefix = color(`${level}: `)
  return msg => {
    const date = new Date()
    const timestamp = formatDate(date)
    const timestampPrefix = gray(`${timestamp} `)
    const lines = Array.isArray(msg) ? msg : [msg]
    for (const text of lines) {
      const formatted = `${timestampPrefix}${levelPrefix}${text}`
      logImpl({ date, level, text, formatted })
    }
  }
}

const createLogger = logImpl => {
  const logger = {}
  const createLog = createCreateLog(logImpl)
  for (const level of ['info', 'warn', 'error']) {
    logger[level] = createLog(level)
  }
  return logger
}

const createLoggingReporter = (master, log) => {
  const { info, warn, error } = createLogger(log)
  let started = 0
  master
    .on(E.init, () => {
      info('Initializing builder ...')
    })
    .on(E.fatal, ({ error: err }) => {
      error(stringifyError(err))
    })
    .on(E.fork, ({ count }) => {
      info(`Forking ${num(count)} worker(s) ...`)
    })
    .on(E.skip, ({ target }) => {
      warn(`Not building ${str(target)}`)
    })
    .on(E.startAll, () => {
      const { totalTaskCount } = master.metrics
      info(`Building ${num(totalTaskCount)} target(s) ...`)
      time()
    })
    .on(E.finishAll, () => {
      const elapsed = timeEnd()
      const { totalTaskCount } = master.metrics
      info(
        `Built ${num(totalTaskCount)} target(s) in ${num(prettyMs(elapsed))}`
      )
    })
    .on(E.startOne, ({ target }) => {
      const { totalTaskCount } = master.metrics
      info(
        `Building ${num(++started)}/${num(totalTaskCount)}: ${str(target)} ...`
      )
      time(target)
    })
    .on(E.finishOne, ({ target }) => {
      const elapsed = timeEnd(target)
      const { raw, gzipped } = master.metrics.computeBuildSize(target)
      const suffix =
        !isNaN(raw) && !isNaN(gzipped)
          ? `, size is ${num(prettyBytes(raw))} (gzipped: ${num(
              prettyBytes(gzipped)
            )})`
          : ''
      info(`Built ${str(target)} in ${num(prettyMs(elapsed))}${suffix}`)
    })
    .on(E.done, () => {
      info('All builds completed')
    })
    .on(E.stdout, proxyChannel(info))
    .on(E.stderr, proxyChannel(warn))
}

module.exports = createLoggingReporter
