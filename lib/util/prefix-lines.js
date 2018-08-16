const splitLines = require('split-lines')
const { EOL } = require('os')

const prefixLines = (str, prefix) => {
  const lines = splitLines(str)
  if (str.endsWith(EOL)) {
    lines.pop()
  }
  return lines.map(line => prefix + line)
}

module.exports = prefixLines
