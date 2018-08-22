import createLoggingReporter from '../util/create-logging-reporter'

const setUpReporter = master => {
  createLoggingReporter(master, ({ level, formatted }) => {
    console[level](formatted)
  })
}

export default setUpReporter
