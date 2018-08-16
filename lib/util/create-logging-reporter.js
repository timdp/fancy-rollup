const { blue, cyan, gray, magenta, yellow, red } = require('chalk')
const prettyMs = require('pretty-ms')
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

const createLoggingReporter = (bundler, log) => {
  const { info, warn, error } = createLogger(log)
  let started = 0
  bundler
    .on('init', () => {
      info('Initializing builder ...')
    })
    .on('fatal', ({ error: err }) => {
      error(stringifyError(err))
    })
    .on('fork', ({ count }) => {
      info(`Forking ${num(count)} worker(s) ...`)
    })
    .on('skip', ({ target }) => {
      warn(`Not building ${str(target)}`)
    })
    .on('startAll', () => {
      const { totalTaskCount } = bundler.metrics
      info(`Building ${num(totalTaskCount)} target(s) ...`)
      time()
    })
    .on('finishAll', () => {
      const elapsed = timeEnd()
      const { totalTaskCount } = bundler.metrics
      info(
        `Built ${num(totalTaskCount)} bundle(s) in ${num(prettyMs(elapsed))}`
      )
    })
    .on('startOne', ({ target }) => {
      const { totalTaskCount } = bundler.metrics
      info(
        `Building ${num(++started)}/${num(totalTaskCount)}: ${str(target)} ...`
      )
      time(target)
    })
    .on('finishOne', ({ target }) => {
      const elapsed = timeEnd(target)
      info(`Built ${str(target)} in ${num(prettyMs(elapsed))}`)
    })
    .on('done', () => {
      info('All builds completed')
    })
    .on('stdout', proxyChannel(info))
    .on('stderr', proxyChannel(warn))
}

module.exports = createLoggingReporter
