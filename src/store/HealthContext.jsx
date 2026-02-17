import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'body-health-app-data'

/** Seed data: Log 1 – Weight & Mass Campaign */
const SEED_LOG1_WEIGHT_CAMPAIGN = [
  { date: '2024-12-01', phase: 'The Peak', value: 149.9, note: '' },
  { date: '2024-12-26', phase: 'Boxing Day', value: 144.0, note: '' },
  { date: '2025-01-04', phase: 'New Year', value: 141.0, note: '' },
  { date: '2025-01-11', phase: 'The Stall', value: 141.0, note: '' },
  { date: '2025-01-18', phase: 'The "Click"', value: 138.8, note: '' },
  { date: '2025-01-25', phase: 'Realism Day', value: 137.4, note: '' },
  { date: '2025-02-01', phase: 'The Grinder', value: 136.7, note: '' },
  { date: '2025-02-08', phase: 'The Sculpt', value: 135.7, note: '' },
  { date: '2025-02-15', phase: 'The Milestone', value: 134.9, note: '' },
]

/** Seed data: Log 2 – Volume & Measurement Delta (area × date grid as flat entries) */
const SEED_LOG2_MEASUREMENT_DELTA = (() => {
  const dates = ['2025-01-18', '2025-01-25', '2025-02-01', '2025-02-08', '2025-02-15']
  const rows = [
    ['Belly', [143, 143, 141.5, 139, 138]],
    ['Hips/Butt', [139, 136, 134, 136, 134]],
    ['Chest', [125, 123, 121, 119.5, 119]],
    ['Upper Arm', [35, 34.5, 35, 35, 35]],
  ]
  const entries = []
  rows.forEach(([name, values]) => {
    dates.forEach((date, i) => {
      entries.push({ date, name, value: values[i], unit: 'cm' })
    })
  })
  return entries.sort((a, b) => new Date(a.date) - new Date(b.date))
})()

/**
 * Store schema aligned to the two log tables:
 * - Log 1: Weight & Mass Campaign → log1WeightCampaign[]
 * - Log 2: Volume & Measurement Delta → log2MeasurementDelta[]
 */
