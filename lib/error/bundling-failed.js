const BundlerError = require('./base')

class BundlingFailedError extends BundlerError {
  constructor (target, cause) {
    super(`Bundling of target "${target}" failed: ${cause}`, 31)
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

module.exports = BundlingFailedError
