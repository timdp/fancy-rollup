const RuntimeError = require('./base')

class NothingToBuildError extends RuntimeError {
  constructor () {
    super('Nothing to build', 15)
  }
}

module.exports = NothingToBuildError
