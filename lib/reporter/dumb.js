const createLoggingReporter = require('../util/create-logging-reporter')

const setUpReporter = master => {
  createLoggingReporter(master, ({ level, formatted }) => {
    console[level](formatted)
  })
}

module.exports = setUpReporter
