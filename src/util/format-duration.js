const formatDuration = (ms, precise = false) =>
  (ms / 1000).toFixed(precise ? 1 : 0) + 's'

export default formatDuration
