const { cyan, dim, green, red } = require('chalk')
const Listr = require('listr')
const Observable = require('zen-observable')
const { EOL } = require('os')
const formatDuration = require('../util/format-duration')
const stringifyError = require('../util/stringify-error')
const BundlingFailedError = require('../error/bundling-failed')

const STATE_PENDING = 'pending'
const STATE_RUNNING = 'running'
const STATE_SUCCEEDED = 'succeeded'
const STATE_FAILED = 'failed'

const COLORS = {
  [STATE_PENDING]: dim,
  [STATE_RUNNING]: null,
  [STATE_SUCCEEDED]: green,
  [STATE_FAILED]: red
}

const RENDER_INTERVAL = 250

const updateTitle = ({ target, task, startTime, totalTime, state }) => {
  const color = COLORS[state]
  const coloredTitle = color != null ? color(target) : target
  const time =
    totalTime != null
      ? totalTime
      : startTime != null ? Date.now() - startTime : null
  const timeSuffix =
    time != null
      ? ' ' + cyan(formatDuration(time, state !== STATE_RUNNING))
      : ''
  task.title = coloredTitle + timeSuffix
}

const complete = (meta, error = null) => {
  meta.totalTime = Date.now() - meta.startTime
  if (error != null) {
    meta.state = STATE_FAILED
    meta.observer.error(error)
  } else {
    meta.state = STATE_SUCCEEDED
    meta.observer.complete()
  }
  updateTitle(meta)
}

const createTaskData = (target, task, observer, startTime) => ({
  state: startTime != null ? STATE_RUNNING : STATE_PENDING,
  target,
  task,
  observer,
  startTime,
  totalTime: null
})

const setUpReporter = master => {
  const listrTasks = []
  const taskData = {}
  const startTimes = {}
  let stderr = ''
  master
    .on('skip', ({ target }) => {
      listrTasks.push({
        title: target,
        skip: () => true,
        task: () => {}
      })
    })
    .on('startAll', () => {
      for (const { target } of master.queue) {
        listrTasks.push({
          title: target,
          task: (ctx, task) =>
            new Observable(observer => {
              const startTime = startTimes[target]
              delete startTimes[target]
              const meta = createTaskData(target, task, observer, startTime)
              taskData[target] = meta
              updateTitle(meta)
            })
        })
      }
      new Listr(listrTasks, { concurrent: true, exitOnError: false }).run()
      setInterval(() => {
        for (const meta of Object.values(taskData)) {
          updateTitle(meta)
        }
      }, RENDER_INTERVAL).unref()
    })
    .on('startOne', ({ target }) => {
      const now = Date.now()
      const meta = taskData[target]
      // Listr starts observing asynchronously, so our first couple of builds
      // won't have been registered yet. As a workaround, we cache task start
      // times and then apply them when the observer gets created.
      if (meta != null) {
        meta.state = STATE_RUNNING
        meta.startTime = now
        updateTitle(meta)
      } else {
        startTimes[target] = now
      }
    })
    .on('finishOne', ({ target }) => {
      complete(taskData[target])
    })
    .on('stderr', ({ target, data }) => {
      stderr += data.toString()
    })
    .on('fatal', ({ error }) => {
      if (error instanceof BundlingFailedError) {
        // FIXME Listr receives this error synchronously, but because it turns
        // the Observable into a Promise internally, the error handler is async
        // and it doesn't fire before the call to process.exit(). Therefore,
        // this call currently doesn't actually change the output.
        // Issue: https://github.com/SamVerschueren/listr/issues/104
        complete(taskData[error.target], error)
      }
      stderr += EOL + stringifyError(error)
      console.error(red(stderr))
    })
}

module.exports = setUpReporter
