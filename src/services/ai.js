/**
 * AI insights from weight and measurement history.
 * Uses the Holistic Body & Mind Coach context (see src/config/coachContext.js).
 */
import { COACH_SYSTEM_PROMPT } from '../config/coachContext.js'

function buildUserPrompt(weight = [], measurements = [], personalDetails = null) {
  const recentWeight = weight.slice(-30).map((w) => `${w.date}: ${w.value} kg${w.phase ? ` [${w.phase}]` : ''}${w.note ? ` (${w.note})` : ''}`).join('\n')
  const recentMeas = measurements.slice(-50).map((m) => `${m.date} ${m.name}: ${m.value} ${m.unit}`).join('\n')
  let profileBlock = ''
  if (personalDetails && (personalDetails.age != null || personalDetails.heightCm != null || personalDetails.startingWeightKg != null || personalDetails.goalWeightKg != null)) {
    const parts = []
    if (personalDetails.age != null) parts.push(`age ${personalDetails.age}`)
    if (personalDetails.heightCm != null) parts.push(`height ${personalDetails.heightCm} cm`)
    if (personalDetails.startingWeightKg != null) parts.push(`starting weight ${personalDetails.startingWeightKg} kg`)
    if (personalDetails.goalWeightKg != null) parts.push(`goal weight ${personalDetails.goalWeightKg} kg`)
    if (personalDetails.goalExerciseLevel) parts.push(`goal exercise level ${personalDetails.goalExerciseLevel}`)
    profileBlock = `\nUser profile: ${parts.join(', ')}.\n`
  }
  return `Here is the user's current data. Using your coach persona and the rules you were given, respond with Bronze / Gold / Platinum+ options. Consider energy, leg load (steps/soreness), and progress toward their goals. Use ONLY this data; do not invent numbers.${profileBlock}

Weight history (Log 1 – most recent last):
${recentWeight || 'No weight data yet.'}

Body measurements (Log 2 – most recent last):
${recentMeas || 'No measurement data yet.'}`
}

export async function fetchOpenAiInsights(apiKey, { weight = [], measurements = [], personalDetails = null }) {
  const userPrompt = buildUserPrompt(weight, measurements, personalDetails)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: COACH_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 700,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  return text || 'No response.'
}

/**
 * Google Gemini API. Uses gemini-2.0-flash-lite (free tier often has quota; fallback from 2.0-flash).
 * Get a free API key at https://aistudio.google.com/apikey
 */
