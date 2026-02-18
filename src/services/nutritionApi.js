/**
 * Open Food Facts API - no key required.
 * Search focuses on Australia & New Zealand when possible; falls back to world search.
 * In dev we use a Vite proxy (/api/off) to avoid CORS.
 * https://wiki.openfoodfacts.org/API/Read/Search
 */

const OFF_ORIGIN = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  ? '' // use relative URL so Vite proxy /api/off -> world.openfoodfacts.org is used
  : 'https://world.openfoodfacts.org'

const SEARCH_PATH = '/cgi/search.pl'
const PRODUCT_PATH = '/api/v2/product'

/** Stop words to remove so "harriways sultana and apple" -> "harriways sultana apple". */
const STOP_WORDS = new Set(['and', 'the', 'with', 'or', '&', 'in', 'for'])

/**
 * Normalize search query: lowercase, collapse spaces, drop stop words.
 * Makes "Harriways Sultana and Apple" -> "harriways sultana apple" for better matching.
 */
function normalizeQuery(q) {
  if (!q || typeof q !== 'string') return ''
  return q
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .join(' ')
}

/**
 * Variants of the query to try (full phrase first, then fewer terms) for fallback search.
 * e.g. "harriways sultana apple" -> ["harriways sultana apple", "harriways sultana", "harriways"]
 */
function getQueryVariants(normalized) {
  const words = normalized.split(/\s+/).filter(Boolean)
  const variants = []
  for (let i = words.length; i >= 1; i--) {
    variants.push(words.slice(0, i).join(' '))
  }
  return [...new Set(variants)]
}

/**
 * Normalize for comparison: lowercase, collapse spaces, strip punctuation.
 */
