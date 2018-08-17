const RuntimeError = require('./base')

class BuildFailedError extends RuntimeError {
  constructor (target, cause) {
    super(`Build of target "${target}" failed: ${cause}`, 31)
    this._target = target
    this._cause = cause
  }

  get target () {
    return this._target
  }

  get cause () {
    return this._cause
  }
}

module.exports = BuildFailedError