const GEMINI_MODEL = 'gemini-2.0-flash-lite'
export async function fetchGeminiInsights(apiKey, { weight = [], measurements = [], personalDetails = null }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: COACH_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(weight, measurements, personalDetails) }] }],
      generationConfig: {
        maxOutputTokens: 700,
        temperature: 0.7,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || err?.message || `API error ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Response was blocked by safety filters.')
  }
  return text || 'No response.'
}

export async function fetchAiInsights(provider, apiKey, { weight = [], measurements = [], personalDetails = null }) {
  if (!apiKey) throw new Error('API key required.')
  if (provider === 'openai') return fetchOpenAiInsights(apiKey, { weight, measurements, personalDetails })
  if (provider === 'gemini') return fetchGeminiInsights(apiKey, { weight, measurements, personalDetails })
  throw new Error(`Unknown provider: ${provider}`)
}

/** Build user prompt for workout suggestion (Exercise page). Uses weight + workout type + recent tier history. */
function buildExercisePrompt(workoutType, currentWeightKg, exerciseLogs = [], stepsToday) {
  const recentWithTier = exerciseLogs
    .filter((l) => l.workoutType)
    .slice(-10)
    .map((l) => `${l.date} ${l.workoutType}${l.tier ? ` (${l.tier})` : ''}`)
    .join('\n')
  return `The user is asking for TODAY'S WORKOUT SUGGESTION.

Workout type for this session: **${workoutType}**
Current weight: **${currentWeightKg != null ? currentWeightKg + ' kg' : 'unknown (log weight on Weight & Body page)'}**
Today's steps so far: ${stepsToday != null ? stepsToday : 'not logged'}

Recent sessions (type and tier they did):
${recentWithTier || 'No recent workout logs with tier yet.'}

Respond with a concrete workout in Bronze / Gold / Platinum+ format. For each tier, list specific exercises appropriate for their current weight (e.g. wall push-up vs knee vs full push-up for Push day). Use their equipment: 4 kg and 6 kg kettlebells. If they have been doing mostly Gold lately, include a clear progression so Platinum becomes the next target. End with one List D (mobility) cool-down and a Leg Health reminder if steps are high or they reported fatigue. Plain text only, no markdown.`
}

export async function fetchExerciseSuggestion(provider, apiKey, { workoutType, weight = [], exerciseLogs = [], stepsToday }) {
  const currentWeightKg = weight.length ? weight[weight.length - 1].value : null
  const userPrompt = buildExercisePrompt(workoutType, currentWeightKg, exerciseLogs, stepsToday)
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COACH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error ${res.status}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || 'No response.'
  }
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COACH_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || err?.message || `API error ${res.status}`)
    }
    const data = await res.json()
    if (data.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Response blocked by safety filters.')
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response.'
  }
  throw new Error(`Unknown provider: ${provider}`)
}

const LIBRARY_UPDATE_PROMPT = `You are building an exercise library for a holistic body coach app. The user has 4 kg and 6 kg kettlebells, resistance band, wall, chair, bench. Tiers are based on ability and readiness, not body weight: Bronze = building base/recovery/low energy, Gold = intermediate, Platinum = advanced. Include sets and reps for every exercise.

Output ONLY valid JSON, no markdown or other text. Structure exactly (each exercise must have name, description, equipment, sets, reps):
{"push":{"bronze":[{"name":"...","description":"...","equipment":"...","sets":2,"reps":"8-12"}],"gold":[...],"platinum":[...]},"pull":{"bronze":[...],"gold":[...],"platinum":[...]},"legs":{"bronze":[...],"gold":[...],"platinum":[...]},"mobility":{"bronze":[...],"gold":[...],"platinum":[...]},"cardio":{"bronze":[...],"gold":[...],"platinum":[...]}}

Rules:
- Bronze = building base, recovery, or low energy: lowest impact, seated/wall/band options, 2 sets, lower reps or time (e.g. "8-10", "20-30s hold").
- Gold = intermediate ability: standard progressions, 3 sets, 8–12 reps (or time-based for cardio/mobility).
- Platinum = advanced ability: full range, 3–4 sets, 10–15 reps or higher density.
- 5–8 exercises per tier per category. Variety: Push (chest/shoulders/triceps), Pull (back/biceps), Legs (quads/glutes/calves), Mobility (spine, hips, stretching), Cardio (functional, heart rate).
- sets = number (e.g. 2 or 3). reps = string: "8-12", "10", "20-30s hold", "2-5 min", "30s on", etc.
- Equipment: what is needed (e.g. "4–6 kg KB", "Wall", "Band"). Description: one short line on how to do it or who it suits.`

function parseLibraryFromResponse(text) {
  if (!text || typeof text !== 'string') return null
  let raw = text.trim()
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) raw = codeBlock[1].trim()
  try {
    const parsed = JSON.parse(raw)
    if (parsed.push?.bronze && parsed.pull?.bronze && parsed.legs?.bronze && parsed.mobility?.bronze && parsed.cardio?.bronze) return parsed
  } catch (_) {}
  return null
}

/**
 * Call AI to generate/refresh the full exercise library. Returns parsed library or null.
 * @param {string[]} [userEquipment] - Equipment the user has; AI will favor exercises using these.
 */
export async function fetchAndUpdateExerciseLibrary(provider, apiKey, userEquipment = []) {
  const equipmentLine = userEquipment?.length
    ? `\n\nUser's equipment (only suggest exercises that use these or bodyweight): ${userEquipment.join(', ')}.`
    : ''
  const prompt = LIBRARY_UPDATE_PROMPT + equipmentLine
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COACH_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `API error ${res.status}`)
    }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    return parseLibraryFromResponse(text)
  }
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COACH_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || err?.message || `API error ${res.status}`)
    }
    const data = await res.json()
    if (data.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Response blocked by safety filters.')
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    return parseLibraryFromResponse(text)
  }
  throw new Error(`Unknown provider: ${provider}`)
}
