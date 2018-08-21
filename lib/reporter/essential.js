const E = require('../constants/events')
const prefixLines = require('../util/prefix-lines')
const stringifyError = require('../util/stringify-error')

const proxyChannel = type => {
  const log = console[type].bind(console)
  return ({ target, data }) => {
    for (const line of prefixLines(data.toString(), `${target}: `)) {
      log(line)
    }
  }
}

const setUpReporter = master => {
  master
    .on(E.stdout, proxyChannel('info'))
    .on(E.stderr, proxyChannel('warn'))
    .on(E.fail, ({ error }) => {
      console.error(stringifyError(error))
    })
}

module.exports = setUpReporter
