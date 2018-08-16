const BundlerError = require('../error/base')

const stringifyError = error =>
  error == null
    ? '' + error
    : error instanceof BundlerError
      ? error.message
      : error.stack != null ? '' + error.stack : '' + error

module.exports = stringifyError
