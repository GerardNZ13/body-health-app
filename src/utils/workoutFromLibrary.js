/**
 * Build today's workout from the exercise library using tier history, goal level, and equipment.
 * Tiers (Bronze / Gold / Platinum) are based on ability and readiness, not body weight.
 * Returns structured Bronze / Gold / Platinum lists and an optional note.
 */
import { EXERCISES_BASELINE, getLibraryKey } from '../data/exercises.js'

/**
 * Map exercise equipment string to tags we can match against user equipment.
 * Bench, chair, table, floor, step are separate so we don't show bench-only exercises when user has only chair.
 */
function getEquipmentTags(equipmentStr) {
  if (!equipmentStr || typeof equipmentStr !== 'string') return []
  const s = equipmentStr.toLowerCase()
  const tags = []
  if (/\b(kb|kettlebell|kg)\b/.test(s)) tags.push('kettlebell')
  if (/\bband\b/.test(s)) tags.push('band')
  if (/\bwall\b/.test(s)) tags.push('wall')
  if (/\bbench\b/.test(s)) tags.push('bench')
  if (/\bchair\b/.test(s)) tags.push('chair')
  if (/\btable\b/.test(s)) tags.push('table')
  if (/\bfloor\b/.test(s)) tags.push('floor')
  if (/\bstep\b/.test(s)) tags.push('step')
  if (/\bbar\b/.test(s)) tags.push('bar')
  if (/\bplate\b/.test(s)) tags.push('plates')
  if (/\b(dumbbell|db)\b/.test(s)) tags.push('dumbbell')
  if (tags.length === 0 && (s === 'none' || s === '')) return []
  if (tags.length === 0) tags.push('bodyweight')
  return tags
}

/**
 * User equipment list (e.g. ["Kettlebell 4kg", "Bench", "Chair"]) → normalized tags.
 * Bench and Chair are separate: only add 'bench' if user selected Bench, 'chair' if Chair.
 * Always include bodyweight and floor (everyone has floor).
 */
function getUserTags(userEquipment) {
  if (!Array.isArray(userEquipment) || userEquipment.length === 0) return null
  const all = userEquipment.join(' ').toLowerCase()
  const tags = ['bodyweight', 'floor']
  if (/\b(kb|kettlebell|kg)\b/.test(all)) tags.push('kettlebell')
  if (/\bband\b/.test(all)) tags.push('band')
  if (/\bwall\b/.test(all)) tags.push('wall')
  if (/\bbench\b/.test(all)) {
    tags.push('bench')
    tags.push('step') // bench is often used for step-ups
  }
  if (/\bchair\b/.test(all)) tags.push('chair')
  if (/\btable\b/.test(all)) tags.push('table')
  if (/\bstep\b/.test(all)) tags.push('step')
  if (/\bstair\b/.test(all)) tags.push('step')
  if (/\b(mat|yoga)\b/.test(all)) {
    tags.push('mat')
    tags.push('step') // mat/floor users often have stairs or a step
  }
  if (/\bbar\b/.test(all)) tags.push('bar')
  if (/\bplate\b/.test(all)) tags.push('plates')
  if (/\b(dumbbell|db)\b/.test(all)) tags.push('dumbbell')
  return tags
}

/** True if exercise can be done with user's equipment. No equipment = show all. */
function exerciseMatchesEquipment(exercise, userEquipment) {
  const userTags = getUserTags(userEquipment)
  if (userTags == null) return true
  const need = getEquipmentTags(exercise.equipment)
  if (need.length === 0) return true
  return need.some((t) => userTags.includes(t))
}

function filterByEquipment(arr, userEquipment) {
  if (!arr) return []
  if (!userEquipment?.length) return arr
  return arr.filter((e) => exerciseMatchesEquipment(e, userEquipment))
}

/**
 * @param {string} sessionType - Push | Pull | Legs | Mobility | Cardio
 * @param {number|null} currentWeightKg - Unused; tiers are ability-based. Kept for API compat.
 * @param {Array<{ tier?: string, exercisesDone?: Array<{tier,exerciseName,sets}> }>} recentLogs - Recent exercise logs
 * @param {object|null} customLibrary - Override library or null
 * @param {string[]} userEquipment - Equipment you have (filters suggested exercises)
 * @param {string|null} goalExerciseLevel - Preferred tier from Personal details (Bronze|Gold|Platinum)
 * @returns {{ bronze, gold, platinum, note?, sessionType }}
 */
