/**
 * Use "How's the body" check-in to adapt workout suggestions.
 * When a body region is sore/painful/iffy/weak, we PREFER exercises that are easier on that area
 * and AVOID (deprioritize) exercises that load it heavily.
 * Match by exercise name (substring or exact).
 */
import { REGION_TO_CANONICAL } from '../data/bodyRegions.js'

const FEELINGS_THAT_MATTER = ['sore', 'iffy', 'painful', 'weak']

/**
 * @param {Record<string, string>} regions - bodyCheckIn regions: { knee_l: 'painful', adductor_r: 'sore' }
 * @returns {string[]} canonical region ids that have a concerning feeling
 */
export function getSoreCanonicalRegions(regions) {
  if (!regions || typeof regions !== 'object') return []
  const canonical = new Set()
  for (const [regionId, feeling] of Object.entries(regions)) {
    const f = (feeling || '').toLowerCase()
    if (FEELINGS_THAT_MATTER.includes(f)) {
      const can = REGION_TO_CANONICAL[regionId] ?? regionId
      canonical.add(can)
    }
  }
  return [...canonical]
}

/**
 * By session type and canonical sore region: exercise name substrings.
 * PREFER = kinder options (e.g. when knee sore: glute bridge, wall sit, reverse lunge).
 * AVOID = high load on that area (e.g. goblet squat full depth, Bulgarian split squat).
 */
const LEGS_PREFER_WHEN_KNEE = [
  'Glute bridge',
  'Wall sit',
  'Reverse lunge',
  'Step-up',
  'Seated calf',
  '90/90',
  'Hip flexor stretch',
]
const LEGS_AVOID_WHEN_KNEE = [
  'Goblet squat (full depth',
  'Bulgarian split squat',
  'Goblet squat (4–6 kg', // still squats; prefer above first
]

const LEGS_PREFER_WHEN_ADDUCTOR = ['Glute bridge', 'Wall sit', 'Reverse lunge', '90/90', 'Hip flexor', 'Seated calf']
const LEGS_AVOID_WHEN_ADDUCTOR = ['Bulgarian split squat', 'Goblet squat (full depth']

const LEGS_PREFER_WHEN_LOWER_BACK = ['Glute bridge', 'Wall sit', 'Chair squat', 'Seated calf', 'Reverse lunge']
const LEGS_AVOID_WHEN_LOWER_BACK = ['Single-leg deadlift', 'Kettlebell swing', 'Bulgarian split squat']

const LEGS_PREFER_WHEN_HIP = ['Glute bridge', '90/90', 'Hip flexor stretch', 'Wall sit', 'Reverse lunge']
const LEGS_AVOID_WHEN_HIP = ['Bulgarian split squat', 'Goblet squat (full depth']

const LEGS_PREFER_WHEN_ANKLE_FOOT = ['Seated calf', 'Glute bridge', 'Wall sit', 'Chair squat']
const LEGS_AVOID_WHEN_ANKLE_FOOT = ['Calf raise (standing', 'Single-leg deadlift', 'Bulgarian split squat']

const PUSH_PREFER_WHEN_SHOULDER = ['Wall push-up', 'Wall slide', 'Incline push-up', 'Knee push-up', 'Seated']
const PUSH_AVOID_WHEN_SHOULDER = ['Pike push-up', 'Decline push-up', 'Tricep dip', 'Overhead press']

const PULL_PREFER_WHEN_SHOULDER = ['Band row', 'Face pull', 'Seated band', 'Band pull-apart']
const PULL_AVOID_WHEN_SHOULDER = ['Pull-up', 'Chin-up', 'Renegade row', 'Inverted row (feet elevated']

const PREFER_MAP = {
  legs: {
    knee: LEGS_PREFER_WHEN_KNEE,
    adductor: LEGS_PREFER_WHEN_ADDUCTOR,
    lower_back: LEGS_PREFER_WHEN_LOWER_BACK,
    hip: LEGS_PREFER_WHEN_HIP,
    ankle_foot: LEGS_PREFER_WHEN_ANKLE_FOOT,
    quad: LEGS_PREFER_WHEN_KNEE, // similar to knee
    hamstring: ['Glute bridge', 'Wall sit', 'Reverse lunge', '90/90'],
    calf: ['Seated calf', 'Glute bridge', 'Wall sit'],
    glute: ['Glute bridge', 'Wall sit', '90/90', 'Hip flexor'],
  },
  push: {
    shoulder: PUSH_PREFER_WHEN_SHOULDER,
    chest: ['Wall push-up', 'Incline push-up', 'Knee push-up', 'Wall slide'],
    neck_back: ['Wall slide', 'Seated'],
  },
  pull: {
    shoulder: PULL_PREFER_WHEN_SHOULDER,
    upper_back: ['Band row', 'Face pull', 'Band pull-apart', 'Band pull-down'],
    neck_back: ['Band row', 'Face pull', 'Seated'],
  },
  mobility: {},
  cardio: {
    knee: ['March', 'Step touches', 'Seated knee', 'Slow step-up'],
    lower_back: ['March', 'Step touches', 'Seated'],
  },
}

