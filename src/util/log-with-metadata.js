import { bold } from 'chalk'
import splitLines from 'split-lines'

const INDENT = '  '

const logMetadata = log => (label, text) => {
  log()
  log(bold(label + ':'))
  for (const line of splitLines(text)) {
    log(INDENT + line)
  }
}

const logWithMetadata = type => {
  const log = console[type].bind(console)
  const logMeta = logMetadata(log)
  return (message, metadata) => {
    log()
    log(message)
    for (const [label, text] of metadata) {
      logMeta(label, text)
    }
    log()
  }
}

export default logWithMetadata
