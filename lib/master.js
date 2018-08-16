const { supportsColor } = require('chalk')
const EventRegistry = require('event-registry')
const defer = require('p-defer')
const yargs = require('yargs')
const cluster = require('cluster')
const { EventEmitter } = require('events')
const os = require('os')
const path = require('path')
const BundlingFailedError = require('./error/bundling-failed')
const NothingToBuildError = require('./error/nothing-to-build')
const WorkerDiedError = require('./error/worker-died')
const handleFatalErrors = require('./util/handle-fatal-errors')
const listModules = require('./util/list-modules')
const Metrics = require('./util/metrics')
const readRollupConfig = require('./util/read-rollup-config')

const DEFAULT_REPORTER = process.stdout.isTTY ? 'interactive' : 'dumb'

class Bundler extends EventEmitter {
  constructor (targets, concurrency) {
    super()
    this._targets = targets
    this._concurrency = concurrency
    this._queue = []
    this._workers = []
    this._metrics = new Metrics(this)
    this._bundlingAll = null
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

  _loadReporter (name) {
    require(`./reporter/${name}`)(this)
  }

  async _run () {
    this.emit('init')
    this._populateQueue()
    if (this._queue.length === 0) {
      throw new NothingToBuildError()
    }
    await this._buildClustered()
  }

  _populateQueue () {
    const configs = readRollupConfig()
    for (const target of Object.keys(configs)) {
      if (this._targets.length > 0 && !this._targets.includes(target)) {
        this.emit('skip', { target })
      } else {
        this._queue.push({ target })
      }
    }
  }

  _buildClustered () {
    this._bundlingAll = defer()
    cluster.setupMaster({
      stdio: ['inherit', 'pipe', 'pipe', 'ipc']
    })
    const workerCount = Math.min(this._queue.length, this._concurrency)
    this._handleWorkerReady(workerCount)
    this._handleWorkerExit()
    this._forkWorkers(workerCount)
    return this._bundlingAll.promise
  }

  _forkWorkers (count) {
    this.emit('fork', { count })
    for (let i = 0; i < count; ++i) {
      cluster.fork({
        FORCE_COLOR: supportsColor ? 1 : 0
      })
    }
  }

  _handleWorkerReady (workerCount) {
    const onMessage = (worker, { type, detail }) => {
      if (type !== 'ready') {
        return
      }
      this.emit('workerReady', { worker })
      this._workers.push(worker)
      if (this._workers.length === workerCount) {
        cluster.removeListener('message', onMessage)
        this._bundleAll()
      }
    }
    cluster.on('message', onMessage)
  }

  _handleWorkerExit (onError) {
    cluster.on('exit', (worker, exitStatus, signal) => {
      if (exitStatus !== 0 || signal != null) {
        this._bundlingAll.reject(
          new WorkerDiedError(worker, exitStatus, signal)
        )
      }
    })
  }

  _bundleAll () {
    this._bundleAllAsync().then(() => {
      this.emit('done')
      this._bundlingAll.resolve()
    }, this._bundlingAll.reject)
  }

  async _bundleAllAsync () {
    this.emit('startAll')
    let error = null
    try {
      await Promise.all(this.workers.map(this._drainQueue.bind(this)))
    } catch (err) {
      error = err
    }
    if (error == null) {
      this.emit('finishAll')
    }
    for (const worker of this._workers) {
      try {
        worker.send({ type: 'exit' })
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
      this.emit('startOne', eventDetail)
      try {
        await this._bundleOne(worker, detail)
      } catch (err) {
        throw new BundlingFailedError(detail.target, err)
      }
      this.emit('finishOne', eventDetail)
    }
  }

  async _bundleOne (worker, detail) {
    const dfd = defer()
    const reg = new EventRegistry()
    const { stdout, stderr } = worker.process
    reg.on(stdout, 'data', this._createChannelListener(detail.target, 'stdout'))
    reg.on(stderr, 'data', this._createChannelListener(detail.target, 'stderr'))
    reg.on(worker, 'message', ({ type, detail }) => {
      if (type !== 'result') {
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
      worker.send({ type: 'bundle', detail })
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

const enumerateReporters = () => listModules(path.join(__dirname, 'reporter'))

const getOpts = availableReporters => {
  const { target: targets, concurrency, reporter: reporters } = yargs
    .option('t', {
      alias: 'target',
      describe: 'Select target(s) to bundle',
      type: 'array',
      requiresArg: true,
      default: []
    })
    .option('c', {
      alias: 'concurrency',
      describe: 'Limit number of concurrent builds',
      type: 'number',
      requiresArg: true,
      default: os.cpus().length
    })
    .option('r', {
      alias: 'reporter',
      describe: 'Select style(s) for reporting progress',
      type: 'array',
      requiresArg: true,
      choices: availableReporters,
      default: [DEFAULT_REPORTER]
    })
    .parse()
  return { targets, concurrency, reporters }
}

const runMaster = async () => {
  const availableReporters = enumerateReporters()
  const { targets, concurrency, reporters } = getOpts(availableReporters)
  const bundler = new Bundler(targets, concurrency)
  handleFatalErrors(error => {
    bundler.emit('fatal', { error })
  })
  for (const name of reporters) {
    bundler._loadReporter(name)
  }
  await bundler._run()
}

module.exports = runMaster
