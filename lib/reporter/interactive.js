const blessed = require('blessed')
const createLoggingReporter = require('../util/create-logging-reporter')

const UPDATE_INTERVAL = 250

const formatDuration = ms => {
  const s = Math.floor(ms / 1000)
  const min = ('' + Math.floor(s / 60)).padStart(2, '0')
  const sec = ('' + s % 60).padStart(2, '0')
  return `${min}:${sec}`
}

const createLogPane = height => {
  const component = blessed.log({
    border: 'line',
    width: '100%',
    height
  })
  return {
    component,
    getContent () {
      return component.getContent()
    },
    add (msg) {
      component.add(msg)
    }
  }
}

const createProgressPane = width => {
  const height = 3
  const bar = blessed.progressbar({
    ch: '▇',
    width: '100%-5',
    top: 0,
    left: 0
  })
  const label = blessed.text({
    content: '0%',
    top: 0,
    right: 0
  })
  const component = blessed.box({
    border: 'line',
    width,
    height,
    bottom: 0
  })
  component.append(bar)
  component.append(label)
  return {
    component,
    height,
    setProgress (value) {
      bar.setProgress(value)
      const perc = Math.round(value)
      label.setContent(`${perc}%`)
    }
  }
}

const createTimePane = (prefix, right) => {
  const timeLength = formatDuration(0).length
  const width = prefix.length + timeLength + 2
  const height = 3
  const component = blessed.box({
    border: 'line',
    width,
    height,
    bottom: 0,
    right
  })
  const label = blessed.text({
    content: prefix + '--:--'
  })
  component.append(label)
  return {
    component,
    width,
    setValue (ms) {
      label.setContent(prefix + formatDuration(ms).padStart(timeLength, ' '))
    }
  }
}

const createUI = () => {
  const screen = blessed.screen({
    smartCSR: true
  })
  const remainingPane = createTimePane('ETA ', 0)
  screen.append(remainingPane.component)
  const elapsedPane = createTimePane('', remainingPane.width)
  elapsedPane.setValue(0)
  screen.append(elapsedPane.component)
  const availWidth = remainingPane.width + elapsedPane.width
  const progressPane = createProgressPane(`100%-${availWidth}`)
  screen.append(progressPane.component)
  const logPane = createLogPane(`100%-${progressPane.height}`)
  screen.append(logPane.component)
  process.on('exit', () => {
    const content = logPane.getContent()
    screen.destroy()
    console.log(content)
  })
  return {
    render () {
      screen.render()
    },
    log ({ formatted }) {
      logPane.add(formatted)
    },
    setProgress (value) {
      progressPane.setProgress(100 * value)
    },
    setElapsedTime (ms) {
      elapsedPane.setValue(ms)
    },
    setRemainingTime (ms) {
      remainingPane.setValue(ms)
    }
  }
}

const setUpReporter = bundler => {
  const { metrics } = bundler
  const ui = createUI()
  ui.render()
  createLoggingReporter(bundler, ui.log)
  bundler
    .on('startAll', () => {
      setInterval(() => {
        ui.setElapsedTime(Date.now() - metrics.startTime)
        if (metrics.completedTaskCount > 0) {
          ui.setRemainingTime(metrics.estimateRemainingTime())
        }
        ui.render()
      }, UPDATE_INTERVAL).unref()
    })
    .on('finishOne', () => {
      const { completedTaskCount, totalTaskCount } = metrics
      ui.setProgress(completedTaskCount / totalTaskCount)
    })
    .on('done', () => {
      process.exit()
    })
}

module.exports = setUpReporter
