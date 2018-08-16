const fs = require('fs')
const path = require('path')

const EXT = '.js'

const listModules = dir =>
  fs
    .readdirSync(dir)
    .filter(filename => path.extname(filename) === EXT)
    .map(filename => path.basename(filename, EXT))
    .sort()

module.exports = listModules
