const { dim } = require('chalk')
const relative = require('require-relative')
const { EOL } = require('os')
const M = require('./constants/messages')
const handleFatalErrors = require('./util/handle-fatal-errors')
const logFatalError = require('./util/log-fatal-error')
const logWithMetadata = require('./util/log-with-metadata')
const readRollupConfig = require('./util/read-rollup-config')

const warnWithMetadata = logWithMetadata('warn')

const resolveRollup = cwd => {
  let rollup
  try {
    rollup = relative('rollup', cwd)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err
    }
    rollup = require('rollup')
  }
  return rollup
}

const defaultOnwarn = ({ code, loc, frame, message }) => {
  const fullMessage = message + (code != null ? dim(` [${code}]`) : '')
  const metadata = []
  if (loc != null) {
    metadata.push([
      'Location',
      `${loc.file}${EOL}line ${loc.line}, column ${loc.column}`
    ])
    if (frame != null) {
      metadata.push(['Code', frame])
    }
  }
  warnWithMetadata(fullMessage, metadata)
}

const buildAndRespond = async (rollup, target, config) => {
  let error = null
  try {
    const bundle = await rollup.rollup(config)
    await bundle.write(config.output)
  } catch (err) {
    logFatalError(target, err)
    error = 'Build failed'
  }
  process.send({ type: M.result, detail: { error } })
}

const createContext = () => {
  const { cwd, configPath } = JSON.parse(process.env.FANCY_ROLLUP_CONFIG)
  const rollup = resolveRollup(cwd)
  const configs = readRollupConfig(configPath)
  return { rollup, configs }
}

const createHandlers = () => {
  const { rollup, configs } = createContext()
  return {
    [M.build]: ({ target }) => {
      const config = configs[target]
      if (config.onwarn == null) {
        config.onwarn = defaultOnwarn
      }
      buildAndRespond(rollup, target, config)
    },
    [M.exit]: () => {
      process.exit(0)
    }
  }
}

const runWorker = () => {
  handleFatalErrors(error => {
    console.error(error)
  })
  const handlers = createHandlers()
  process.on('message', ({ type, detail }) => {
    handlers[type](detail)
  })
  process.send({ type: M.ready })
}

module.exports = runWorker
