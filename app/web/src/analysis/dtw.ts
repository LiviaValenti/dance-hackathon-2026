export type DtwResult = { cost: number; path: Array<[number, number]> }

/**
 * DTW with a Sakoe-Chiba band around the scaled diagonal.
 * windowRatio = band width as a share of the longest sequence.
 */
export function dtw<T>(a: T[], b: T[], dist: (x: T, y: T) => number, windowRatio = 0.25): DtwResult {
  const n = a.length, m = b.length
  if (n === 0 || m === 0) return { cost: Infinity, path: [] }
  const w = Math.max(1, Math.ceil(Math.max(n, m) * windowRatio))
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity))
  D[0][0] = 0
  for (let i = 1; i <= n; i++) {
    const center = Math.round((i * m) / n)
    const jFrom = Math.max(1, center - w)
    const jTo = Math.min(m, center + w)
    for (let j = jFrom; j <= jTo; j++) {
      D[i][j] = dist(a[i - 1], b[j - 1]) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1])
    }
  }
  const path: Array<[number, number]> = []
  let i = n, j = m
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1])
    const diag = D[i - 1][j - 1], up = D[i - 1][j], left = D[i][j - 1]
    if (diag <= up && diag <= left) { i--; j-- }
    else if (up < left) i--
    else j--
  }
  path.reverse()
  return { cost: D[n][m] / path.length, path }
}
