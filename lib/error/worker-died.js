const RuntimeError = require('./base')

class WorkerDiedError extends RuntimeError {
  constructor (worker, exitStatus, signal) {
    super(
      `Worker ${
        worker.id
      } exited: exit status = ${exitStatus}, signal = ${signal}`,
      63
    )
    this._worker = worker
    this._exitStatus = exitStatus
    this._signal = signal
  }

  get worker () {
    return this._worker
  }

  get exitStatus () {
    return this._exitStatus
  }

  get signal () {
    return this._signal
  }
}

module.exports = WorkerDiedError
