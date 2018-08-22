import splitLines from 'split-lines'
import { EOL } from 'os'

const prefixLines = (str, prefix) => {
  const lines = splitLines(str)
  if (str.endsWith(EOL)) {
    lines.pop()
  }
  return lines.map(line => prefix + line)
}

export default prefixLines
