import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { nutritionSnapshot } from '../utils/nutritionSnapshot'
import { getRecommendedNutrition } from '../utils/recommendedNutrition'
import { searchFood, getProductByBarcode } from '../services/nutritionApi'
import { getDidYouMeanSuggestion, applyDidYouMean } from '../utils/didYouMean'
import { getGentleNudges } from '../utils/gentleNudges'
import { getHydrationInsight } from '../utils/hydrationInsight'
import PageFooter from '../components/PageFooter'
import './Nutrition.css'

const DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 2
const RECENT_DAYS = 14
const RECENT_MAX = 8
const FREQUENT_MAX = 8

/** Balance scale for guesstimate entries: how the meal leaned. */
const GUESSTIMATE_BALANCE_OPTIONS = [
  { value: 'treats', label: 'Heavy on treats / sweets' },
  { value: 'mixed', label: 'Mixed (bit of everything)' },
  { value: 'protein', label: 'More protein / balanced' },
]

/**
 * Rough calorie/protein per typical portion for keyword-based guesstimate.
 * Keys are single words (lowercase); description is tokenized and matched.
 */
const GUESSTIMATE_KEYWORDS = {
  cake: { cal: 320, protein: 4 },
  cakes: { cal: 320, protein: 4 },
  brownie: { cal: 250, protein: 3 },
  brownies: { cal: 250, protein: 3 },
  chocolate: { cal: 150, protein: 2 },
  fudge: { cal: 180, protein: 1 },
  biscuit: { cal: 80, protein: 1 },
  biscuits: { cal: 80, protein: 1 },
  cookie: { cal: 120, protein: 1 },
  cookies: { cal: 120, protein: 1 },
  donut: { cal: 250, protein: 4 },
  donuts: { cal: 250, protein: 4 },
  pastry: { cal: 280, protein: 5 },
  pastries: { cal: 280, protein: 5 },
  pie: { cal: 350, protein: 5 },
  chicken: { cal: 250, protein: 35 },
  roast: { cal: 180, protein: 25 },
  sausage: { cal: 180, protein: 8 },
  sausages: { cal: 180, protein: 8 },
  salad: { cal: 80, protein: 3 },
  salads: { cal: 80, protein: 3 },
  cheese: { cal: 120, protein: 7 },
  bun: { cal: 140, protein: 4 },
  buns: { cal: 140, protein: 4 },
  bread: { cal: 80, protein: 2 },
  roll: { cal: 120, protein: 3 },
  rolls: { cal: 120, protein: 3 },
  sandwich: { cal: 350, protein: 15 },
  sandwiches: { cal: 350, protein: 15 },
  burger: { cal: 450, protein: 25 },
  burgers: { cal: 450, protein: 25 },
  pizza: { cal: 280, protein: 12 },
  pasta: { cal: 220, protein: 8 },
  rice: { cal: 180, protein: 4 },
  potato: { cal: 120, protein: 2 },
  potatoes: { cal: 120, protein: 2 },
  soup: { cal: 120, protein: 5 },
  fries: { cal: 350, protein: 4 },
  chips: { cal: 250, protein: 3 },
  fish: { cal: 200, protein: 25 },
  beef: { cal: 220, protein: 25 },
  steak: { cal: 280, protein: 30 },
  eggs: { cal: 150, protein: 12 },
  egg: { cal: 75, protein: 6 },
  vegetables: { cal: 50, protein: 2 },
  veg: { cal: 50, protein: 2 },
  fruit: { cal: 80, protein: 1 },
  fruits: { cal: 80, protein: 1 },
  ice: { cal: 0, protein: 0 },
  cream: { cal: 200, protein: 2 },
  icecream: { cal: 200, protein: 3 },
  wrap: { cal: 300, protein: 12 },
  wraps: { cal: 300, protein: 12 },
  curry: { cal: 400, protein: 20 },
  stir: { cal: 0, protein: 0 },
  fry: { cal: 250, protein: 15 },
  lunch: { cal: 0, protein: 0 },
  dinner: { cal: 0, protein: 0 },
  meal: { cal: 0, protein: 0 },
  out: { cal: 0, protein: 0 },
  and: { cal: 0, protein: 0 },
  with: { cal: 0, protein: 0 },
  the: { cal: 0, protein: 0 },
  a: { cal: 0, protein: 0 },
}

/** Suggest calories and protein from a free-text meal description using keyword matching. */
function suggestFromKeywords(description) {
  if (!description || typeof description !== 'string') return { calories: 0, protein: 0 }
  const words = (description.toLowerCase().match(/\b\w+\b/g) || [])
  const seen = new Set()
  let cal = 0
  let protein = 0
  for (const word of words) {
    if (seen.has(word)) continue
    const hit = GUESSTIMATE_KEYWORDS[word]
    if (hit) {
      seen.add(word)
      cal += hit.cal
      protein += hit.protein
    }
  }
  return { calories: cal, protein }
}

