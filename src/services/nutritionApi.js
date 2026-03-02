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

/**
 * Parse Open Food Facts quantity (e.g. "250g", "250 g", "1 can (250g)") to total grams per pack/item.
 * @returns { number | null } grams per item/pack, or null if unparseable
 */
function parseQuantityToGrams(quantity) {
  if (!quantity || typeof quantity !== 'string') return null
  const s = String(quantity).trim()
  const match = s.match(/(\d+(?:[.,]\d+)?)\s*g(?:ram)?s?/i) || s.match(/(\d+(?:[.,]\d+)?)\s*g\b/i)
  if (match) {
    const g = parseFloat(match[1].replace(',', '.'))
    return g > 0 && g < 100000 ? Math.round(g * 10) / 10 : null
  }
  const numOnly = s.match(/^(\d+(?:[.,]\d+)?)\s*$/)
  if (numOnly) {
    const g = parseFloat(numOnly[1].replace(',', '.'))
    return g > 0 && g < 100000 ? Math.round(g * 10) / 10 : null
  }
  return null
}

/**
 * Parse Open Food Facts serving_size (e.g. "25 g", "1 bar (25g)", "40g") to grams.
 * @returns { number | null } grams per serving, or null if unparseable
 */
function parseServingSizeGrams(servingSize) {
  if (!servingSize || typeof servingSize !== 'string') return null
  const s = servingSize.trim()
  // Match number optionally followed by "g" or "gram(s)", or number in parens like "(25g)"
  const match = s.match(/(\d+(?:[.,]\d+)?)\s*g(?:ram)?s?/i) || s.match(/(\d+(?:[.,]\d+)?)\s*g\b/i)
  if (match) {
    const g = parseFloat(match[1].replace(',', '.'))
    return g > 0 && g < 10000 ? Math.round(g * 10) / 10 : null
  }
  const numOnly = s.match(/^(\d+(?:[.,]\d+)?)\s*$/)
  if (numOnly) {
    const g = parseFloat(numOnly[1].replace(',', '.'))
    return g > 0 && g < 10000 ? Math.round(g * 10) / 10 : null
  }
  return null
}

/**
 * Extract per-serving nutriments from OFF product when available.
 * OFF uses energy-kcal_serving, energy-kj_serving, proteins_serving, carbohydrates_serving, fat_serving, etc.
 * @returns { { calories, protein, carbs, fat, sodium?, sugars?, saturatedFat?, fiber? } | null } per 1 serving, or null if not available
 */
function parseNutrimentsPerServing(product) {
  const n = product.nutriments || {}
  let calories = n['energy-kcal_serving'] ?? n.energy_kcal_serving
  if (calories == null && (n['energy-kj_serving'] ?? n.energy_serving) != null) {
    const kj = n['energy-kj_serving'] ?? n.energy_serving ?? 0
    calories = kj / 4.184
  }
  if (calories == null || calories < 0) return null
  const protein = (n.proteins_serving ?? n.protein_serving) != null ? Number(n.proteins_serving ?? n.protein_serving) : 0
  const carbs = n.carbohydrates_serving != null ? Number(n.carbohydrates_serving) : 0
  const fat = n.fat_serving != null ? Number(n.fat_serving) : 0
  const sodiumServing = n.sodium_serving
  const sodiumMg = sodiumServing != null ? Math.round(Number(sodiumServing) * (Math.abs(Number(sodiumServing)) < 10 ? 1000 : 1)) : null
  return {
    calories: Math.round(calories),
    protein: protein != null ? Math.round(protein * 10) / 10 : 0,
    carbs: carbs != null ? Math.round(carbs * 10) / 10 : 0,
    fat: fat != null ? Math.round(fat * 10) / 10 : 0,
    ...(sodiumMg != null && sodiumMg >= 0 ? { sodium: sodiumMg } : {}),
    ...(n.sugars_serving != null ? { sugars: Math.round(Number(n.sugars_serving) * 10) / 10 } : {}),
    ...(n['saturated-fat_serving'] != null || n.saturated_fat_serving != null ? { saturatedFat: Math.round((Number(n['saturated-fat_serving'] ?? n.saturated_fat_serving ?? 0)) * 10) / 10 } : {}),
    ...(n.fiber_serving != null ? { fiber: Math.round(Number(n.fiber_serving) * 10) / 10 } : {}),
  }
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
  const servingSizeGrams = parseServingSizeGrams(p.serving_size)
  const itemSizeGrams = parseQuantityToGrams(p.quantity)
  let servingsPerPack = null
  if (servingSizeGrams != null && servingSizeGrams > 0 && itemSizeGrams != null && itemSizeGrams >= servingSizeGrams) {
    const ratio = itemSizeGrams / servingSizeGrams
    if (ratio >= 1 && ratio <= 100) servingsPerPack = Math.round(ratio)
  }
  const nutrimentPerServing = (p.serving_size && parseNutrimentsPerServing(p)) || null
  return {
    id: p.code || p._id,
    name: p.product_name,
    brand: p.brands || '',
    quantity: 100,
    ...parseNutriments(p, 100),
    barcode: p.code,
    ...(servingSizeGrams != null ? { servingSizeGrams, servingLabel: (p.serving_size || '').trim() || null } : {}),
    ...(itemSizeGrams != null ? { itemSizeGrams } : {}),
    ...(servingsPerPack != null ? { servingsPerPack } : {}),
    ...(nutrimentPerServing ? { nutrimentPerServing } : {}),
  }
}