const AVOID_MAP = {
  legs: {
    knee: LEGS_AVOID_WHEN_KNEE,
    adductor: LEGS_AVOID_WHEN_ADDUCTOR,
    lower_back: LEGS_AVOID_WHEN_LOWER_BACK,
    hip: LEGS_AVOID_WHEN_HIP,
    ankle_foot: LEGS_AVOID_WHEN_ANKLE_FOOT,
    quad: LEGS_AVOID_WHEN_KNEE,
    hamstring: ['Bulgarian split squat', 'Single-leg deadlift'],
    calf: ['Calf raise (standing', 'Single-leg'],
    glute: [],
  },
  push: {
    shoulder: PUSH_AVOID_WHEN_SHOULDER,
    chest: ['Decline push-up', 'Pike push-up'],
    neck_back: [],
  },
  pull: {
    shoulder: PULL_AVOID_WHEN_SHOULDER,
    upper_back: [],
    neck_back: [],
  },
  mobility: {},
  cardio: {
    knee: ['Moving lunges', 'EMOM swings', 'Step-up + press'],
    lower_back: ['Kettlebell swings', 'EMOM', 'Moving lunges'],
  },
}

function exerciseMatchesAny(name, patterns) {
  if (!name || !patterns?.length) return false
  const n = name.toLowerCase()
  return patterns.some((p) => n.includes(p.toLowerCase()))
}

/**
 * Sort exercises: prefer first, then neutral, then avoid last.
 * @param {Array<{ name: string }>} exercises
 * @param {string} sessionKey - 'legs' | 'push' | 'pull' | 'mobility' | 'cardio'
 * @param {string[]} soreCanonical - canonical region ids
 */
export function sortExercisesByBodyCheckIn(exercises, sessionKey, soreCanonical) {
  if (!exercises?.length || !soreCanonical?.length) return exercises
  const key = sessionKey.toLowerCase()
  const preferPatterns = new Set()
  const avoidPatterns = new Set()
  for (const region of soreCanonical) {
    const pre = PREFER_MAP[key]?.[region] || []
    const av = AVOID_MAP[key]?.[region] || []
    pre.forEach((p) => preferPatterns.add(p))
    av.forEach((p) => avoidPatterns.add(p))
  }
  if (preferPatterns.size === 0 && avoidPatterns.size === 0) return exercises

  const prefer = [...preferPatterns]
  const avoid = [...avoidPatterns]

  return [...exercises].sort((a, b) => {
    const aPrefer = exerciseMatchesAny(a.name, prefer)
    const bPrefer = exerciseMatchesAny(b.name, prefer)
    const aAvoid = exerciseMatchesAny(a.name, avoid)
    const bAvoid = exerciseMatchesAny(b.name, avoid)
    if (aPrefer && !bPrefer) return -1
    if (!aPrefer && bPrefer) return 1
    if (!aAvoid && bAvoid) return -1
    if (aAvoid && !bAvoid) return 1
    return 0
  })
}

/**
 * Build a short summary of body check-in for the AI prompt.
 * @param {Record<string, string>} regions
 * @param {Array<{ id: string, label: string }>} regionList - BODY_REGIONS
 * @param {Array<{ id: string, label: string }>} feelingOptions - FEELING_OPTIONS
 */
export function formatBodyCheckInForPrompt(regions, regionList, feelingOptions) {
  if (!regions || typeof regions !== 'object') return null
  const feelingByKey = (feelingOptions || []).reduce((acc, o) => {
    acc[o.id] = o.label
    return acc
  }, {})
  const entries = []
  for (const [regionId, feelingId] of Object.entries(regions)) {
    const f = (feelingId || '').toLowerCase()
    if (f === 'none' || !f) continue
    const r = regionList?.find((x) => x.id === regionId)
    const label = feelingByKey[f] ?? feelingId
    entries.push(`${r?.label ?? regionId}: ${label}`)
  }
  if (entries.length === 0) return null
  return entries.join('; ')
}
