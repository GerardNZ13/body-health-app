import React, { useState, useMemo } from 'react'
import { useHealth } from '../store/HealthContext'
import { useDateUtils } from '../hooks/useDateUtils'
import { nutritionSnapshot } from '../utils/nutritionSnapshot'
import { getRecommendedNutrition } from '../utils/recommendedNutrition'
import { searchFood, getProductByBarcode } from '../services/nutritionApi'
import { getDidYouMeanSuggestion, applyDidYouMean } from '../utils/didYouMean'
import PageFooter from '../components/PageFooter'
import './Nutrition.css'

export default function Nutrition() {
  const {
    nutritionLogs,
    nutritionTargets,
    nutritionFavourites,
    weight,
    personalDetails,
    addNutritionEntry,
    addNutritionFavourite,
    removeNutritionFavourite,
  } = useHealth()

  const dateUtils = useDateUtils()
  const todayKey = dateUtils.getTodayKey()
  const sortedWeight = Array.isArray(weight) ? [...weight].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
  const currentWeight = sortedWeight.length > 0 ? sortedWeight[sortedWeight.length - 1].value : null
  const targetsFromDetails = getRecommendedNutrition(personalDetails ?? {}, currentWeight)
  const targets = targetsFromDetails ?? nutritionTargets

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [quantityGrams, setQuantityGrams] = useState('100')

  const todayEntries = nutritionLogs.find((l) => l.date === todayKey)?.entries || []

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

  const weekKeys = dateUtils.getWeekKeys(7)
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
    setSearching(true)
    setSearchResults([])
    setSearchError(null)
    try {
      const results = await searchFood(q, 10)
      setSearchResults(results)
      if (results.length === 0) {
        setSearchError('No products found. Try a different search (e.g. brand name or “oats”).')
      }
    } catch (err) {
      setSearchError(err?.message || 'Search failed. Check your connection or try again.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const product = await getProductByBarcode(barcodeInput.trim())
      if (product) setSearchResults([product])
      else setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const scaleEntry = (food, grams) => {
    const scale = (parseFloat(grams) || 100) / (food.quantity || 100)
    return {
      name: food.name,
      barcode: food.barcode,
      calories: Math.round((food.calories || 0) * scale),
      protein: Math.round((food.protein || 0) * scale * 10) / 10,
      carbs: Math.round((food.carbs || 0) * scale * 10) / 10,
      fat: Math.round((food.fat || 0) * scale * 10) / 10,
    }
  }

  const handleAddFood = (food, grams) => {
    const entry = scaleEntry(food, grams || quantityGrams)
    addNutritionEntry(todayKey, entry)
    setQuantityGrams('100')
  }

  const handleToggleFavourite = (food) => {
    if (isFavourite(food)) {
      removeNutritionFavourite(food.id || food.barcode)
    } else {
      addNutritionFavourite({ ...food, quantity: 100 })
    }
  }

  const handleAddFromFavourite = (fav, grams) => {
    const scale = (parseFloat(grams) || 100) / (fav.quantity || 100)
    addNutritionEntry(todayKey, {
      name: fav.name,
      barcode: fav.barcode,
      calories: Math.round((fav.calories || 0) * scale),
      protein: Math.round((fav.protein || 0) * scale * 10) / 10,
      carbs: Math.round((fav.carbs || 0) * scale * 10) / 10,
      fat: Math.round((fav.fat || 0) * scale * 10) / 10,
    })
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
              {dailyTotals.calories} kcal · P {dailyTotals.protein}g
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

      {/* Today's log */}
      <section className="card">
        <h3>Today&apos;s log ({dateUtils.formatDate(todayKey)})</h3>
        <div className="totals-bar">
          <span>Cal <strong>{dailyTotals.calories}</strong> / {targets.calories}</span>
          <span>P <strong>{dailyTotals.protein}</strong> / {targets.protein}g</span>
          <span>C <strong>{dailyTotals.carbs}</strong> / {targets.carbs}g</span>
          <span>F <strong>{dailyTotals.fat}</strong> / {targets.fat}g</span>
        </div>
        <ul className="today-entries">
          {todayEntries.map((e, i) => (
            <li key={i}>
              {e.name} — {e.calories} kcal, P {e.protein}g
            </li>
          ))}
          {todayEntries.length === 0 && <li className="muted">No entries yet.</li>}
        </ul>
      </section>

      {/* Weekly trend */}
      <section className="card">
        <h3>Last 7 days</h3>
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
      </section>

      {/* Add food: Favourites + Search */}
      <section className="card">
        <h3>Add food</h3>
        {nutritionFavourites.length > 0 && (
          <div className="favourites-block">
            <h4 className="favourites-title">Favourites — quick add</h4>
            <div className="quantity-label">
              <label>Quantity (g):</label>
              <input
                type="number"
                min="1"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value || '100')}
                className="qty-input"
              />
            </div>
            <div className="favourites-list">
              {nutritionFavourites.map((fav) => (
                <div key={fav.id || fav.barcode || fav.name} className="food-row">
                  <div className="food-info">
                    <strong>{fav.name}</strong>
                    {fav.brand && <span className="muted"> — {fav.brand}</span>}
                    <span className="small"> · {fav.calories} kcal, P {fav.protein}g (per 100g)</span>
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
                      onClick={() => handleAddFromFavourite(fav, quantityGrams)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="muted small search-intro">
          Search by product or brand name (e.g. Harraways oats, Woolworths, Countdown). Results from common supermarkets and food suppliers in Australia and New Zealand. Data from Open Food Facts.
        </p>
        <div className="search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Harraways oats, Weet-Bix, Sanitarium"
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
              {searchResults.length} product{searchResults.length !== 1 ? 's' : ''} found (Australia &amp; New Zealand when available).
            </p>
            <div className="quantity-label">
              <label>Quantity (g) for adding:</label>
              <input
                type="number"
                min="1"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value || '100')}
                className="qty-input"
              />
            </div>
            {searchResults.map((food) => (
              <div key={food.id || food.name} className="food-row">
                <div className="food-info">
                  <strong>{food.name}</strong>
                  {food.brand && <span className="muted"> — {food.brand}</span>}
                  <span className="small"> · {food.calories} kcal, P {food.protein}g (per 100g)</span>
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
                    onClick={() => handleAddFood(food, quantityGrams)}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <PageFooter />
    </div>
  )
}