const defaultState = {
  /** Log 1: The Weight & Mass Campaign. Each entry: { date, phase, value, note } */
  log1WeightCampaign: SEED_LOG1_WEIGHT_CAMPAIGN,
  /** Log 2: The Volume & Measurement Delta. Each entry: { date, name, value, unit } */
  log2MeasurementDelta: SEED_LOG2_MEASUREMENT_DELTA,
  exerciseGoals: {
    stepsDaily: 6000,
    pplRotation: [],
    customGoals: [],
    equipment: [],
    /** When true, sync steps from Google Fit every hour while the app is open */
    autoSyncSteps: false,
    /** Last time steps were synced from Google Fit (ISO string) */
    stepsLastSyncedAt: null,
  },
  exerciseLogs: [], // { date, steps, workoutType?, tier?, exercisesDone?: [{ tier, exerciseName, sets }] }
  /** Last "Get workout" result (structured) for quick-log from suggestion */
  lastWorkoutResult: null,
  nutritionLogs: [], // { date, entries: [{ name, barcode?, calories, protein, carbs, fat, ... }] }
  nutritionTargets: {
    calories: 2200,
    protein: 150,
    carbs: 250,
    fat: 70,
  },
  /** Favourite foods for quick-add on Nutrition page */
  nutritionFavourites: [],
  aiApiKey: '',
  aiProvider: 'gemini',
  aiInsights: null,
  /** Last AI-generated workout suggestion (Bronze/Gold/Platinum) for Exercise page */
  exerciseSuggestion: null,
  /** Custom exercise library from "Update workout suggestions" (AI). Same shape as exercises.js. Null = use baseline. */
  customExerciseLibrary: null,
  /** Personal details: used for BMI, rate-of-loss, insights and AI. */
  personalDetails: {
    age: null,
    heightCm: null,
    startingWeightKg: null,
    goalWeightKg: null,
    goalExerciseLevel: 'Gold', // Bronze | Gold | Platinum
    /** IANA timezone e.g. Pacific/Auckland; used for "today" and all date display. */
    timeZone: 'Pacific/Auckland',
  },
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Migrate old keys to log table names
      const migrated = { ...defaultState, ...parsed }
      if (parsed.personalDetails && typeof parsed.personalDetails === 'object') {
        migrated.personalDetails = { ...defaultState.personalDetails, ...parsed.personalDetails }
      }
      if (parsed.exerciseGoals) {
        migrated.exerciseGoals = {
          ...defaultState.exerciseGoals,
          ...parsed.exerciseGoals,
          equipment: Array.isArray(parsed.exerciseGoals.equipment) ? parsed.exerciseGoals.equipment : [],
          autoSyncSteps: !!parsed.exerciseGoals.autoSyncSteps,
          stepsLastSyncedAt: parsed.exerciseGoals.stepsLastSyncedAt ?? null,
        }
      }
      if (parsed.weight && !parsed.log1WeightCampaign) {
        migrated.log1WeightCampaign = parsed.weight
      }
      if (parsed.measurements && !parsed.log2MeasurementDelta) {
        migrated.log2MeasurementDelta = parsed.measurements
      }
      // If logs are empty, use seed as starting dataset
      if (!migrated.log1WeightCampaign?.length) {
        migrated.log1WeightCampaign = SEED_LOG1_WEIGHT_CAMPAIGN
      }
      if (!migrated.log2MeasurementDelta?.length) {
        migrated.log2MeasurementDelta = SEED_LOG2_MEASUREMENT_DELTA
      }
      if (!Array.isArray(migrated.nutritionFavourites)) {
        migrated.nutritionFavourites = []
      }
      return migrated
    }
  } catch (_) {}
  return defaultState
}