export function getWorkoutFromLibrary(sessionType, currentWeightKg, recentLogs = [], customLibrary = null, userEquipment = [], goalExerciseLevel = null) {
  const library = customLibrary || EXERCISES_BASELINE
  const key = getLibraryKey(sessionType)
  const category = library[key]
  if (!category || !category.bronze) {
    return {
      sessionType,
      bronze: [],
      gold: [],
      platinum: [],
      note: 'No exercises found for this session type.',
    }
  }

  // Tier counts: Bronze 2–4 (all core), Gold 3–5 (most core, rest builders), Platinum 4–6 (2/3–3/4 core).
  // Library is ordered core first, so slice to max count after equipment filter.
  const BRONZE_MAX = 4
  const GOLD_MAX = 5
  const PLATINUM_MAX = 6
  let bronze = filterByEquipment(category.bronze || [], userEquipment).slice(0, BRONZE_MAX)
  let gold = filterByEquipment(category.gold || [], userEquipment).slice(0, GOLD_MAX)
  let platinum = filterByEquipment(category.platinum || [], userEquipment).slice(0, PLATINUM_MAX)

  const tiersLogged = recentLogs.map((l) => {
    if (l.exercisesDone?.length) {
      const tiers = l.exercisesDone.map((d) => (d.tier || '').toLowerCase()).filter(Boolean)
      if (tiers.some((t) => t === 'platinum')) return 'platinum'
      if (tiers.some((t) => t === 'gold')) return 'gold'
      if (tiers.some((t) => t === 'bronze')) return 'bronze'
    }
    return (l.tier || '').toLowerCase()
  }).filter(Boolean)
  const goldCount = tiersLogged.filter((t) => t === 'gold').length
  const platinumCount = tiersLogged.filter((t) => t === 'platinum').length
  const bronzeCount = tiersLogged.filter((t) => t === 'bronze').length
  const goalTier = goalExerciseLevel ? goalExerciseLevel.toLowerCase() : null

  // Suitability: only show Platinum if user has logged Gold/Platinum or goal is Gold/Platinum (avoid overwhelming true beginners).
  const hasDoneGoldOrPlatinum = goldCount > 0 || platinumCount > 0
  const goalIsIntermediateOrAbove = goalTier === 'gold' || goalTier === 'platinum'
  if (platinum.length > 0 && !hasDoneGoldOrPlatinum && !goalIsIntermediateOrAbove) {
    platinum = []
  }

  let note = ''
  if (tiersLogged.length >= 3 && goldCount >= tiersLogged.length * 0.6 && platinumCount === 0) {
    note = (note ? note + ' ' : '') + 'You’ve been doing a lot of Gold—try one Platinum option this session to progress.'
  } else if (bronzeCount >= tiersLogged.length * 0.5 && goldCount < 2) {
    note = (note ? note + ' ' : '') + 'Building from Bronze. Add one Gold exercise when ready.'
  }
  if (goalTier === 'platinum' && note.indexOf('Platinum') === -1) {
    note = (note ? note + ' ' : '') + 'Your goal level is Platinum—aim to include at least one Platinum option when you can.'
  } else if (goalTier === 'gold' && platinumCount === 0 && goldCount < 2) {
    note = (note ? note + ' ' : '') + 'Your goal level is Gold—try to hit Gold for this session.'
  }
  // Weight suitability: encourage supported options (Bronze) when weight is higher, without excluding tiers.
  const weightKg = currentWeightKg != null && currentWeightKg > 0 ? currentWeightKg : null
  if (weightKg != null && weightKg >= 100 && note.indexOf('weight') === -1) {
    note = (note ? note + ' ' : '') + 'At your current weight, Bronze (wall, chair) options are especially joint-friendly; progress when you feel ready.'
  }
  if (!note) {
    note = 'Choose the tier that matches your ability and how you feel today—not your weight.'
  }

  return { sessionType, bronze, gold, platinum, note: note || undefined }
}

/** From exercisesDone array, derive effective tier (highest tier they did). */
export function deriveEffectiveTier(exercisesDone) {
  if (!exercisesDone?.length) return null
  const tiers = exercisesDone.map((d) => (d.tier || '').toLowerCase()).filter(Boolean)
  if (tiers.some((t) => t === 'platinum')) return 'Platinum'
  if (tiers.some((t) => t === 'gold')) return 'Gold'
  if (tiers.some((t) => t === 'bronze')) return 'Bronze'
  return null
}

/**
 * Format workout result as plain text for display (e.g. in suggestion box).
 */
export function formatWorkoutForDisplay(workout) {
  const lines = []
  if (workout.note) lines.push(workout.note + '\n')
  const fmt = (label, arr) => {
    if (!arr || !arr.length) return
    lines.push(`${label}`)
    arr.forEach((e) => {
      const eq = e.equipment ? ` (${e.equipment})` : ''
      const setsReps = (e.sets != null && e.reps) ? ` — ${e.sets} set${e.sets !== 1 ? 's' : ''} × ${e.reps}` : ''
      const desc = e.description ? ` — ${e.description}` : ''
      lines.push(`• ${e.name}${eq}${setsReps}${desc}`)
    })
    lines.push('')
  }
  fmt('Bronze (building base / recovery / low energy)', workout.bronze)
  fmt('Gold (intermediate / standard)', workout.gold)
  fmt('Platinum (advanced / high energy)', workout.platinum)
  lines.push('End with a mobility move and leg health protocol if needed.')
  return lines.join('\n').trim()
}
