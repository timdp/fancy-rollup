const path = require('path')

const ensureArray = obj => (Array.isArray(obj) ? obj : [obj])

const readRollupConfig = file => {
  const rollupConfig = require(file)
  const configs = {}
  for (const config of ensureArray(rollupConfig)) {
    const { file } = config.output
    const target = path.basename(file, path.extname(file))
    configs[target] = config
  }
  return configs
}

module.exports = readRollupConfig
