import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'body-health-app-data'
const STORAGE_KEY_CURRENT = STORAGE_KEY + '-current'

function dataKey(code) {
  return `${STORAGE_KEY}-data-${code}`
}

/** Generate a short unique profile code (8 chars, easy to type: A–Z + 2–9). */
export function generateProfileCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Store schema aligned to the two log tables:
 * - Log 1: Weight & Mass Campaign → log1WeightCampaign[]
 * - Log 2: Volume & Measurement Delta → log2MeasurementDelta[]
 * No seed data: each person starts with empty logs for a unique experience.
 * profileCode: null = no profile selected (show gate); string = current profile, data in localStorage under data-{code}.
 */
const defaultState = {
  profileCode: null,
  /** Log 1: The Weight & Mass Campaign. Each entry: { date, phase, value, note } */
  log1WeightCampaign: [],
  /** Log 2: The Volume & Measurement Delta. Each entry: { date, name, value, unit } */
  log2MeasurementDelta: [],
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
    goalExerciseLevel: 'Gold', // Bronze | Gold | Platinum — activity level you want to be at
    /** Desired weight loss rate when in deficit: Bronze 0–0.5, Gold 0.5–1, Platinum 1+ kg/week */
    desiredLossRateTier: 'Gold',
    /** IANA timezone e.g. Pacific/Auckland; used for "today" and all date display. */
    timeZone: 'Pacific/Auckland',
  },
}

/** Migrate parsed blob to full state shape (no profileCode in blob). */
function migrateParsedState(parsed) {
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
  if (!Array.isArray(migrated.log1WeightCampaign)) {
    migrated.log1WeightCampaign = []
  }
  if (!Array.isArray(migrated.log2MeasurementDelta)) {
    migrated.log2MeasurementDelta = []
  }
  if (!Array.isArray(migrated.nutritionFavourites)) {
    migrated.nutritionFavourites = []
  }
  return migrated
}

/** True if profile has no meaningful data (recovery candidate from legacy). */
function isProfileEmpty(state) {
  const hasWeight = state.log1WeightCampaign?.length > 0
  const hasNutrition = state.nutritionLogs?.length > 0
  const hasExercise = state.exerciseLogs?.length > 0
  const hasPersonal = state.personalDetails && (
    state.personalDetails.age != null ||
    state.personalDetails.heightCm != null ||
    state.personalDetails.goalWeightKg != null
  )
  return !hasWeight && !hasNutrition && !hasExercise && !hasPersonal
}

/** Restore from legacy key into state, preserve profileCode, remove legacy key. */
function restoreFromLegacy(code) {
  const legacyRaw = localStorage.getItem(STORAGE_KEY)
  if (!legacyRaw) return null
  try {
    const parsed = JSON.parse(legacyRaw)
    const migrated = migrateParsedState(parsed)
    const legacyKey = localStorage.getItem(STORAGE_KEY + '-apikey')
    const legacyProvider = localStorage.getItem(STORAGE_KEY + '-ai-provider')
    if (legacyKey) migrated.aiApiKey = legacyKey
    if (legacyProvider === 'openai' || legacyProvider === 'gemini') migrated.aiProvider = legacyProvider
    const toSave = {
      log1WeightCampaign: migrated.log1WeightCampaign,
      log2MeasurementDelta: migrated.log2MeasurementDelta,
      exerciseGoals: migrated.exerciseGoals,
      exerciseLogs: migrated.exerciseLogs,
      nutritionLogs: migrated.nutritionLogs,
      nutritionTargets: migrated.nutritionTargets,
      nutritionFavourites: migrated.nutritionFavourites,
      exerciseSuggestion: migrated.exerciseSuggestion,
      customExerciseLibrary: migrated.customExerciseLibrary,
      lastWorkoutResult: migrated.lastWorkoutResult,
      personalDetails: migrated.personalDetails,
      aiApiKey: migrated.aiApiKey,
      aiProvider: migrated.aiProvider,
    }
    localStorage.setItem(dataKey(code), JSON.stringify(toSave))
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (_) {}
    return { ...migrated, profileCode: code }
  } catch (_) {
    return null
  }
}

