const { bold, red } = require('chalk')
const serializeError = require('serialize-error')
const splitLines = require('split-lines')

const logMultiLineError = (label, text) => {
  console.error('')
  console.error(bold(label + ':'))
  for (const line of splitLines(text)) {
    console.error('  ' + line)
  }
}

const logFatalError = (target, error) => {
  console.error()
  console.error(red(`Failed to build target "${target}"`))
  const serialized = serializeError(error)
  if (serialized.message != null) {
    logMultiLineError('Message', serialized.message)
    delete serialized.message
  }
  if (typeof serialized.stack === 'string') {
    logMultiLineError('Stack trace', serialized.stack)
    delete serialized.stack
  }
  const metadata = JSON.stringify(serialized, null, 2)
  if (metadata !== '{}') {
    logMultiLineError('Metadata', metadata)
  }
  console.error()
}

module.exports = logFatalError
