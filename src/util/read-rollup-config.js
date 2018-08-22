import esm from 'esm'
import path from 'path'

const esRequire = esm(module)

const isObject = val => val != null && typeof val === 'object'

const ensureArray = obj => (Array.isArray(obj) ? obj : [obj])

const readRollupConfig = file => {
  const exp = esRequire(file)
  const rollupConfig = isObject(exp.default) ? exp.default : exp
  const configs = {}
  for (const config of ensureArray(rollupConfig)) {
    const { file } = config.output
    const target = path.basename(file, path.extname(file))
    configs[target] = config
  }
  return configs
}

export default readRollupConfig