/** Load state for initial render: use current profile code and data from localStorage. */
function loadState() {
  try {
    let code = localStorage.getItem(STORAGE_KEY_CURRENT)
    if (!code || !code.trim()) {
      // No profile code: try to migrate legacy single-key data into a new profile
      const legacyRaw = localStorage.getItem(STORAGE_KEY)
      if (legacyRaw) {
        const restored = restoreFromLegacy(generateProfileCode())
        if (restored) {
          localStorage.setItem(STORAGE_KEY_CURRENT, restored.profileCode)
          return restored
        }
      }
      return { ...defaultState, profileCode: null }
    }
    const raw = localStorage.getItem(dataKey(code))
    if (raw) {
      const parsed = JSON.parse(raw)
      const migrated = migrateParsedState(parsed)
      // Recovery: if current profile is empty but old key still has data, restore it
      if (isProfileEmpty(migrated) && localStorage.getItem(STORAGE_KEY)) {
        const restored = restoreFromLegacy(code)
        if (restored) return restored
      }
      return { ...migrated, profileCode: code }
    }
    // Code exists but no data yet: try to restore from legacy (e.g. they created profile before migration ran)
    if (localStorage.getItem(STORAGE_KEY)) {
      const restored = restoreFromLegacy(code)
      if (restored) return restored
    }
    return { ...defaultState, profileCode: code }
  } catch (_) {}
  return { ...defaultState, profileCode: null }
}

function saveState(state) {
  if (!state.profileCode) return
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
      aiApiKey: state.aiApiKey,
      aiProvider: state.aiProvider,
    }
    localStorage.setItem(dataKey(state.profileCode), JSON.stringify(toSave))
    localStorage.setItem(STORAGE_KEY_CURRENT, state.profileCode)
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
    case 'SET_DAY_HYDRATION': {
      const { date, hydrationCheck, refills } = action.payload
      const existing = state.nutritionLogs.find((l) => l.date === date)
      const next = {
        hydrationCheck: hydrationCheck !== undefined ? hydrationCheck : existing?.hydrationCheck,
        refills: refills !== undefined ? refills : existing?.refills,
      }
      if (existing) {
        return {
          ...state,
          nutritionLogs: state.nutritionLogs.map((l) =>
            l.date === date ? { ...l, ...next } : l
          ),
        }
      }
      return {
        ...state,
        nutritionLogs: [...state.nutritionLogs, { date, entries: [], ...next }].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        ),
      }
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
    case 'CREATE_PROFILE':
      return { ...defaultState, profileCode: action.payload.code }
    case 'LOAD_PROFILE':
      return { ...defaultState, ...action.payload.state, profileCode: action.payload.code }
    case 'CLEAR_PROFILE':
      return { ...defaultState, profileCode: null }
    case 'REHYDRATE':
      return { ...defaultState, ...action.payload }
    default:
      return state
  }
}

export function HealthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState, loadState)

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
  const setDayHydration = useCallback((date, payload) => {
    dispatch({ type: 'SET_DAY_HYDRATION', payload: { date, ...payload } })
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
    dispatch({ type: 'SET_AI_KEY', payload: key || '' })
  }, [])
  const setAiProvider = useCallback((provider) => {
    if (provider === 'openai' || provider === 'gemini') {
      dispatch({ type: 'SET_AI_PROVIDER', payload: provider })
    }
  }, [])

  const createProfile = useCallback((code) => {
    dispatch({ type: 'CREATE_PROFILE', payload: { code: code.trim().toUpperCase() } })
  }, [])
  const loadProfile = useCallback((code) => {
    const c = code.trim().toUpperCase()
    if (!c) return false
    try {
      const raw = localStorage.getItem(dataKey(c))
      if (raw) {
        const parsed = JSON.parse(raw)
        dispatch({ type: 'LOAD_PROFILE', payload: { code: c, state: migrateParsedState(parsed) } })
        return true
      }
      // No data for this code: still switch to it with empty state (new device / new profile)
      dispatch({ type: 'CREATE_PROFILE', payload: { code: c } })
      return true
    } catch (_) {
      return false
    }
  }, [])
  const clearProfile = useCallback(() => {
    dispatch({ type: 'CLEAR_PROFILE' })
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT)
    } catch (_) {}
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
    setDayHydration,
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
    createProfile,
    loadProfile,
    clearProfile,
  }

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

export function useHealth() {
  const ctx = useContext(HealthContext)
  if (!ctx) throw new Error('useHealth must be used within HealthProvider')
  return ctx
}