function norm(s) {
  if (!s || typeof s !== 'string') return ''
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get words from string (for word-count and order checks).
 */
function getWords(s) {
  return norm(s).split(/\s+/).filter(Boolean)
}

/**
 * Canonical whole foods: when the user searches exactly (or nearly) these terms, we always show
 * a single-ingredient option first with standard per-100g nutrition, so "banana" → Banana, raw.
 * (Open Food Facts often returns banana bread, chips, etc.; this guarantees the simple option.)
 */
const CANONICAL_WHOLE_FOODS = [
  { keys: ['banana', 'bananas'], name: 'Banana, raw', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugars: 12 },
  { keys: ['apple', 'apples'], name: 'Apple, raw', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugars: 10 },
  { keys: ['orange', 'oranges'], name: 'Orange, raw', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugars: 9 },
  { keys: ['egg', 'eggs'], name: 'Egg, whole raw', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { keys: ['avocado', 'avocados'], name: 'Avocado, raw', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
  { keys: ['carrot', 'carrots'], name: 'Carrot, raw', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
  { keys: ['broccoli'], name: 'Broccoli, raw', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { keys: ['chicken', 'chicken breast'], name: 'Chicken breast, raw', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { keys: ['rice'], name: 'Rice, white cooked', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { keys: ['oat', 'oats'], name: 'Oats, raw', calories: 389, protein: 17, carbs: 66, fat: 6.9, fiber: 11 },
]

function getCanonicalMatch(normalizedQuery) {
  const single = normalizedQuery.split(/\s+/).filter(Boolean)
  if (single.length !== 1) return null
  const term = single[0].toLowerCase()
  const found = CANONICAL_WHOLE_FOODS.find((c) => c.keys.some((k) => k === term || term === k))
  if (!found) return null
  return {
    id: `canonical-${found.keys[0]}`,
    name: found.name,
    brand: '',
    quantity: 100,
    calories: found.calories,
    protein: found.protein,
    carbs: found.carbs,
    fat: found.fat,
    ...(found.fiber != null ? { fiber: found.fiber } : {}),
    ...(found.sugars != null ? { sugars: found.sugars } : {}),
    barcode: null,
  }
}

/** Words that suggest a composite/processed product; for single-word queries we down-rank these. */
const COMPOSITE_WORDS = new Set([
  'bread', 'chips', 'crisps', 'smoothie', 'pudding', 'cake', 'muffin', 'cereal', 'yogurt', 'yoghurt',
  'ice', 'cream', 'pie', 'cookie', 'biscuit', 'bar', 'drink', 'juice', 'sauce', 'spread', 'dip',
  'loaf', 'roll', 'bagel', 'cracker', 'wafer', 'candy', 'chocolate', 'milk', 'powder', 'mix',
  'frozen', 'dried', 'canned', 'crispy', 'flakes', 'puffs', 'rings', 'sticks', 'bites',
])

/**
 * MyFitnessPal-style relevance: rank so "banana" → single banana first, then banana smoothie;
 * "bbq chicken katsu panini" → items that match the whole phrase / meal best.
 * Higher score = better match.
 */
function relevanceScore(result, rawQuery, queryTerms) {
  const name = (result.name || '').trim()
  const brand = (result.brand || '').trim()
  const nameNorm = norm(name)
  const queryNorm = norm(rawQuery)
  const nameWords = getWords(name)
  const text = `${nameNorm} ${norm(brand)}`
  let score = 0

  if (!queryTerms.length) return 0

  const termRatio = queryTerms.filter((t) => t.length > 0 && text.includes(t)).length / queryTerms.length
  score += termRatio * 25

  if (nameNorm === queryNorm) score += 80
  else if (nameNorm.startsWith(queryNorm) || nameNorm.includes(' ' + queryNorm)) score += 50
  else if (queryNorm.length >= 2 && nameNorm.includes(queryNorm)) score += 40

  const allTermsInName = queryTerms.every((t) => nameNorm.includes(t))
  if (allTermsInName) score += 30

  const termsInOrder = (() => {
    let idx = 0
    for (const t of queryTerms) {
      const i = nameNorm.indexOf(t, idx)
      if (i === -1) return false
      idx = i + t.length
    }
    return true
  })()
  if (termsInOrder) score += 20

  if (queryTerms.length >= 1 && nameWords.length >= 1 && nameWords[0] === queryTerms[0]) score += 25

  if (queryTerms.length <= 2 && nameWords.length >= 1) {
    const simplicity = Math.max(0, 22 - nameWords.length * 6)
    score += simplicity
  }

  if (nameNorm.endsWith(', raw') || nameNorm.endsWith(' raw') || /^[^,]+,\s*raw\b/.test(nameNorm)) {
    if (queryTerms.length <= 2) score += 15
  }

  // Single-word query (e.g. "banana"): strongly prefer the whole food, not banana bread/chips/smoothie
  if (queryTerms.length === 1) {
    const firstWord = queryTerms[0]
    const nameIsJustIngredient = nameWords.length === 1 && nameWords[0] === firstWord
    const nameIsIngredientRaw = nameWords.length === 2 && nameWords[0] === firstWord && nameWords[1] === 'raw'
    if (nameIsJustIngredient || nameIsIngredientRaw) score += 50
    const hasCompositeWord = nameWords.some((w) => COMPOSITE_WORDS.has(w))
    if (hasCompositeWord) score -= 35
  }

  return score
}

function parseNutriments(product, quantityGrams = 100) {
  const scale = quantityGrams / 100
  const n = product.nutriments || {}
  let calories = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? n.energy_kcal
  if (calories == null && (n['energy-kj_100g'] ?? n['energy_100g']) != null) {
    const kj = n['energy-kj_100g'] ?? n['energy_100g'] ?? 0
    calories = kj / 4.184
  }
  calories = Math.round((calories ?? 0) * scale)
  const sodiumG = n.sodium_100g ?? n.sodium
  const sodiumMg = sodiumG != null ? Math.round(sodiumG * 1000 * scale) : null
  const sugarsG = (n.sugars_100g ?? n.sugars) != null ? Math.round((n.sugars_100g ?? n.sugars) * scale * 10) / 10 : null
  const saturatedFatG = (n['saturated-fat_100g'] ?? n['saturated-fat'] ?? n.saturated_fat) != null ? Math.round((n['saturated-fat_100g'] ?? n['saturated-fat'] ?? n.saturated_fat) * scale * 10) / 10 : null
  const fiberG = (n.fiber_100g ?? n.fiber) != null ? Math.round((n.fiber_100g ?? n.fiber) * scale * 10) / 10 : null
  return {
    calories,
    protein: Math.round((n.proteins_100g ?? n.proteins ?? 0) * scale * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? n.carbohydrates ?? 0) * scale * 10) / 10,
    fat: Math.round((n.fat_100g ?? n.fat ?? 0) * scale * 10) / 10,
    ...(sodiumMg != null && sodiumMg >= 0 ? { sodium: sodiumMg } : {}),
    ...(sugarsG != null && sugarsG >= 0 ? { sugars: sugarsG } : {}),
    ...(saturatedFatG != null && saturatedFatG >= 0 ? { saturatedFat: saturatedFatG } : {}),
    ...(fiberG != null && fiberG >= 0 ? { fiber: fiberG } : {}),
  }
}

function productToResult(p) {
  return {
    id: p.code || p._id,
    name: p.product_name,
    brand: p.brands || '',
    quantity: 100,
    ...parseNutriments(p, 100),
    barcode: p.code,
  }
}

/**
 * Run one search (world or with optional country filter).
 * Uses proxy in dev: fetch('/api/off/cgi/search.pl?...') -> world.openfoodfacts.org
 */
async function searchOnce(query, pageSize, countryTag = null) {
  const base = OFF_ORIGIN || ''
  const path = base ? `${base}${SEARCH_PATH}` : `/api/off${SEARCH_PATH}`
  const params = new URLSearchParams({
    search_terms: query.trim(),
    json: 1,
    page_size: String(Math.min(Number(pageSize) || 24, 24)),
  })
  if (countryTag) {
    params.set('tagtype_0', 'countries')
    params.set('tag_contains_0', 'contains')
    params.set('tag_0', countryTag)
  }
  const url = `${path}?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json().catch(() => ({}))
  const raw = data.products ?? data.results ?? []
  const products = raw.filter((p) => p && (p.product_name || p.product_name_en))
  return products.map((p) => {
    const name = p.product_name || p.product_name_en || 'Unknown'
    return productToResult({ ...p, product_name: name })
  })
}

const DEFAULT_SEARCH_LIMIT = 10
const SEARCH_POOL_SIZE = 24

/**
 * Search foods: prefer Australia & New Zealand, then world.
 * Returns the top N results ranked MyFitnessPal-style:
 * - Meal-style query (e.g. "bbq chicken katsu panini") → best phrase/term-order match first.
 * - Single item (e.g. "banana") → singular option first (e.g. Banana), then banana smoothie, etc.
 */
export async function searchFood(query, limit = DEFAULT_SEARCH_LIMIT) {
  const raw = query?.trim()
  if (!raw) return []
  const normalized = normalizeQuery(raw)
  const searchTerms = normalized.split(/\s+/).filter(Boolean)
  const variants = getQueryVariants(normalized)
  const seen = new Set()
  let merged = []

  function addResults(results) {
    for (const r of results) {
      const id = r.id || r.barcode || r.name
      if (seen.has(id)) continue
      seen.add(id)
      merged.push(r)
    }
  }

  const queryToTry = variants[0] || raw
  const isSingleWord = searchTerms.length === 1

  try {
    const [auResults, nzResults] = await Promise.all([
      searchOnce(queryToTry, SEARCH_POOL_SIZE, 'en:Australia'),
      searchOnce(queryToTry, SEARCH_POOL_SIZE, 'en:new-zealand'),
    ])
    addResults(auResults)
    addResults(nzResults)
    if (merged.length < limit * 2) {
      const world = await searchOnce(queryToTry, SEARCH_POOL_SIZE, null)
      addResults(world)
    }
    // For single-word queries (e.g. "banana"), also search "{term} raw" to get whole-food entries
    if (isSingleWord && searchTerms[0].length >= 2) {
      const rawQuery = `${searchTerms[0]} raw`
      try {
        const rawWorld = await searchOnce(rawQuery, 12, null)
        addResults(rawWorld)
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    const world = await searchOnce(queryToTry, SEARCH_POOL_SIZE, null)
    addResults(world)
  }

  if (merged.length === 0 && variants.length > 1) {
    for (let i = 1; i < variants.length; i++) {
      try {
        const fallback = await searchOnce(variants[i], SEARCH_POOL_SIZE, null)
        addResults(fallback)
        if (merged.length >= limit * 2) break
      } catch (_) {
        /* try next variant */
      }
    }
  }

  if (searchTerms.length > 0) {
    merged.sort((a, b) => relevanceScore(b, raw, searchTerms) - relevanceScore(a, raw, searchTerms))
  }

  const canonical = getCanonicalMatch(normalized)
  if (canonical) {
    const canonNorm = norm(canonical.name)
    const rest = merged.filter((r) => norm(r.name) !== canonNorm && r.id !== canonical.id).slice(0, limit - 1)
    return [canonical, ...rest]
  }
  return merged.slice(0, limit)
}

export async function getProductByBarcode(barcode) {
  if (!barcode?.trim()) return null
  const base = OFF_ORIGIN || ''
  const path = base ? `${base}${PRODUCT_PATH}` : `/api/off${PRODUCT_PATH}`
  const res = await fetch(`${path}/${barcode.trim()}.json`)
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  const product = data.product
  if (!product?.product_name) return null
  return {
    id: product.code,
    name: product.product_name,
    brand: product.brands || '',
    quantity: 100,
    ...parseNutriments(product, 100),
    barcode: product.code,
  }
}
