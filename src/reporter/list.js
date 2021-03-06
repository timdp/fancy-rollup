import { cyan, dim, green, red } from 'chalk'
import Listr from 'listr'
import prettyBytes from 'pretty-bytes'
import Observable from 'zen-observable'
import { EOL } from 'os'
import E from '../constants/events'
import formatDuration from '../util/format-duration'
import stringifyError from '../util/stringify-error'
import BuildFailedError from '../error/build-failed'

const STATE_PENDING = 'pending'
const STATE_RUNNING = 'running'
const STATE_SUCCEEDED = 'succeeded'
const STATE_FAILED = 'failed'

const RENDER_INTERVAL = 250

const titleRenderers = {
  [STATE_PENDING]: ({ target }) => dim(target),
  [STATE_RUNNING]: ({ target, startTime }) =>
    target + ' ' + cyan(formatDuration(Date.now() - startTime)),
  [STATE_SUCCEEDED]: ({ target, totalTime, observer }, metrics) => {
    const title = green(target) + ' ' + cyan(formatDuration(totalTime, true))
    const { raw, gzipped } = metrics.computeBuildSize(target)
    if (isNaN(raw) || isNaN(gzipped)) {
      return title
    } else {
      const sizeLabel =
        dim('raw ') + prettyBytes(raw) + dim(' gz ') + prettyBytes(gzipped)
      return title + dim(' → ') + sizeLabel
    }
  },
  [STATE_FAILED]: ({ target, totalTime }) =>
    red(target) + ' ' + cyan(formatDuration(totalTime, true))
}

const updateTitle = metrics => meta => {
  meta.task.title = titleRenderers[meta.state](meta, metrics)
}

const complete = updateTitle => (meta, error = null) => {
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

export default {
  isSupported: () => process.stdout.isTTY,

  install: master => {
    const { metrics } = master
    const _updateTitle = updateTitle(metrics)
    const _complete = complete(_updateTitle)
    const listrTasks = []
    const taskData = {}
    const startTimes = {}
    let stderr = ''
    master
      .on(E.skip, ({ target }) => {
        listrTasks.push({
          title: target,
          skip: () => true,
          task: () => {}
        })
      })
      .on(E.startAll, () => {
        for (const { target } of master.queue) {
          listrTasks.push({
            title: target,
            task: (ctx, task) =>
              new Observable(observer => {
                const startTime = startTimes[target]
                delete startTimes[target]
                const meta = createTaskData(target, task, observer, startTime)
                taskData[target] = meta
                _updateTitle(meta)
              })
          })
        }
        new Listr(listrTasks, { concurrent: true, exitOnError: false }).run()
        setInterval(() => {
          for (const meta of Object.values(taskData)) {
            _updateTitle(meta)
          }
        }, RENDER_INTERVAL).unref()
      })
      .on(E.startOne, ({ target }) => {
        const now = Date.now()
        const meta = taskData[target]
        // Listr starts observing asynchronously, so our first couple of builds
        // won't have been registered yet. As a workaround, we cache task start
        // times and then apply them when the observer gets created.
        if (meta != null) {
          meta.state = STATE_RUNNING
          meta.startTime = now
          _updateTitle(meta)
        } else {
          startTimes[target] = now
        }
      })
      .on(E.finishOne, ({ target }) => {
        _complete(taskData[target])
      })
      .on(E.stderr, ({ target, data }) => {
        stderr += data.toString()
      })
      .on(E.fatal, ({ error }) => {
        if (error instanceof BuildFailedError) {
          // FIXME Listr receives this error synchronously, but because it
          // turns the Observable into a Promise internally, the error handler
          // is async and it doesn't fire before the call to process.exit().
          // Therefore, this call currently doesn't actually change the output.
          // Issue: https://github.com/SamVerschueren/listr/issues/104
          _complete(taskData[error.target], error)
        }
        stderr += EOL + stringifyError(error)
        console.error(red(stderr))
      })
  }
}
