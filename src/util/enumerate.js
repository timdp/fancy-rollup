const enumerate = keys => {
  const out = {}
  for (const key of keys) {
    out[key] = key
  }
  return out
}

export default enumerate
