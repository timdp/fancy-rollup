const createLoggingReporter = require('../util/create-logging-reporter')

const setUpReporter = bundler => {
  createLoggingReporter(bundler, ({ level, formatted }) => {
    console[level](formatted)
  })
}

module.exports = setUpReporter
