import React, { useState, useCallback, useEffect } from 'react'
import { BODY_REGIONS, getRegionsByView } from '../data/bodyRegions'
import './BodyCheckIn.css'

const VIEWBOX = '0 0 100 280'

/** Simple body outline path (front and back) for visual context. */
const BODY_OUTLINE_FRONT = 'M 50 4 A 16 18 0 0 1 50 36 L 28 38 Q 18 52 22 72 L 28 118 L 30 200 L 32 260 L 38 278 L 50 278 L 62 278 L 68 260 L 70 200 L 72 118 L 78 72 Q 82 52 72 38 Z'
const BODY_OUTLINE_BACK = 'M 50 4 A 16 18 0 0 1 50 36 L 28 40 Q 20 55 24 75 L 30 120 L 32 200 L 34 258 L 50 278 L 66 258 L 68 200 L 70 120 L 76 75 Q 80 55 72 40 Z'

export default function BodyCheckIn({ dateKey, regions = {}, setBodyCheckIn }) {
  const [view, setView] = useState('front')
  const [localRegions, setLocalRegions] = useState(regions)
  const [activeRegion, setActiveRegion] = useState(null)

  useEffect(() => {
    setLocalRegions(regions)
  }, [dateKey, regions])

  const persist = useCallback(
    (next) => {
      setLocalRegions(next)
      setBodyCheckIn(dateKey, next)
    },
    [dateKey, setBodyCheckIn]
  )

  const handleRegionClick = useCallback(
    (regionId) => {
      setActiveRegion(regionId)
    },
    []
  )

  const setRegionLevel = useCallback(
    (regionId, level) => {
      const next = { ...localRegions }
      if (level === 0) {
        delete next[regionId]
      } else {
        next[regionId] = level
      }
      persist(next)
      setActiveRegion(null)
    },
    [localRegions, persist]
  )

  const clearAll = useCallback(() => {
    persist({})
    setActiveRegion(null)
  }, [persist])

  const regionsForView = getRegionsByView(view)
  const outlinePath = view === 'front' ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK
  const hasAny = Object.keys(localRegions).length > 0

  return (
    <div className="body-check-in">
      <p className="body-check-in-intro muted small">
        Tap an area that&apos;s sore or tight, then rate discomfort 0–10. We&apos;ll use this to tailor today&apos;s workout.
      </p>

      <div className="body-check-in-view-toggle">
        <button
          type="button"
          className={`btn btn-sm ${view === 'front' ? 'active' : ''}`}
          onClick={() => setView('front')}
          aria-pressed={view === 'front'}
        >
          Front
        </button>
        <button
          type="button"
          className={`btn btn-sm ${view === 'back' ? 'active' : ''}`}
          onClick={() => setView('back')}
          aria-pressed={view === 'back'}
        >
          Back
        </button>
      </div>

      <div className="body-check-in-map-wrap">
        <svg
          className="body-check-in-svg"
          viewBox={VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <path
            className="body-check-in-outline"
            d={outlinePath}
            fill="var(--body-outline-fill, rgba(0,0,0,0.06))"
            stroke="var(--body-outline-stroke, rgba(0,0,0,0.08))"
            strokeWidth="0.5"
          />
          {regionsForView.map((region) => {
            const level = localRegions[region.id] ?? 0
            const isActive = activeRegion === region.id
            const hasValue = level > 0
            return (
              <g key={region.id}>
                <circle
                  className={`body-check-in-zone ${hasValue ? 'has-value' : ''} ${isActive ? 'active' : ''}`}
                  cx={region.cx}
                  cy={region.cy}
                  r={region.r}
                  data-region-id={region.id}
                  data-level={level}
                  onClick={() => handleRegionClick(region.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRegionClick(region.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.label}, discomfort ${level}/10`}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {activeRegion && (
        <div className="body-check-in-rating" role="dialog" aria-label="Rate discomfort">
          <span className="body-check-in-rating-label">
            {BODY_REGIONS.find((r) => r.id === activeRegion)?.label ?? activeRegion}
          </span>
          <div className="body-check-in-rating-buttons">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${(localRegions[activeRegion] ?? 0) === n ? 'active' : ''}`}
                onClick={() => setRegionLevel(activeRegion, n)}
                aria-pressed={(localRegions[activeRegion] ?? 0) === n}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="muted small">0 = fine, 10 = severe</p>
        </div>
      )}

      {hasAny && (
        <div className="body-check-in-summary">
          <span className="muted small">Noted: </span>
          {Object.entries(localRegions)
            .filter(([, v]) => v > 0)
            .map(([id, level]) => {
              const r = BODY_REGIONS.find((x) => x.id === id)
              return (
                <span key={id} className="body-check-in-tag">
                  {r?.label ?? id} {level}/10
                </span>
              )
            })}
          <button type="button" className="btn-link body-check-in-clear muted small" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
