const BundlerError = require('./base')

class NothingToBuildError extends BundlerError {
  constructor () {
    super('Nothing to build', 15)
  }
}

module.exports = NothingToBuildError
