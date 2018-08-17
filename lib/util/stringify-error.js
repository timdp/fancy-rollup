const RuntimeError = require('../error/base')

const stringifyError = error =>
  error == null
    ? '' + error
    : error instanceof RuntimeError
      ? error.message
      : error.stack != null ? '' + error.stack : '' + error

module.exports = stringifyError
