const { cyan } = require('chalk')
const logUpdate = require('log-update')
const formatDuration = require('../util/format-duration')
const stringifyError = require('../util/stringify-error')

const UPDATE_INTERVAL = 250

const updateOutput = bundler => {
  const { metrics } = bundler
  const {
    startTime,
    totalTaskCount,
    runningTaskCount,
    completedTaskCount
  } = metrics
  const elapsedTime = Date.now() - startTime
  const done = completedTaskCount === totalTaskCount
  const keyValue = []
  if (done) {
    keyValue.push(
      ['completed', completedTaskCount],
      ['time', formatDuration(elapsedTime, true)]
    )
  } else {
    keyValue.push(
      ['completed', `${completedTaskCount}/${totalTaskCount}`],
      ['active', runningTaskCount],
      ['elapsed', formatDuration(elapsedTime)]
    )
    if (completedTaskCount > 0) {
      const remainingMs = metrics.estimateRemainingTime()
      keyValue.push(['remaining', formatDuration(remainingMs)])
    }
  }
  logUpdate(keyValue.map(([k, v]) => `${k}: ${cyan(v)}`).join('  '))
}

const startUpdating = bundler => {
  setInterval(() => {
    updateOutput(bundler)
  }, UPDATE_INTERVAL).unref()
}

const setUpReporter = bundler => {
  bundler
    .on('init', () => {
      logUpdate('initializing ...')
    })
    .on('startAll', () => {
      startUpdating(bundler)
    })
    .on('done', () => {
      updateOutput(bundler)
    })
    .on('fatal', ({ error }) => {
      logUpdate.clear()
      console.error(stringifyError(error))
    })
}

module.exports = setUpReporter
