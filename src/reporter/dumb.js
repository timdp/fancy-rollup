import createLoggingReporter from '../util/create-logging-reporter'

export default {
  isSupported: () => true,

  install: master => {
    createLoggingReporter(master, ({ level, formatted }) => {
      console[level](formatted)
    })
  }
}
