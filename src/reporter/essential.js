import E from '../constants/events'
import prefixLines from '../util/prefix-lines'
import stringifyError from '../util/stringify-error'

const proxyChannel = type => {
  const log = console[type].bind(console)
  return ({ target, data }) => {
    for (const line of prefixLines(data.toString(), `${target}: `)) {
      log(line)
    }
  }
}

export default {
  isSupported: () => true,

  install: master => {
    master
      .on(E.stdout, proxyChannel('info'))
      .on(E.stderr, proxyChannel('warn'))
      .on(E.fail, ({ error }) => {
        console.error(stringifyError(error))
      })
  }
}
