const enumerate = require('../util/enumerate')

module.exports = enumerate([
  'init',
  'skip',
  'enqueue',
  'fork',
  'workerReady',
  'done',
  'fatal',
  'startAll',
  'finishAll',
  'startOne',
  'finishOne',
  'stdout',
  'stderr'
])
