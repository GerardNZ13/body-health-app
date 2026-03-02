import React, { useState, useCallback, useEffect } from 'react'
import { BODY_REGIONS, FEELING_OPTIONS, getRegionsByGroup } from '../data/bodyRegions'
import './BodyCheckIn.css'

/** Normalize stored value: support old 0–10 numbers for backwards compat */
function normalizeValue(val) {
  if (val == null) return null
  if (typeof val === 'string' && FEELING_OPTIONS.some((f) => f.id === val)) return val
  const n = Number(val)
  if (!Number.isNaN(n)) {
    if (n === 0) return 'none'
    if (n <= 3) return 'sore'
    if (n <= 5) return 'iffy'
    if (n <= 8) return 'painful'
    return 'weak'
  }
  return null
}

export default function BodyCheckIn({ dateKey, regions = {}, setBodyCheckIn, noRingsAbove = false }) {
  const [localRegions, setLocalRegions] = useState(regions)

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

  const setRegionFeeling = useCallback(
    (regionId, feelingId) => {
      const next = { ...localRegions }
      if (feelingId === 'none') {
        delete next[regionId]
      } else {
        next[regionId] = feelingId
      }
      persist(next)
    },
    [localRegions, persist]
  )

  const clearAll = useCallback(() => {
    persist({})
  }, [persist])

  const grouped = getRegionsByGroup()
  const hasAny = Object.keys(localRegions).filter((id) => {
    const v = normalizeValue(localRegions[id])
    return v && v !== 'none'
  }).length > 0

  return (
    <div className={`body-check-in ${noRingsAbove ? 'body-check-in-no-rings-above' : ''}`}>
      <p className="body-check-in-intro muted small">
        Pick any area that&apos;s sore or tight and choose how it feels. We&apos;ll use this to tailor today&apos;s workout.
      </p>

      <div className="body-check-in-list">
        {grouped.map(({ group, regions: groupRegions }) => (
          <div key={group} className="body-check-in-section">
            <h4 className="body-check-in-section-title">{group}</h4>
            <ul className="body-check-in-items">
              {groupRegions.map((region) => {
                const feeling = normalizeValue(localRegions[region.id])
                return (
                  <li key={region.id} className="body-check-in-row">
                    <span className="body-check-in-label">{region.label}</span>
                    <div className="body-check-in-feelings-inline" role="group" aria-label={`${region.label}, how it feels`}>
                      {FEELING_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`body-check-in-feel-btn body-check-in-feel-${opt.id} ${feeling === opt.id ? 'active' : ''}`}
                          onClick={() => setRegionFeeling(region.id, opt.id)}
                          aria-pressed={feeling === opt.id}
                          title={opt.description}
                        >
                          {opt.short}
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {hasAny && (
        <div className="body-check-in-summary">
          <span className="muted small">Noted: </span>
          {Object.entries(localRegions)
            .filter(([, v]) => {
              const f = normalizeValue(v)
              return f && f !== 'none'
            })
            .map(([id, val]) => {
              const r = BODY_REGIONS.find((x) => x.id === id)
              const feeling = FEELING_OPTIONS.find((f) => f.id === normalizeValue(val))
              return (
                <span key={id} className={`body-check-in-tag body-check-in-tag-${normalizeValue(val)}`}>
                  {r?.label ?? id} — {feeling?.label ?? val}
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
