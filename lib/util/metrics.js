const mem = require('mem')
const { mean } = require('stats-lite')
const fs = require('fs')
const { gzipSync, constants: { Z_BEST_COMPRESSION } } = require('zlib')
const E = require('../constants/events')

const OVERSHOOT = 1.25

const _index = Symbol('index')

class Metrics {
  constructor (master) {
    this._master = master
    this._totalTaskCount = 0
    this._runningTaskCount = 0
    this._taskTimes = []
    this._startTime = null
    this._workerStartTimes = null
    this._outputFiles = {}
    this.computeBuildSize = mem(this.computeBuildSize).bind(this)
    this._addListeners()
  }

  get totalTaskCount () {
    return this._totalTaskCount
  }

  get runningTaskCount () {
    return this._runningTaskCount
  }

  get completedTaskCount () {
    return this._taskTimes.length
  }

  get startTime () {
    return this._startTime
  }

  _addListeners () {
    this._master
      .on(E.enqueue, ({ target, config }) => {
        this._outputFiles[target] = config.output.file
      })
      .on(E.startAll, () => {
        const { queue, workers } = this._master
        this._totalTaskCount = queue.length
        for (let i = 0; i < workers.length; ++i) {
          workers[i][_index] = i
        }
        this._workerStartTimes = workers.map(() => null)
        this._startTime = Date.now()
      })
      .on(E.startOne, ({ worker }) => {
        ++this._runningTaskCount
        this._workerStartTimes[worker[_index]] = Date.now()
      })
      .on(E.finishOne, ({ worker }) => {
        const endTime = Date.now()
        const startTime = this._workerStartTimes[worker[_index]]
        const elapsed = endTime - startTime
        this._taskTimes.push(elapsed)
        --this._runningTaskCount
      })
  }

  estimateRemainingTime () {
    if (this._workerStartTimes == null) {
      return null
    }
    const now = Date.now()
    const neutralTaskTimeEstimate = mean(this._taskTimes)
    const maxTaskTime = Math.max(...this._taskTimes)
    const slowerTaskTimes = this._workerStartTimes
      .filter(Boolean)
      .map(startTime => now - startTime)
      .filter(elapsed => elapsed > maxTaskTime)
    const pessimisticTaskTimeEstimate = mean([
      ...this._taskTimes,
      ...slowerTaskTimes.map(time => time * OVERSHOOT)
    ])
    const workerRemainingTimes = this._workerStartTimes.map(
      startTime =>
        startTime != null
          ? Math.max(0, pessimisticTaskTimeEstimate - (now - startTime))
          : 0
    )
    const unstartedTaskCount =
      this._totalTaskCount - this.completedTaskCount - this._runningTaskCount
    for (let i = 0; i < unstartedTaskCount; ++i) {
      const index = workerRemainingTimes.reduce(
        (nextAvail, remaining, idx) =>
          remaining < workerRemainingTimes[nextAvail] ? idx : nextAvail,
        0
      )
      workerRemainingTimes[index] += neutralTaskTimeEstimate
    }
    return Math.max(...workerRemainingTimes)
  }

  computeBuildSize (target) {
    const file = this._outputFiles[target]
    let raw = NaN
    let gzipped = NaN
    try {
      raw = fs.statSync(file).size
      const data = fs.readFileSync(file)
      gzipped = gzipSync(data, { level: Z_BEST_COMPRESSION }).length
    } catch (_) {}
    return {
      raw,
      gzipped
    }
  }
}

module.exports = Metrics
