const { rollup } = require('rollup')
const defer = require('p-defer')
const handleFatalErrors = require('./util/handle-fatal-errors')
const logFatalError = require('./util/log-fatal-error')
const readRollupConfig = require('./util/read-rollup-config')

const configureAndRunRollup = async config => {
  const bundle = await rollup(config)
  await bundle.write(config.output)
}

const bundleAndRespond = async (target, config) => {
  let error = null
  try {
    await configureAndRunRollup(config)
  } catch (err) {
    logFatalError(target, err)
    error = 'Build failed'
  }
  process.send({ type: 'result', detail: { error } })
}

const runWorker = () => {
  handleFatalErrors(error => {
    console.error(error)
  })
  const configs = readRollupConfig(process.env.FANCY_ROLLUP_CONFIG_PATH)
  const dfd = defer()
  process.on('message', ({ type, detail }) => {
    if (type === 'build') {
      const { target } = detail
      const config = configs[target]
      bundleAndRespond(target, config)
    } else if (type === 'exit') {
      dfd.resolve()
      process.exit(0)
    }
  })
  process.send({ type: 'ready' })
  return dfd.promise
}

module.exports = runWorker
