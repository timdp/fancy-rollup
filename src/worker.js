import { dim } from 'chalk'
import relative from 'require-relative'
import { EOL } from 'os'
import M from './constants/messages'
import handleFatalErrors from './util/handle-fatal-errors'
import logFatalError from './util/log-fatal-error'
import logWithMetadata from './util/log-with-metadata'
import readRollupConfig from './util/read-rollup-config'

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

export default runWorker
