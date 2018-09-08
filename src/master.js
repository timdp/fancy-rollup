import { supportsColor } from 'chalk'
import EventRegistry from 'event-registry'
import defer from 'p-defer'
import yargs from 'yargs'
import cluster from 'cluster'
import { EventEmitter } from 'events'
import os from 'os'
import path from 'path'
import E from './constants/events'
import M from './constants/messages'
import * as reporters from './reporters'
import BuildFailedError from './error/build-failed'
import NothingToBuildError from './error/nothing-to-build'
import WorkerDiedError from './error/worker-died'
import handleFatalErrors from './util/handle-fatal-errors'
import Metrics from './util/metrics'
import readRollupConfig from './util/read-rollup-config'

const DEFAULT_REPORTER = process.stdout.isTTY ? 'interactive' : 'dumb'

class Master extends EventEmitter {
  constructor (targets, configFile, concurrency) {
    super()
    this._targets = targets
    this._cwd = process.cwd()
    this._configPath = path.join(this._cwd, configFile)
    this._concurrency = concurrency
    this._queue = []
    this._workers = []
    this._metrics = new Metrics(this)
    this._buildingAll = null
  }

  get targets () {
    return this._targets
  }

  get concurrency () {
    return this._concurrency
  }

  get queue () {
    return this._queue
  }

  get workers () {
    return this._workers
  }

  get metrics () {
    return this._metrics
  }

  async _run () {
    this.emit(E.init)
    this._populateQueue()
    if (this._queue.length === 0) {
      throw new NothingToBuildError()
    }
    await this._buildClustered()
  }

  _populateQueue () {
    const configs = readRollupConfig(this._configPath)
    for (const [target, config] of Object.entries(configs)) {
      if (this._targets.length > 0 && !this._targets.includes(target)) {
        this.emit(E.skip, { target })
      } else {
        this._queue.push({ target })
        this.emit(E.enqueue, { target, config })
      }
    }
  }

  _buildClustered () {
    this._buildingAll = defer()
    cluster.setupMaster({
      stdio: ['inherit', 'pipe', 'pipe', 'ipc']
    })
    const workerCount = Math.min(this._queue.length, this._concurrency)
    this._handleWorkerReady(workerCount)
    this._handleWorkerExit()
    this._forkWorkers(workerCount)
    return this._buildingAll.promise
  }

  _forkWorkers (count) {
    this.emit(E.fork, { count })
    const config = JSON.stringify({
      cwd: this._cwd,
      configPath: this._configPath
    })
    for (let i = 0; i < count; ++i) {
      cluster.fork({
        FANCY_ROLLUP_CONFIG: config,
        FORCE_COLOR: supportsColor ? 1 : 0
      })
    }
  }

  _handleWorkerReady (workerCount) {
    const onMessage = (worker, { type, detail }) => {
      if (type !== M.ready) {
        return
      }
      this.emit(E.workerReady, { worker })
      this._workers.push(worker)
      if (this._workers.length === workerCount) {
        cluster.removeListener('message', onMessage)
        this._buildAll()
      }
    }
    cluster.on('message', onMessage)
  }

  _handleWorkerExit (onError) {
    cluster.on('exit', (worker, exitStatus, signal) => {
      if (exitStatus !== 0 || signal != null) {
        this._buildingAll.reject(
          new WorkerDiedError(worker, exitStatus, signal)
        )
      }
    })
  }

  _buildAll () {
    this._buildAllAsync().then(() => {
      this.emit(E.done)
      this._buildingAll.resolve()
    }, this._buildingAll.reject)
  }

  async _buildAllAsync () {
    this.emit(E.startAll)
    let error = null
    try {
      await Promise.all(this.workers.map(this._drainQueue.bind(this)))
    } catch (err) {
      error = err
    }
    if (error == null) {
      this.emit(E.finishAll)
    }
    for (const worker of this._workers) {
      try {
        worker.send({ type: M.exit })
      } catch (_) {}
    }
    if (error != null) {
      throw error
    }
  }

  async _drainQueue (worker) {
    while (this._queue.length > 0) {
      const detail = this._queue.shift()
      const eventDetail = Object.assign({ worker }, detail)
      this.emit(E.startOne, eventDetail)
      try {
        await this._buildOne(worker, detail)
      } catch (err) {
        throw new BuildFailedError(detail.target, err)
      }
      this.emit(E.finishOne, eventDetail)
    }
  }

  async _buildOne (worker, detail) {
    const dfd = defer()
    const reg = new EventRegistry()
    const { stdout, stderr } = worker.process
    reg.on(stdout, 'data', this._createChannelListener(detail.target, E.stdout))
    reg.on(stderr, 'data', this._createChannelListener(detail.target, E.stderr))
    reg.on(worker, 'message', ({ type, detail }) => {
      if (type !== M.result) {
        return
      }
      const { error } = detail
      if (error != null) {
        dfd.reject(new Error(error))
      } else {
        dfd.resolve()
      }
    })
    try {
      worker.send({ type: M.build, detail })
      await dfd.promise
    } finally {
      reg.clear()
    }
  }

  _createChannelListener (target, type) {
    return data => {
      this.emit(type, { target, data })
    }
  }
}

const getOpts = () => {
  const { target: targets, config: configFile, concurrency, reporter } = yargs
    .alias('v', 'version')
    .alias('h', 'help')
    .option('t', {
      alias: 'target',
      describe: 'Select target(s) to build',
      type: 'array',
      requiresArg: true,
      default: []
    })
    .option('c', {
      alias: 'config',
      describe: 'Specify config file name',
      type: 'string',
      requiresArg: true,
      default: 'rollup.config.js'
    })
    .option('p', {
      alias: 'concurrency',
      describe: 'Limit number of concurrent builds',
      type: 'number',
      requiresArg: true,
      default: os.cpus().length
    })
    .option('r', {
      alias: 'reporter',
      describe: 'Select style for reporting progress',
      type: 'string',
      requiresArg: true,
      choices: Object.entries(reporters)
        .filter(([, reporter]) => reporter.isSupported())
        .map(([name]) => name),
      default: DEFAULT_REPORTER
    })
    .strict()
    .parse()
  return { targets, configFile, concurrency, reporter }
}

const runMaster = async () => {
  const { targets, configFile, concurrency, reporter: reporterName } = getOpts()
  const master = new Master(targets, configFile, concurrency)
  handleFatalErrors(error => {
    master.emit(E.fatal, { error })
  })
  const reporter = reporters[reporterName]
  reporter.install(master)
  await master._run()
}

export default runMaster
