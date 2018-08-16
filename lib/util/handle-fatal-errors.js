const BundlerError = require('../error/base')

const handleFatalErrors = acceptError => {
  const onFatal = error => {
    try {
      acceptError(error)
    } catch (_) {}
    const code = error instanceof BundlerError ? error.code : 127
    process.exit(code)
  }
  process.on('uncaughtException', onFatal)
  process.on('unhandledRejection', onFatal)
}

module.exports = handleFatalErrors
