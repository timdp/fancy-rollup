import RuntimeError from './base'

class NothingToBuildError extends RuntimeError {
  constructor () {
    super('Nothing to build', 15)
  }
}

export default NothingToBuildError