/** MyFitnessPal-style: recent and frequent foods from your log (last N days). */
function getRecentAndFrequentFoods(nutritionLogs, dayKeys) {
  const dayOrder = [...dayKeys].reverse()
  const byKey = new Map()
  const lastDateByKey = new Map()
  const countByKey = new Map()
  for (const dayKey of dayOrder) {
    const log = (nutritionLogs || []).find((l) => l.date === dayKey)
    if (!log?.entries?.length) continue
    for (const e of log.entries) {
      if (e.guesstimate) continue
      const key = `${e.name || ''}|${e.barcode || ''}`
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: key,
          name: e.name,
          barcode: e.barcode,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          quantity: 100,
          sodium: e.sodium,
          sugars: e.sugars,
          saturatedFat: e.saturatedFat,
          fiber: e.fiber,
        })
        lastDateByKey.set(key, dayKey)
      }
      countByKey.set(key, (countByKey.get(key) || 0) + 1)
    }
  }
  const recent = Array.from(byKey.keys())
    .sort((a, b) => (lastDateByKey.get(b) || '').localeCompare(lastDateByKey.get(a) || ''))
    .slice(0, RECENT_MAX)
    .map((k) => byKey.get(k))
  const frequent = Array.from(countByKey.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, FREQUENT_MAX)
    .map(([k]) => byKey.get(k))
    .filter(Boolean)
  return { recent, frequent }
}

