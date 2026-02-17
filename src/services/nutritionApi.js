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
 * Score a result by how many query terms appear in name + brand (higher = closer match).
 */
function scoreMatch(result, queryTerms) {
  if (!queryTerms.length) return 0
  const text = `${(result.name || '')} ${(result.brand || '')}`.toLowerCase()
  let hits = 0
  for (const term of queryTerms) {
    if (term.length > 0 && text.includes(term)) hits++
  }
  return hits / queryTerms.length
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
  return {
    calories,
    protein: Math.round((n.proteins_100g ?? n.proteins ?? 0) * scale * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? n.carbohydrates ?? 0) * scale * 10) / 10,
    fat: Math.round((n.fat_100g ?? n.fat ?? 0) * scale * 10) / 10,
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

/**
 * Search foods: prefer Australia & New Zealand, then world.
 * Uses a "wildcard-friendly" flow: normalizes query (drops "and", etc.), tries full phrase first,
 * then shorter variants (e.g. "harriways sultana" then "harriways") until we get results.
 * Results are sorted by how many of your search terms appear in the product (closest match first).
 */
export async function searchFood(query, limit = 10) {
  const raw = query?.trim()
  if (!raw) return []
  const normalized = normalizeQuery(raw)
  const searchTerms = normalized.split(/\s+/).filter(Boolean)
  const variants = getQueryVariants(normalized)
  const perCountry = Math.min(limit + 5, 24)
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
  try {
    const [auResults, nzResults] = await Promise.all([
      searchOnce(queryToTry, perCountry, 'en:Australia'),
      searchOnce(queryToTry, perCountry, 'en:new-zealand'),
    ])
    addResults(auResults)
    addResults(nzResults)
    if (merged.length < limit) {
      const world = await searchOnce(queryToTry, perCountry, null)
      addResults(world)
    }
  } catch (_) {
    const world = await searchOnce(queryToTry, Math.min(limit, 24), null)
    addResults(world)
  }

  if (merged.length === 0 && variants.length > 1) {
    for (let i = 1; i < variants.length; i++) {
      try {
        const fallback = await searchOnce(variants[i], perCountry, null)
        addResults(fallback)
        if (merged.length >= limit) break
      } catch (_) {
        /* try next variant */
      }
    }
  }

  merged = merged.slice(0, limit * 2)
  if (searchTerms.length > 0) {
    merged.sort((a, b) => scoreMatch(b, searchTerms) - scoreMatch(a, searchTerms))
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
