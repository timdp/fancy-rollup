import { cyan } from 'chalk'
import logUpdate from 'log-update'
import E from '../constants/events'
import formatDuration from '../util/format-duration'
import stringifyError from '../util/stringify-error'

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
    .on(E.init, () => {
      logUpdate('initializing ...')
    })
    .on(E.startAll, () => {
      startUpdating(master)
    })
    .on(E.done, () => {
      updateOutput(master)
    })
    .on(E.fatal, ({ error }) => {
      logUpdate.clear()
      console.error(stringifyError(error))
    })
}

export default setUpReporter