export default function Nutrition() {
  const {
    nutritionLogs,
    nutritionTargets,
    nutritionFavourites,
    nutritionMealCombos = [],
    weight,
    personalDetails,
    addNutritionEntry,
    setDayHydration,
    addNutritionFavourite,
    removeNutritionFavourite,
    addMealCombo,
    removeMealCombo,
  } = useHealth()

  const dateUtils = useDateUtils()
  const todayKey = dateUtils.getTodayKey()
  const sortedWeight = Array.isArray(weight) ? [...weight].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
  const currentWeight = sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1].value : null
  const recentDayKeys = dateUtils.getWeekKeys(14)
  const targetsFromDetails = getRecommendedNutrition(personalDetails ?? {}, currentWeight, {
    nutritionLogs: nutritionLogs ?? [],
    dayKeys: recentDayKeys,
  })
  const targets = targetsFromDetails ?? nutritionTargets

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchPage, setSearchPage] = useState(1)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityGrams, setQuantityGrams] = useState('1')
  const [quantityUnit, setQuantityUnit] = useState('serving') // 'g' | 'serving' | 'item'
  const [weekLogExpanded, setWeekLogExpanded] = useState(false)
  const [addFoodMode, setAddFoodMode] = useState('search')
  const [guesstimateName, setGuesstimateName] = useState('')
  const [guesstimateCal, setGuesstimateCal] = useState('')
  const [guesstimateProtein, setGuesstimateProtein] = useState('')
  const [guesstimateBalance, setGuesstimateBalance] = useState('mixed')
  const [createComboName, setCreateComboName] = useState('')
  const [createComboItems, setCreateComboItems] = useState([])
  const [createComboQty, setCreateComboQty] = useState('1')
  const [createComboUnit, setCreateComboUnit] = useState('serving')
  const debounceRef = useRef(null)

  const todayLog = nutritionLogs.find((l) => l.date === todayKey)
  const todayEntries = todayLog?.entries || []
  const todayHydrationCheck = todayLog?.hydrationCheck ?? null
  const todayRefills = todayLog?.refills ?? null

  const dailyTotals = useMemo(() => {
    return todayEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
        fat: acc.fat + (e.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [todayEntries])

  const gentleNudges = useMemo(() => getGentleNudges(todayEntries), [todayEntries])

  const weekKeys = dateUtils.getWeekKeys(7)
  const { recentFoods, frequentFoods } = useMemo(
    () => {
      const { recent, frequent } = getRecentAndFrequentFoods(nutritionLogs ?? [], recentDayKeys)
      return { recentFoods: recent, frequentFoods: frequent }
    },
    [nutritionLogs, recentDayKeys]
  )
  const hydrationInsight = useMemo(
    () => getHydrationInsight(nutritionLogs ?? [], weekKeys, todayKey),
    [nutritionLogs, weekKeys, todayKey]
  )
  const weeklyTotals = useMemo(() => {
    return weekKeys.map((date) => {
      const log = nutritionLogs.find((l) => l.date === date)
      const totals = log
        ? log.entries.reduce(
            (acc, e) => ({
              calories: acc.calories + (e.calories || 0),
              protein: acc.protein + (e.protein || 0),
              carbs: acc.carbs + (e.carbs || 0),
              fat: acc.fat + (e.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          )
        : { calories: 0, protein: 0, carbs: 0, fat: 0 }
      return { date, ...totals }
    })
  }, [nutritionLogs, weekKeys])

  const weeklyAvgCal = weeklyTotals.length
    ? weeklyTotals.reduce((a, d) => a + d.calories, 0) / weeklyTotals.length
    : 0

  const dailySnap = nutritionSnapshot(todayEntries, targets, false)
  const weeklySnap = nutritionSnapshot(weeklyAvgCal, targets, true)

  const isFavourite = (food) =>
    nutritionFavourites.some(
      (f) => (f.id && f.id === food.id) || (f.barcode && f.barcode === food.barcode) || (f.name === food.name && (f.barcode || '') === (food.barcode || ''))
    )

  const handleSearch = async (queryOverride) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim()
    if (!q) return
    if (queryOverride !== undefined) setSearchQuery(queryOverride)
    setSearchPage(1)
    await runSearch(q, 1, false)
  }

  const handleLoadMore = () => {
    const q = searchQuery.trim()
    if (!q || searching) return
    runSearch(q, searchPage + 1, true)
  }

  const runSearch = useCallback(async (q, page = 1, append = false) => {
    if (!q?.trim()) return
    setSearching(true)
    if (!append) {
      setSearchResults([])
      setSearchError(null)
    }
    try {
      const { results, hasMore } = await searchFood(q.trim(), 20, page)
      setSearchResults((prev) => (append ? [...prev, ...results] : results))
      setSearchHasMore(hasMore)
      setSearchPage(page)
      if (!append && results.length === 0) {
        setSearchError('No products found. Try a different search (e.g. brand name or "oats").')
      }
    } catch (err) {
      setSearchError(err?.message || 'Search failed. Check your connection or try again.')
      if (!append) setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < MIN_QUERY_LENGTH) {
      setSearchResults([])
      setSearchError(null)
      setSearchHasMore(false)
      setSearchPage(1)
      return
    }
    const t = setTimeout(() => runSearch(q, 1, false), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery, runSearch])

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return
    setSearching(true)
    setSearchResults([])
    setSearchHasMore(false)
    setSearchPage(1)
    try {
      const product = await getProductByBarcode(barcodeInput.trim())
      if (product) setSearchResults([product])
      else setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  /** Resolve quantity to effective grams (handles "2 servings" when food has servingSizeGrams). */
  const quantityToGrams = (food, qtyValue, unit) => {
    const num = parseFloat(qtyValue) || (unit === 'serving' ? 1 : 100)
    if (unit === 'serving') return num * (food.servingSizeGrams ?? 100)
    return num
  }

  const scaleEntry = (food, grams) => {
    const scale = (parseFloat(grams) || 100) / (food.quantity || 100)
    const entry = {
      name: food.name,
      barcode: food.barcode,
      calories: Math.round((food.calories || 0) * scale),
      protein: Math.round((food.protein || 0) * scale * 10) / 10,
      carbs: Math.round((food.carbs || 0) * scale * 10) / 10,
      fat: Math.round((food.fat || 0) * scale * 10) / 10,
    }
    if (food.sodium != null) entry.sodium = Math.round((food.sodium || 0) * scale)
    if (food.sugars != null) entry.sugars = Math.round((food.sugars || 0) * scale * 10) / 10
    if (food.saturatedFat != null) entry.saturatedFat = Math.round((food.saturatedFat || 0) * scale * 10) / 10
    if (food.fiber != null) entry.fiber = Math.round((food.fiber || 0) * scale * 10) / 10
    return entry
  }

  const handleAddFood = (food, qtyValue, unit) => {
    const qty = qtyValue ?? quantityGrams
    const u = unit ?? quantityUnit
    const entry = u === 'serving'
      ? entryFromServings(food, qty)
      : u === 'item'
        ? entryFromItems(food, qty)
        : scaleEntry(food, parseFloat(qty) || 100)
    addNutritionEntry(todayKey, entry)
    setQuantityGrams('1')
    setQuantityUnit('serving')
  }

  const handleToggleFavourite = (food) => {
    if (isFavourite(food)) {
      removeNutritionFavourite(food.id || food.barcode)
    } else {
      addNutritionFavourite({
        ...food,
        quantity: 100,
        servingSizeGrams: food.servingSizeGrams ?? null,
        servingLabel: food.servingLabel ?? null,
        nutrimentPerServing: food.nutrimentPerServing ?? null,
        itemSizeGrams: food.itemSizeGrams ?? null,
        servingsPerPack: food.servingsPerPack ?? null,
      })
    }
  }

  const roundMacro = (n) => (n != null && !Number.isNaN(n) ? Math.round(Number(n)) : 0)

  /** Grams per item (whole pack): itemSizeGrams or servingSizeGrams × servingsPerPack. */
  const getItemSizeGrams = (food) => {
    if (food.itemSizeGrams != null && food.itemSizeGrams > 0) return food.itemSizeGrams
    if (food.servingSizeGrams != null && food.servingsPerPack != null && food.servingsPerPack > 0) {
      return food.servingSizeGrams * food.servingsPerPack
    }
    return null
  }

  /** Display nutrition: primary line (per 1 serv or per 100g) and optional per-item line. */
  const getDisplayNutrition = (food) => {
    let primary
    if (food.nutrimentPerServing) {
      primary = {
        calories: food.nutrimentPerServing.calories ?? 0,
        protein: roundMacro(food.nutrimentPerServing.protein),
        label: `(per 1 serv${food.servingSizeGrams != null ? `, ${food.servingSizeGrams}g` : ''})`,
      }
    } else if (food.servingSizeGrams != null && food.servingSizeGrams > 0) {
      const scale = food.servingSizeGrams / 100
      primary = {
        calories: Math.round((food.calories || 0) * scale),
        protein: roundMacro((food.protein || 0) * scale),
        label: `(per 1 serv, ${food.servingSizeGrams}g)`,
      }
    } else {
      primary = {
        calories: food.calories ?? 0,
        protein: roundMacro(food.protein),
        label: '(per 100g)',
      }
    }
    let perItem = null
    const itemGrams = getItemSizeGrams(food)
    if (itemGrams != null && itemGrams > 0) {
      const scale = itemGrams / 100
      const servText = food.servingsPerPack != null ? `, ${food.servingsPerPack} serv` : ''
      perItem = {
        calories: Math.round((food.calories || 0) * scale),
        protein: roundMacro((food.protein || 0) * scale),
        label: `per item (${itemGrams}g${servText})`,
      }
    }
    return { ...primary, perItem }
  }

  /** Build a log entry when adding by serving: use API per-serving * qty if available, else scale from per-100g. */
  const entryFromServings = (food, qty) => {
    const num = parseFloat(qty) || 1
    if (food.nutrimentPerServing) {
      const p = food.nutrimentPerServing
      const entry = {
        name: food.name,
        barcode: food.barcode,
        calories: Math.round((p.calories ?? 0) * num),
        protein: Math.round((p.protein ?? 0) * num * 10) / 10,
        carbs: Math.round((p.carbs ?? 0) * num * 10) / 10,
        fat: Math.round((p.fat ?? 0) * num * 10) / 10,
      }
      if (p.sodium != null) entry.sodium = Math.round(p.sodium * num)
      if (p.sugars != null) entry.sugars = Math.round((p.sugars || 0) * num * 10) / 10
      if (p.saturatedFat != null) entry.saturatedFat = Math.round((p.saturatedFat || 0) * num * 10) / 10
      if (p.fiber != null) entry.fiber = Math.round((p.fiber || 0) * num * 10) / 10
      return entry
    }
    const grams = num * (food.servingSizeGrams ?? 100)
    return scaleEntry(food, grams)
  }

  /** Build a log entry when adding by item(s): 1 can = itemSizeGrams g, or servingsPerPack × serving. */
  const entryFromItems = (food, qty) => {
    const num = parseFloat(qty) || 1
    const itemGrams = getItemSizeGrams(food)
    if (itemGrams != null) return scaleEntry(food, num * itemGrams)
    if (food.nutrimentPerServing && food.servingsPerPack != null) {
      return entryFromServings(food, num * food.servingsPerPack)
    }
    return scaleEntry(food, num * (food.servingSizeGrams ?? 100))
  }

  /** Build one log entry from a favourite + quantity + unit (for adding to today or to a combo). */
  const buildEntryFromFavourite = (fav, qty, u) => {
    if (u === 'serving') return entryFromServings(fav, qty)
    if (u === 'item') return entryFromItems(fav, qty)
    const grams = parseFloat(qty) || 100
    return scaleEntry(fav, grams)
  }

  const handleAddFromFavourite = (fav, qtyValue, unit) => {
    const qty = qtyValue ?? quantityGrams
    const u = unit ?? quantityUnit
    const entry = buildEntryFromFavourite(fav, qty, u)
    addNutritionEntry(todayKey, entry)
    setQuantityGrams('1')
    setQuantityUnit('serving')
  }

  const handleAddComboToToday = (combo) => {
    ;(combo.items || []).forEach((entry) => addNutritionEntry(todayKey, entry))
  }

  const handleAddToCombo = (fav) => {
    const entry = buildEntryFromFavourite(fav, createComboQty, createComboUnit)
    setCreateComboItems((prev) => [...prev, entry])
  }

  const handleRemoveFromCombo = (index) => {
    setCreateComboItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveCombo = () => {
    const name = (createComboName || 'Meal combo').trim()
    if (createComboItems.length === 0) return
    addMealCombo({ name, items: createComboItems })
    setCreateComboName('')
    setCreateComboItems([])
    setCreateComboQty('1')
    setCreateComboUnit('serving')
    setAddFoodMode('combos')
  }

  const handleAddGuesstimate = (e) => {
    e?.preventDefault?.()
    const name = (guesstimateName || 'Rough meal').trim()
    const cal = parseInt(guesstimateCal, 10)
    if (!name || Number.isNaN(cal) || cal < 0) return
    const protein = parseInt(guesstimateProtein, 10)
    addNutritionEntry(todayKey, {
      name,
      calories: cal,
      protein: Number.isNaN(protein) || protein < 0 ? 0 : protein,
      carbs: 0,
      fat: 0,
      guesstimate: true,
      balance: guesstimateBalance,
    })
    setGuesstimateName('')
    setGuesstimateCal('')
    setGuesstimateProtein('')
    setGuesstimateBalance('mixed')
  }

  return (
    <div className="nutrition-page">
      <h1 className="page-title">Nutrition</h1>

      {/* Red / Orange / Green snapshot */}
      <section className="card snapshot-section">
        <h3>Daily &amp; weekly snapshot</h3>
        <div className="snapshot-grid">
          <div className="snapshot-item">
            <span className="label">Today</span>
            <span className={`snapshot-badge snapshot-${dailySnap}`}>{dailySnap}</span>
            <span className="muted small">
              {dailyTotals.calories} kcal · P {roundMacro(dailyTotals.protein)}g
            </span>
          </div>
          <div className="snapshot-item">
            <span className="label">Weekly average</span>
            <span className={`snapshot-badge snapshot-${weeklySnap}`}>{weeklySnap}</span>
            <span className="muted small">
              ~{Math.round(weeklyAvgCal)} kcal/day
            </span>
          </div>
        </div>
      </section>

      {/* Hydration: check (light→dark scale) + refills */}
      <section className="card hydration-section">
        <h3>Hydration</h3>
        <p className="hydration-intro muted small">
          Optional. Lighter usually means better hydrated; vitamins or food can affect colour.
        </p>
        <div className="hydration-check">
          <span className="hydration-check-label">How did your hydration look today?</span>
          <div className="hydration-scale" role="group" aria-label="Hydration check">
            {[
              { value: 1, label: 'Very light' },
              { value: 2, label: 'Light' },
              { value: 3, label: 'Medium' },
              { value: 4, label: 'Dark' },
              { value: 5, label: 'Very dark' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`hydration-scale-btn hydration-scale-${value} ${todayHydrationCheck === value ? 'active' : ''}`}
                onClick={() => setDayHydration(todayKey, { hydrationCheck: value, refills: todayRefills ?? undefined })}
                title={label}
                aria-pressed={todayHydrationCheck === value}
              >
                <span className="hydration-scale-dot" />
                <span className="hydration-scale-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="hydration-refills">
          <label htmlFor="hydration-refills">Bottle refills today (any size)</label>
          <input
            id="hydration-refills"
            type="number"
            min={0}
            max={99}
            step={1}
            placeholder="e.g. 4"
            value={todayRefills !== null && todayRefills !== undefined ? todayRefills : ''}
            onChange={(e) => {
              const v = e.target.value
              const n = v === '' ? null : parseInt(v, 10)
              setDayHydration(todayKey, {
                refills: v === '' ? null : (Number.isNaN(n) ? undefined : n),
                hydrationCheck: todayHydrationCheck ?? undefined,
              })
            }}
          />
        </div>
        {hydrationInsight && (
          <p className="hydration-insight" role="status">
            {hydrationInsight.message}
          </p>
        )}
      </section>

      {/* Today's log */}
      <section className="card">
        <h3>Today&apos;s log ({dateUtils.formatDate(todayKey)})</h3>
        <div className="totals-bar">
          <span>Cal <strong>{dailyTotals.calories}</strong> / {targets.calories}</span>
          <span>P <strong>{roundMacro(dailyTotals.protein)}</strong> / {roundMacro(targets.protein)}g</span>
          <span>C <strong>{roundMacro(dailyTotals.carbs)}</strong> / {roundMacro(targets.carbs)}g</span>
          <span>F <strong>{roundMacro(dailyTotals.fat)}</strong> / {roundMacro(targets.fat)}g</span>
        </div>
        {gentleNudges.length > 0 && (
          <div className="gentle-nudges" role="note">
            <p className="gentle-nudges-intro muted small">A quick note:</p>
            <ul className="gentle-nudges-list">
              {gentleNudges.map((n) => (
                <li key={n.id} className="gentle-nudge muted small">{n.message}</li>
              ))}
            </ul>
          </div>
        )}
        <ul className="today-entries">
          {todayEntries.map((e, i) => (
            <li key={i} className={e.guesstimate ? 'today-entry-guesstimate' : ''}>
              {e.guesstimate && <span className="guesstimate-badge" title="Rough estimate">~</span>}
              {e.name}
              {e.guesstimate && e.balance && (
                <span className={`balance-badge balance-${e.balance}`}>
                  {GUESSTIMATE_BALANCE_OPTIONS.find((o) => o.value === e.balance)?.label ?? e.balance}
                </span>
              )}
              {' — '}{e.calories} kcal, P {roundMacro(e.protein)}g
            </li>
          ))}
          {todayEntries.length === 0 && <li className="muted">No entries yet.</li>}
        </ul>
      </section>

      {/* Add food: search by name OR pick from favourites OR quick guesstimate (pivot) */}
      <section className="card add-food-section">
        <h3>Add food</h3>
        {addFoodMode === 'guesstimate' ? (
          <div className="add-food-pivot guesstimate-panel">
            <button
              type="button"
              className="btn btn-ghost btn-back"
              onClick={() => setAddFoodMode('search')}
            >
              ← Search by name
            </button>
            <h4 className="guesstimate-title">Quick guesstimate</h4>
            <p className="muted small guesstimate-intro">
              Type what you had (e.g. cake, brownies, roast chicken, salad, cheese buns)—then click &quot;Suggest calories &amp; protein&quot; to get a rough estimate. You can edit the numbers or leave them as-is.
            </p>
            <form onSubmit={handleAddGuesstimate} className="guesstimate-form">
              <div className="guesstimate-row">
                <label htmlFor="guesstimate-name">Meal / description</label>
                <input
                  id="guesstimate-name"
                  type="text"
                  value={guesstimateName}
                  onChange={(e) => setGuesstimateName(e.target.value)}
                  placeholder="e.g. cake, brownies, roast chicken, salad, cheese buns"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm guesstimate-suggest-btn"
                  onClick={() => {
                    const { calories, protein } = suggestFromKeywords(guesstimateName)
                    if (calories > 0 || protein > 0) {
                      setGuesstimateCal(String(calories))
                      setGuesstimateProtein(String(protein))
                    }
                  }}
                >
                  Suggest calories &amp; protein from description
                </button>
              </div>
              <div className="guesstimate-row guesstimate-row-inline">
                <label htmlFor="guesstimate-cal">Calories (approx)</label>
                <input
                  id="guesstimate-cal"
                  type="number"
                  min={0}
                  value={guesstimateCal}
                  onChange={(e) => setGuesstimateCal(e.target.value)}
                  placeholder="e.g. 800"
                />
              </div>
              <div className="guesstimate-row guesstimate-row-inline">
                <label htmlFor="guesstimate-protein">Protein (g, optional)</label>
                <input
                  id="guesstimate-protein"
                  type="number"
                  min={0}
                  value={guesstimateProtein}
                  onChange={(e) => setGuesstimateProtein(e.target.value)}
                  placeholder="e.g. 40"
                />
              </div>
              <div className="guesstimate-row">
                <span className="guesstimate-balance-label">How did it lean?</span>
                <div className="guesstimate-balance-options" role="group" aria-label="Meal balance">
                  {GUESSTIMATE_BALANCE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="guesstimate-balance-option">
                      <input
                        type="radio"
                        name="guesstimate-balance"
                        value={opt.value}
                        checked={guesstimateBalance === opt.value}
                        onChange={() => setGuesstimateBalance(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="btn"
                disabled={guesstimateCal === '' || (parseInt(guesstimateCal, 10) < 0)}
              >
                Add guesstimate
              </button>
            </form>
          </div>
        ) : addFoodMode === 'combos' ? (
          <div className="add-food-pivot combos-panel">
            <button
              type="button"
              className="btn btn-ghost btn-back"
              onClick={() => setAddFoodMode('search')}
            >
              ← Search by name
            </button>
            <h4 className="combos-title">Meal combos</h4>
            <p className="muted small combos-intro">
              Add several foods as one combo (e.g. breakfast: oats + banana + milk). Create below from your favourites, then add the whole combo to today in one tap.
            </p>
            {nutritionMealCombos.length > 0 && (
              <div className="combos-list">
                <h5 className="combos-list-title">Your combos</h5>
                {nutritionMealCombos.map((combo) => {
                  const totalCal = (combo.items || []).reduce((s, e) => s + (e.calories || 0), 0)
                  const totalP = (combo.items || []).reduce((s, e) => s + (e.protein || 0), 0)
                  return (
                    <div key={combo.id} className="combo-row">
                      <div className="combo-info">
                        <strong>{combo.name}</strong>
                        <span className="small muted"> — {(combo.items || []).length} items, ~{totalCal} kcal, P {Math.round(totalP)}g</span>
                      </div>
                      <div className="combo-actions">
                        <button type="button" className="btn btn-sm" onClick={() => handleAddComboToToday(combo)}>Add to today</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMealCombo(combo.id)} title="Remove combo">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="create-combo-section">
              <h5 className="create-combo-title">{nutritionMealCombos.length > 0 ? 'Create new combo' : 'Create a combo'}</h5>
              <div className="create-combo-name-row">
                <label htmlFor="combo-name">Combo name</label>
                <input
                  id="combo-name"
                  type="text"
                  value={createComboName}
                  onChange={(e) => setCreateComboName(e.target.value)}
                  placeholder="e.g. Usual breakfast, Lunch bowl"
                />
              </div>
              {nutritionFavourites.length > 0 && (
                <>
                  <div className="create-combo-qty-row">
                    <label>Quantity per item:</label>
                    <input
                      type="number"
                      min="0.1"
                      step={createComboUnit === 'serving' || createComboUnit === 'item' ? '0.5' : '1'}
                      value={createComboQty}
                      onChange={(e) => setCreateComboQty(e.target.value || '1')}
                      className="qty-input"
                    />
                    <select
                      value={createComboUnit}
                      onChange={(e) => setCreateComboUnit(e.target.value)}
                      className="qty-unit-select"
                      aria-label="Unit"
                    >
                      <option value="g">g</option>
                      <option value="serving">serving(s)</option>
                      <option value="item">item(s)</option>
                    </select>
                  </div>
                  <p className="muted small">Pick from favourites and click &quot;Add to combo&quot;. Adjust quantity above for the next item.</p>
                  <div className="create-combo-favourites">
                    {nutritionFavourites.map((fav) => (
                      <div key={fav.id || fav.barcode || fav.name} className="combo-fav-row">
                        <span className="combo-fav-name">{fav.name}</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleAddToCombo(fav)}>Add to combo</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {createComboItems.length > 0 && (
                <div className="combo-items-preview">
                  <strong>In this combo:</strong>
                  <ul>
                    {createComboItems.map((e, i) => (
                      <li key={i}>
                        {e.name} — {e.calories} kcal, P {roundMacro(e.protein)}g
                        <button type="button" className="btn-link btn-remove-item" onClick={() => handleRemoveFromCombo(i)} aria-label="Remove">✕</button>
                      </li>
                    ))}
                  </ul>
                  <p className="small muted">Total: ~{createComboItems.reduce((s, e) => s + (e.calories || 0), 0)} kcal, P {roundMacro(createComboItems.reduce((s, e) => s + (e.protein || 0), 0))}g</p>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSaveCombo}
                  >
                    Save combo
                  </button>
                </div>
              )}
              {nutritionFavourites.length === 0 && (
                <p className="muted small">Add some favourite foods first (search and click ☆), then you can build combos from them.</p>
              )}
            </div>
          </div>
        ) : addFoodMode === 'favourites' ? (
          <div className="add-food-pivot favourites-panel">
            <button
              type="button"
              className="btn btn-ghost btn-back"
              onClick={() => setAddFoodMode('search')}
            >
              ← Search by name
            </button>
            <h4 className="favourites-title">Pick from favourites</h4>
            <div className="quantity-row">
              <label>Quantity:</label>
              <input
                type="number"
                min="0.1"
                step={quantityUnit === 'serving' || quantityUnit === 'item' ? '0.5' : '1'}
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value || (quantityUnit === 'g' ? '100' : '1'))}
                className="qty-input"
              />
              <select
                value={quantityUnit}
                onChange={(e) => {
                  const v = e.target.value
                  setQuantityUnit(v)
                  setQuantityGrams(v === 'g' ? (quantityGrams || '100') : '1')
                }}
                className="qty-unit-select"
                aria-label="Quantity unit"
              >
                <option value="g">g</option>
                <option value="serving">serving(s)</option>
                <option value="item">item(s)</option>
              </select>
            </div>
            {nutritionFavourites.length > 0 ? (
              <div className="favourites-list">
                {nutritionFavourites.map((fav) => (
                  <div key={fav.id || fav.barcode || fav.name} className="food-row">
                    <div className="food-info">
                      <strong>{fav.name}</strong>
                      {fav.brand && <span className="muted"> — {fav.brand}</span>}
                      <span className="small">
                        · {getDisplayNutrition(fav).calories} kcal, P {getDisplayNutrition(fav).protein}g {getDisplayNutrition(fav).label}
                        {getDisplayNutrition(fav).perItem && (
                          <span className="muted"> · {getDisplayNutrition(fav).perItem.calories} kcal, P {getDisplayNutrition(fav).perItem.protein}g {getDisplayNutrition(fav).perItem.label}</span>
                        )}
                      </span>
                    </div>
                    <div className="food-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeNutritionFavourite(fav.id || fav.barcode)}
                        title="Remove from favourites"
                        aria-label="Remove from favourites"
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleAddFromFavourite(fav, quantityGrams, quantityUnit)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No favourites yet. Search for a food and click ☆ to add it here.</p>
            )}
          </div>
        ) : (
          <div className="add-food-pivot search-panel">
            <p className="muted small search-intro">
              Search as you type (e.g. &quot;banana&quot;, &quot;chicken breast&quot;, &quot;Weet-Bix&quot;). Results from Open Food Facts (AU &amp; NZ). Below: your recent and frequently logged foods.
            </p>
            <div className="search-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. banana, bbq chicken panini, Weet-Bix"
              />
              <button type="button" className="btn" onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            <div className="barcode-row">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Or enter barcode"
              />
              <button type="button" className="btn btn-ghost" onClick={handleBarcodeLookup} disabled={searching}>
                Lookup
              </button>
            </div>
            <p className="pivot-trigger muted small">
              {nutritionFavourites.length > 0 && (
                <>or <button type="button" className="btn-link" onClick={() => setAddFoodMode('favourites')}>pick from favourites</button>{' · '}</>
              )}
              <button type="button" className="btn-link" onClick={() => setAddFoodMode('combos')}>meal combos</button>
              {' · '}
              <button type="button" className="btn-link" onClick={() => setAddFoodMode('guesstimate')}>quick guesstimate</button> (rough meal)
            </p>

            {searchQuery.trim().length < MIN_QUERY_LENGTH && (recentFoods.length > 0 || frequentFoods.length > 0) && (
              <div className="recent-frequent-section">
                <div className="quantity-row">
                  <label>Quantity:</label>
                  <input type="number" min="0.1" step={quantityUnit === 'serving' || quantityUnit === 'item' ? '0.5' : '1'} value={quantityGrams} onChange={(e) => setQuantityGrams(e.target.value || (quantityUnit === 'g' ? '100' : '1'))} className="qty-input" />
                  <select value={quantityUnit} onChange={(e) => { const v = e.target.value; setQuantityUnit(v); setQuantityGrams(v === 'g' ? (quantityGrams || '100') : '1'); }} className="qty-unit-select" aria-label="Quantity unit">
                    <option value="g">g</option>
                    <option value="serving">serving(s)</option>
                    <option value="item">item(s)</option>
                  </select>
                </div>
                {recentFoods.length > 0 && (
                  <div className="recent-frequent-block">
                    <h4 className="recent-frequent-title">Recently logged</h4>
                    <div className="recent-frequent-list">
                      {recentFoods.map((food) => (
                        <div key={food.id} className="food-row">
                          <div className="food-info">
                            <strong>{food.name}</strong>
                            <span className="small">
                              · {getDisplayNutrition(food).calories} kcal, P {getDisplayNutrition(food).protein}g {getDisplayNutrition(food).label}
                              {getDisplayNutrition(food).perItem && (
                                <span className="muted"> · {getDisplayNutrition(food).perItem.label}</span>
                              )}
                            </span>
                          </div>
                          <div className="food-actions">
                            <button type="button" className="btn btn-sm" onClick={() => handleAddFood(food, quantityGrams, quantityUnit)}>Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {frequentFoods.length > 0 && (
                  <div className="recent-frequent-block">
                    <h4 className="recent-frequent-title">Frequently logged</h4>
                    <div className="recent-frequent-list">
                      {frequentFoods.map((food) => (
                        <div key={food.id} className="food-row">
                          <div className="food-info">
                            <strong>{food.name}</strong>
                            <span className="small">
                              · {getDisplayNutrition(food).calories} kcal, P {getDisplayNutrition(food).protein}g {getDisplayNutrition(food).label}
                              {getDisplayNutrition(food).perItem && (
                                <span className="muted"> · {getDisplayNutrition(food).perItem.label}</span>
                              )}
                            </span>
                          </div>
                          <div className="food-actions">
                            <button type="button" className="btn btn-sm" onClick={() => handleAddFood(food, quantityGrams, quantityUnit)}>Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {searchError && (
              <p className="search-error muted small" role="alert">
                {searchError}
              </p>
            )}
            {searchResults.length > 0 && (() => {
              const didYouMean = getDidYouMeanSuggestion(searchQuery, searchResults)
              return didYouMean ? (
                <p className="did-you-mean muted small">
                  Did you mean <strong>{didYouMean.right}</strong>?{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => handleSearch(applyDidYouMean(searchQuery, didYouMean.wrong, didYouMean.right))}
                  >
                    Search with this
                  </button>
                </p>
              ) : null
            })()}
            {searchResults.length > 0 && (
              <div className="search-results">
                <p className="muted small results-summary">
                  {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found.
                </p>
                <div className="quantity-row">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    min="0.1"
                    step={quantityUnit === 'serving' || quantityUnit === 'item' ? '0.5' : '1'}
                    value={quantityGrams}
                    onChange={(e) => setQuantityGrams(e.target.value || (quantityUnit === 'g' ? '100' : '1'))}
                    className="qty-input"
                  />
                  <select
                    value={quantityUnit}
                    onChange={(e) => { const v = e.target.value; setQuantityUnit(v); setQuantityGrams(v === 'g' ? (quantityGrams || '100') : '1'); }}
                    className="qty-unit-select"
                    aria-label="Quantity unit"
                  >
                    <option value="g">g</option>
                    <option value="serving">serving(s)</option>
                    <option value="item">item(s)</option>
                  </select>
                </div>
                {searchResults.map((food) => (
                  <div key={food.id || food.name} className="food-row">
                    <div className="food-info">
                      <strong>{food.name}</strong>
                      {food.brand && <span className="muted"> — {food.brand}</span>}
                      <span className="small">
                        · {getDisplayNutrition(food).calories} kcal, P {getDisplayNutrition(food).protein}g {getDisplayNutrition(food).label}
                        {getDisplayNutrition(food).perItem && (
                          <span className="muted"> · {getDisplayNutrition(food).perItem.calories} kcal, P {getDisplayNutrition(food).perItem.protein}g {getDisplayNutrition(food).perItem.label}</span>
                        )}
                      </span>
                    </div>
                    <div className="food-actions">
                      <button
                        type="button"
                        className={`btn btn-ghost btn-icon ${isFavourite(food) ? 'is-favourite' : ''}`}
                        onClick={() => handleToggleFavourite(food)}
                        title={isFavourite(food) ? 'Remove from favourites' : 'Add to favourites'}
                        aria-label={isFavourite(food) ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        {isFavourite(food) ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleAddFood(food, quantityGrams, quantityUnit)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
                {searchHasMore && (
                  <div className="load-more-row">
                    <button type="button" className="btn btn-ghost" onClick={handleLoadMore} disabled={searching}>
                      {searching ? 'Loading…' : 'Load more results'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Last 7 days — click to expand */}
      <section className="card week-log-section">
        <button
          type="button"
          className="week-log-toggle"
          onClick={() => setWeekLogExpanded((e) => !e)}
          aria-expanded={weekLogExpanded}
        >
          <span className="week-log-title">Last 7 days</span>
          <span className="week-log-chevron" aria-hidden>{weekLogExpanded ? '▼' : '▶'}</span>
        </button>
        {weekLogExpanded && (
          <div className="week-rows">
            {weeklyTotals.map((d) => {
              const snap = nutritionSnapshot(
                d.calories ? [{ calories: d.calories, protein: d.protein }] : [],
                targets,
                false
              )
              return (
                <div key={d.date} className="week-row">
                  <span>{dateUtils.formatDate(d.date)}</span>
                  <span>{d.calories} kcal</span>
                  <span className={`snapshot-badge snapshot-${snap}`}>{snap}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
      <PageFooter />
    </div>
  )
}