function saveState(state) {
  try {
    const toSave = {
      log1WeightCampaign: state.log1WeightCampaign,
      log2MeasurementDelta: state.log2MeasurementDelta,
      exerciseGoals: state.exerciseGoals,
      exerciseLogs: state.exerciseLogs,
      nutritionLogs: state.nutritionLogs,
      nutritionTargets: state.nutritionTargets,
      nutritionFavourites: state.nutritionFavourites,
      exerciseSuggestion: state.exerciseSuggestion,
      customExerciseLibrary: state.customExerciseLibrary,
      lastWorkoutResult: state.lastWorkoutResult,
      personalDetails: state.personalDetails,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (_) {}
}

const HealthContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_WEIGHT':
      return {
        ...state,
        log1WeightCampaign: [...state.log1WeightCampaign, { date: action.date, value: action.value, note: action.note || '', phase: action.phase || '' }].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        ),
      }
    case 'ADD_MEASUREMENT':
      return {
        ...state,
        log2MeasurementDelta: [
          ...state.log2MeasurementDelta,
          {
            date: action.date,
            name: action.name,
            value: action.value,
            unit: action.unit || 'cm',
          },
        ].sort((a, b) => new Date(a.date) - new Date(b.date)),
      }
    case 'UPDATE_WEIGHT':
      return {
        ...state,
        log1WeightCampaign: state.log1WeightCampaign
          .map((e) => (e.date === action.oldDate ? { date: action.date, value: action.value, note: action.note || '', phase: action.phase || '' } : e))
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
      }
    case 'DELETE_WEIGHT':
      return {
        ...state,
        log1WeightCampaign: state.log1WeightCampaign.filter((e) => e.date !== action.date),
      }
    case 'UPDATE_MEASUREMENT':
      return {
        ...state,
        log2MeasurementDelta: state.log2MeasurementDelta
          .map((e) => {
            if (e.date !== action.oldDate || e.name !== action.oldName) return e
            return { date: action.date, name: action.name, value: action.value, unit: action.unit || 'cm' }
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
      }
    case 'DELETE_MEASUREMENT':
      return {
        ...state,
        log2MeasurementDelta: state.log2MeasurementDelta.filter((e) => !(e.date === action.date && e.name === action.name)),
      }
    case 'SET_GOALS':
      return { ...state, exerciseGoals: { ...state.exerciseGoals, ...action.payload } }
    case 'LOG_EXERCISE':
      return {
        ...state,
        exerciseLogs: [...state.exerciseLogs, action.payload].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        ),
      }
    case 'UPDATE_EXERCISE_LOG':
      return {
        ...state,
        exerciseLogs: state.exerciseLogs.map((log) =>
          log.date === action.date ? { ...log, ...action.payload } : log
        ),
      }
    case 'ADD_NUTRITION_ENTRY':
      return {
        ...state,
        nutritionLogs: (() => {
          const date = action.date
          const existing = state.nutritionLogs.find((l) => l.date === date)
          const entry = action.entry
          if (existing) {
            return state.nutritionLogs.map((l) =>
              l.date === date ? { ...l, entries: [...l.entries, entry] } : l
            )
          }
          return [...state.nutritionLogs, { date, entries: [entry] }].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          )
        })(),
      }
    case 'SET_NUTRITION_TARGETS':
      return { ...state, nutritionTargets: { ...state.nutritionTargets, ...action.payload } }
    case 'ADD_NUTRITION_FAVOURITE': {
      const entry = action.payload
      const id = entry.id || entry.barcode || `fav-${(entry.name || '').replace(/\s+/g, '-')}`
      const existing = state.nutritionFavourites.some((f) => (f.id || f.barcode) === (entry.id || entry.barcode) || (f.name === entry.name && (f.barcode || '') === (entry.barcode || '')))
      if (existing) return state
      return { ...state, nutritionFavourites: [...state.nutritionFavourites, { ...entry, id }] }
    }
    case 'REMOVE_NUTRITION_FAVOURITE':
      return {
        ...state,
        nutritionFavourites: state.nutritionFavourites.filter(
          (f) => f.id !== action.payload && f.barcode !== action.payload
        ),
      }
    case 'SET_AI_KEY':
      return { ...state, aiApiKey: action.payload }
    case 'SET_AI_PROVIDER':
      return { ...state, aiProvider: action.payload }
    case 'SET_AI_INSIGHTS':
      return { ...state, aiInsights: action.payload }
    case 'SET_EXERCISE_SUGGESTION':
      return { ...state, exerciseSuggestion: action.payload }
    case 'SET_EXERCISE_LIBRARY':
      return { ...state, customExerciseLibrary: action.payload }
    case 'SET_LAST_WORKOUT_RESULT':
      return { ...state, lastWorkoutResult: action.payload }
    case 'SET_PERSONAL_DETAILS':
      return { ...state, personalDetails: { ...state.personalDetails, ...action.payload } }
    case 'REHYDRATE':
      return { ...defaultState, ...action.payload }
    default:
      return state
  }
}

