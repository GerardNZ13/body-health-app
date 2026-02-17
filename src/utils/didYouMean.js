/**
 * Suggests a spelling correction based on what actually appears in search results.
 * e.g. User typed "harriways" but results show brand "Harraways" -> "Did you mean Harraways?"
 */

/** Levenshtein (edit) distance between two strings. */
function levenshtein(a, b) {
  if (!a.length) return b.length
  if (!b.length) return a.length
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j - 1],
          matrix[i][j - 1],
          matrix[i - 1][j]
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/** Words to ignore when comparing (too short or generic). */
const SKIP_WORDS = new Set(['the', 'and', 'with', 'for', 'oat', 'oats'])

/** Extract words from a string (letters only, min length 3 for spelling suggestions). */
function getWords(str, minLen = 3) {
  if (!str || typeof str !== 'string') return []
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= minLen)
}

/**
 * Find a "did you mean?" suggestion by comparing query words to names/brands in results.
 * Returns { wrong, right } to show "Did you mean Harraways?" and replace "harriways" in the query,
 * or null if no good suggestion.
 *
 * @param {string} userQuery - What the user typed (e.g. "harriways sultana")
 * @param {Array<{ name?: string, brand?: string }>} results - Search results
 * @returns {{ wrong: string, right: string } | null}
 */
export function getDidYouMeanSuggestion(userQuery, results) {
  if (!userQuery?.trim() || !results?.length) return null
  const queryWords = getWords(userQuery, 4)
  if (!queryWords.length) return null

  const candidates = []
  for (const r of results) {
    const text = [r.name, r.brand].filter(Boolean).join(' ')
    const words = getWords(text, 4)
    for (const word of words) {
      if (SKIP_WORDS.has(word.toLowerCase())) continue
      candidates.push({ word, from: r })
    }
  }

  for (const qw of queryWords) {
    if (SKIP_WORDS.has(qw)) continue
    const qLen = qw.length
    let best = null
    let bestDistance = 3
    let bestRight = null
    for (const { word } of candidates) {
      const wLower = word.toLowerCase()
      if (wLower === qw) continue
      const lenDiff = Math.abs(wLower.length - qLen)
      if (lenDiff > 2) continue
      const d = levenshtein(qw, wLower)
      if (d >= 1 && d <= 2 && d < bestDistance) {
        bestDistance = d
        best = qw
        bestRight = word
      }
    }
    if (best != null && bestRight != null) return { wrong: best, right: bestRight }
  }
  return null
}

/**
 * Replace the suggested wrong word with the right one in the query, preserving other words and rough casing.
 */
export function applyDidYouMean(userQuery, wrong, right) {
  if (!userQuery?.trim() || !wrong || !right) return userQuery
  const re = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
  return userQuery.trim().replace(re, right)
}
