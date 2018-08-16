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

const setUpReporter = bundler => {
  bundler
    .on('stdout', proxyChannel('info'))
    .on('stderr', proxyChannel('warn'))
    .on('fail', ({ error }) => {
      console.error(stringifyError(error))
    })
}

module.exports = setUpReporter
