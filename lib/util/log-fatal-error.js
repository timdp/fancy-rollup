const { red } = require('chalk')
const serializeError = require('serialize-error')
const logWithMetadata = require('./log-with-metadata')

const errWithMetadata = logWithMetadata('error')

const logFatalError = (target, error) => {
  const message = red(`Failed to build target "${target}"`)
  const metadata = []
  const serialized = serializeError(error)
  if (serialized.message != null) {
    metadata.push(['Message', serialized.message])
    delete serialized.message
  }
  if (typeof serialized.stack === 'string') {
    metadata.push(['Stack trace', serialized.stack])
    delete serialized.stack
  }
  const errorMeta = JSON.stringify(serialized, null, 2)
  if (errorMeta !== '{}') {
    metadata.push(['Metadata', errorMeta])
  }
  errWithMetadata(message, metadata)
}

module.exports = logFatalError