/**
 * Run one search (world or with optional country filter).
 * Uses proxy in dev: fetch('/api/off/cgi/search.pl?...') -> world.openfoodfacts.org
 * @param {number} page - 1-based page number for pagination (Open Food Facts supports page=1,2,...)
 */
async function searchOnce(query, pageSize, countryTag = null, page = 1) {
  const base = OFF_ORIGIN || ''
  const path = base ? `${base}${SEARCH_PATH}` : `/api/off${SEARCH_PATH}`
  const params = new URLSearchParams({
    search_terms: query.trim(),
    json: 1,
    page_size: String(Math.min(Number(pageSize) || 24, 24)),
    page: String(Math.max(1, page)),
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

const DEFAULT_SEARCH_LIMIT = 20
const SEARCH_POOL_SIZE = 24

/**
 * Search foods: prefer Australia & New Zealand, then world.
 * Returns the top N results ranked MyFitnessPal-style:
 * - Meal-style query (e.g. "bbq chicken katsu panini") → best phrase/term-order match first.
 * - Single item (e.g. "banana") → singular option first (e.g. Banana), then banana smoothie, etc.
 * @param {string} query - Search query
 * @param {number} limit - Max results to return
 * @param {number} page - 1-based page (page 1 = first page; page 2+ appends from API, no canonical/relevance merge)
 * @returns {{ results: Array, hasMore: boolean }} - results and whether more pages likely exist
 */
export async function searchFood(query, limit = DEFAULT_SEARCH_LIMIT, page = 1) {
  const raw = query?.trim()
  if (!raw) return { results: [], hasMore: false }
  const normalized = normalizeQuery(raw)
  const searchTerms = normalized.split(/\s+/).filter(Boolean)
  const variants = getQueryVariants(normalized)
  const seen = new Set()
  let merged = []
  const isPage2Plus = page > 1

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
      searchOnce(queryToTry, SEARCH_POOL_SIZE, 'en:Australia', page),
      searchOnce(queryToTry, SEARCH_POOL_SIZE, 'en:new-zealand', page),
    ])
    addResults(auResults)
    addResults(nzResults)
    if (merged.length < limit * 2) {
      const world = await searchOnce(queryToTry, SEARCH_POOL_SIZE, null, page)
      addResults(world)
    }
    if (!isPage2Plus && isSingleWord && searchTerms[0].length >= 2) {
      const rawQuery = `${searchTerms[0]} raw`
      try {
        const rawWorld = await searchOnce(rawQuery, 12, null, page)
        addResults(rawWorld)
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    const world = await searchOnce(queryToTry, SEARCH_POOL_SIZE, null, page)
    addResults(world)
  }

  if (!isPage2Plus && merged.length === 0 && variants.length > 1) {
    for (let i = 1; i < variants.length; i++) {
      try {
        const fallback = await searchOnce(variants[i], SEARCH_POOL_SIZE, null, page)
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

  let final = merged.slice(0, limit)
  if (!isPage2Plus) {
    const canonical = getCanonicalMatch(normalized)
    if (canonical) {
      const canonNorm = norm(canonical.name)
      const rest = merged.filter((r) => norm(r.name) !== canonNorm && r.id !== canonical.id).slice(0, limit - 1)
      final = [canonical, ...rest]
    }
  }
  const hasMore = merged.length > limit
  return { results: final, hasMore }
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
  const servingSizeGrams = parseServingSizeGrams(product.serving_size)
  const itemSizeGrams = parseQuantityToGrams(product.quantity)
  let servingsPerPack = null
  if (servingSizeGrams != null && servingSizeGrams > 0 && itemSizeGrams != null && itemSizeGrams >= servingSizeGrams) {
    const ratio = itemSizeGrams / servingSizeGrams
    if (ratio >= 1 && ratio <= 100) servingsPerPack = Math.round(ratio)
  }
  const nutrimentPerServing = (product.serving_size && parseNutrimentsPerServing(product)) || null
  return {
    id: product.code,
    name: product.product_name,
    brand: product.brands || '',
    quantity: 100,
    ...parseNutriments(product, 100),
    barcode: product.code,
    ...(servingSizeGrams != null ? { servingSizeGrams, servingLabel: (product.serving_size || '').trim() || null } : {}),
    ...(itemSizeGrams != null ? { itemSizeGrams } : {}),
    ...(servingsPerPack != null ? { servingsPerPack } : {}),
    ...(nutrimentPerServing ? { nutrimentPerServing } : {}),
  }
}
