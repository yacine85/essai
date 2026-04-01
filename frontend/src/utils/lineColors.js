const FALLBACK_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
]

export function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

export function colorFromLineId(lineId) {
  const index = Number(lineId || 0) % FALLBACK_COLORS.length
  return FALLBACK_COLORS[index]
}

export function getLineColor(line) {
  if (line && isHexColor(line.color)) {
    return line.color
  }

  return colorFromLineId(line?.id)
}

export function buildLineColorMap(lines = []) {
  return lines.reduce((acc, line) => {
    acc[line.id] = getLineColor(line)
    return acc
  }, {})
}

export function getFallbackColors() {
  return [...FALLBACK_COLORS]
}
