import RuntimeError from '../error/base'

const stringifyError = error =>
  error == null
    ? '' + error
    : error instanceof RuntimeError
      ? error.message
      : error.stack != null ? '' + error.stack : '' + error

export default stringifyError