export function HealthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState, loadState)

  useEffect(() => {
    let key = localStorage.getItem(STORAGE_KEY + '-apikey')
    const defaultKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY
      ? import.meta.env.VITE_GEMINI_API_KEY.trim()
      : ''
    if (!key && defaultKey) {
      key = defaultKey
      localStorage.setItem(STORAGE_KEY + '-apikey', key)
      dispatch({ type: 'SET_AI_KEY', payload: key })
    } else if (key) {
      dispatch({ type: 'SET_AI_KEY', payload: key })
    }
    const provider = localStorage.getItem(STORAGE_KEY + '-ai-provider')
    if (provider === 'openai' || provider === 'gemini') dispatch({ type: 'SET_AI_PROVIDER', payload: provider })
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  const addWeight = useCallback((date, value, note, phase) => {
    dispatch({ type: 'ADD_WEIGHT', date, value, note, phase: phase || '' })
  }, [])
  const addMeasurement = useCallback((date, name, value, unit) => {
    dispatch({ type: 'ADD_MEASUREMENT', date, name, value, unit })
  }, [])
  const updateWeight = useCallback((oldDate, date, value, note, phase) => {
    dispatch({ type: 'UPDATE_WEIGHT', oldDate, date, value, note, phase: phase || '' })
  }, [])
  const deleteWeight = useCallback((date) => {
    dispatch({ type: 'DELETE_WEIGHT', date })
  }, [])
  const updateMeasurement = useCallback((oldDate, oldName, date, name, value, unit) => {
    dispatch({ type: 'UPDATE_MEASUREMENT', oldDate, oldName, date, name, value, unit: unit || 'cm' })
  }, [])
  const deleteMeasurement = useCallback((date, name) => {
    dispatch({ type: 'DELETE_MEASUREMENT', date, name })
  }, [])
  const setGoals = useCallback((payload) => dispatch({ type: 'SET_GOALS', payload }), [])
  const logExercise = useCallback((payload) => dispatch({ type: 'LOG_EXERCISE', payload }), [])
  const updateExerciseLog = useCallback((date, payload) => {
    dispatch({ type: 'UPDATE_EXERCISE_LOG', date, payload })
  }, [])
  const addNutritionEntry = useCallback((date, entry) => {
    dispatch({ type: 'ADD_NUTRITION_ENTRY', date, entry })
  }, [])
  const setNutritionTargets = useCallback((payload) => {
    dispatch({ type: 'SET_NUTRITION_TARGETS', payload })
  }, [])
  const addNutritionFavourite = useCallback((entry) => {
    dispatch({ type: 'ADD_NUTRITION_FAVOURITE', payload: entry })
  }, [])
  const removeNutritionFavourite = useCallback((idOrBarcode) => {
    dispatch({ type: 'REMOVE_NUTRITION_FAVOURITE', payload: idOrBarcode })
  }, [])
  const setAiApiKey = useCallback((key) => {
    if (key) localStorage.setItem(STORAGE_KEY + '-apikey', key)
    else localStorage.removeItem(STORAGE_KEY + '-apikey')
    dispatch({ type: 'SET_AI_KEY', payload: key })
  }, [])
  const setAiProvider = useCallback((provider) => {
    if (provider === 'openai' || provider === 'gemini') {
      localStorage.setItem(STORAGE_KEY + '-ai-provider', provider)
      dispatch({ type: 'SET_AI_PROVIDER', payload: provider })
    }
  }, [])
  const setAiInsights = useCallback((insights) => {
    dispatch({ type: 'SET_AI_INSIGHTS', payload: insights })
  }, [])
  const setExerciseSuggestion = useCallback((text) => {
    dispatch({ type: 'SET_EXERCISE_SUGGESTION', payload: text })
  }, [])
  const setExerciseLibrary = useCallback((library) => {
    dispatch({ type: 'SET_EXERCISE_LIBRARY', payload: library })
  }, [])
  const setLastWorkoutResult = useCallback((result) => {
    dispatch({ type: 'SET_LAST_WORKOUT_RESULT', payload: result })
  }, [])
  const setPersonalDetails = useCallback((payload) => {
    dispatch({ type: 'SET_PERSONAL_DETAILS', payload })
  }, [])

  const value = {
    ...state,
    /** Backward compat / views: Log 1 table data */
    weight: state.log1WeightCampaign,
    /** Backward compat / views: Log 2 table data */
    measurements: state.log2MeasurementDelta,
    addWeight,
    addMeasurement,
    updateWeight,
    deleteWeight,
    updateMeasurement,
    deleteMeasurement,
    setGoals,
    logExercise,
    updateExerciseLog,
    addNutritionEntry,
    setNutritionTargets,
    addNutritionFavourite,
    removeNutritionFavourite,
    setAiApiKey,
    setAiProvider,
    setAiInsights,
    setExerciseSuggestion,
    setExerciseLibrary,
    setLastWorkoutResult,
    setPersonalDetails,
  }

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) throw new Error('useHealth must be used within HealthProvider')
  return ctx
}
