const { cyan } = require('chalk')
const logUpdate = require('log-update')
const formatDuration = require('../util/format-duration')
const stringifyError = require('../util/stringify-error')

const UPDATE_INTERVAL = 250

const updateOutput = master => {
  const { metrics } = master
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

const startUpdating = master => {
  setInterval(() => {
    updateOutput(master)
  }, UPDATE_INTERVAL).unref()
}

const setUpReporter = master => {
  master
    .on('init', () => {
      logUpdate('initializing ...')
    })
    .on('startAll', () => {
      startUpdating(master)
    })
    .on('done', () => {
      updateOutput(master)
    })
    .on('fatal', ({ error }) => {
      logUpdate.clear()
      console.error(stringifyError(error))
    })
}

module.exports = setUpReporter
