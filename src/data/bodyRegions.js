/**
 * How the area feels (replaces 0–10 scale).
 */
export const FEELING_OPTIONS = [
  { id: 'none', label: 'No issue', short: 'OK', description: 'Feels fine' },
  { id: 'sore', label: 'Muscle sore', short: 'Sore', description: 'DOMS, tired muscle' },
  { id: 'iffy', label: 'Iffy / niggle', short: 'Iffy', description: 'Something’s off' },
  { id: 'painful', label: 'Painful', short: 'Pain', description: 'Actual pain' },
  { id: 'weak', label: 'Weak', short: 'Weak', description: 'Feels weak or unstable' },
]

/**
 * Body regions for the "How's the body" check-in.
 * cx, cy, r: position on body graphic (viewBox 0 0 120 260). group/order: for list fallback.
 */
export const BODY_REGIONS = [
  { id: 'head', label: 'Head / neck', view: 'front', group: 'Head & neck', order: 0, cx: 60, cy: 22, r: 18 },
  { id: 'neck_back', label: 'Neck (back)', view: 'back', group: 'Head & neck', order: 1, cx: 60, cy: 24, r: 10 },

  { id: 'chest', label: 'Chest', view: 'front', group: 'Upper body (front)', order: 0, cx: 60, cy: 58, r: 20 },
  { id: 'shoulder_l', label: 'Shoulder (L)', view: 'front', group: 'Upper body (front)', order: 1, cx: 28, cy: 55, r: 12 },
  { id: 'shoulder_r', label: 'Shoulder (R)', view: 'front', group: 'Upper body (front)', order: 2, cx: 92, cy: 55, r: 12 },

  { id: 'upper_back', label: 'Upper back / lats', view: 'back', group: 'Upper body (back)', order: 0, cx: 60, cy: 54, r: 22 },
  { id: 'shoulder_back_l', label: 'Shoulder (L)', view: 'back', group: 'Upper body (back)', order: 1, cx: 28, cy: 52, r: 11 },
  { id: 'shoulder_back_r', label: 'Shoulder (R)', view: 'back', group: 'Upper body (back)', order: 2, cx: 92, cy: 52, r: 11 },

  { id: 'abs', label: 'Abs / core', view: 'front', group: 'Core', order: 0, cx: 60, cy: 92, r: 16 },
  { id: 'lower_back', label: 'Lower back', view: 'back', group: 'Core', order: 1, cx: 60, cy: 92, r: 18 },

  { id: 'hip_l', label: 'Hip / outer thigh (L)', view: 'front', group: 'Hips & thighs', order: 0, cx: 38, cy: 122, r: 14 },
  { id: 'hip_r', label: 'Hip / outer thigh (R)', view: 'front', group: 'Hips & thighs', order: 1, cx: 82, cy: 122, r: 14 },
  { id: 'adductor_l', label: 'Inner thigh / adductor (L)', view: 'front', group: 'Hips & thighs', order: 2, cx: 36, cy: 162, r: 10 },
  { id: 'adductor_r', label: 'Inner thigh / adductor (R)', view: 'front', group: 'Hips & thighs', order: 3, cx: 84, cy: 162, r: 10 },
  { id: 'glute_l', label: 'Glute (L)', view: 'back', group: 'Hips & thighs', order: 4, cx: 38, cy: 128, r: 14 },
  { id: 'glute_r', label: 'Glute (R)', view: 'back', group: 'Hips & thighs', order: 5, cx: 82, cy: 128, r: 14 },

  { id: 'quad_l', label: 'Quad / front of thigh (L)', view: 'front', group: 'Legs', order: 0, cx: 38, cy: 198, r: 12 },
  { id: 'quad_r', label: 'Quad / front of thigh (R)', view: 'front', group: 'Legs', order: 1, cx: 82, cy: 198, r: 12 },
  { id: 'hamstring_l', label: 'Hamstring / back of thigh (L)', view: 'back', group: 'Legs', order: 2, cx: 38, cy: 198, r: 12 },
  { id: 'hamstring_r', label: 'Hamstring / back of thigh (R)', view: 'back', group: 'Legs', order: 3, cx: 82, cy: 198, r: 12 },
  { id: 'knee_l', label: 'Knee (L)', view: 'front', group: 'Legs', order: 4, cx: 38, cy: 232, r: 10 },
  { id: 'knee_r', label: 'Knee (R)', view: 'front', group: 'Legs', order: 5, cx: 82, cy: 232, r: 10 },
  { id: 'knee_back_l', label: 'Knee (L) back', view: 'back', group: 'Legs', order: 6, cx: 38, cy: 232, r: 9 },
  { id: 'knee_back_r', label: 'Knee (R) back', view: 'back', group: 'Legs', order: 7, cx: 82, cy: 232, r: 9 },
  { id: 'calf_l', label: 'Calf / shin (L)', view: 'front', group: 'Legs', order: 8, cx: 38, cy: 258, r: 9 },
  { id: 'calf_r', label: 'Calf / shin (R)', view: 'front', group: 'Legs', order: 9, cx: 82, cy: 258, r: 9 },
  { id: 'calf_back_l', label: 'Calf (L)', view: 'back', group: 'Legs', order: 10, cx: 38, cy: 258, r: 9 },
  { id: 'calf_back_r', label: 'Calf (R)', view: 'back', group: 'Legs', order: 11, cx: 82, cy: 258, r: 9 },
  { id: 'ankle_foot_l', label: 'Ankle / foot (L)', view: 'front', group: 'Legs', order: 12, cx: 38, cy: 268, r: 8 },
  { id: 'ankle_foot_r', label: 'Ankle / foot (R)', view: 'front', group: 'Legs', order: 13, cx: 82, cy: 268, r: 8 },
  { id: 'ankle_foot_back_l', label: 'Ankle / foot (L)', view: 'back', group: 'Legs', order: 14, cx: 38, cy: 268, r: 8 },
  { id: 'ankle_foot_back_r', label: 'Ankle / foot (R)', view: 'back', group: 'Legs', order: 15, cx: 82, cy: 268, r: 8 },
]

/** Section order for the list. */
export const BODY_GROUP_ORDER = [
  'Head & neck',
  'Upper body (front)',
  'Upper body (back)',
  'Core',
  'Hips & thighs',
  'Legs',
]

/** Normalize region id for exercise adaptation. */
export const REGION_TO_CANONICAL = {
  knee_l: 'knee',
  knee_r: 'knee',
  knee_back_l: 'knee',
  knee_back_r: 'knee',
  adductor_l: 'adductor',
  adductor_r: 'adductor',
  quad_l: 'quad',
  quad_r: 'quad',
  hamstring_l: 'hamstring',
  hamstring_r: 'hamstring',
  calf_l: 'calf',
  calf_r: 'calf',
  calf_back_l: 'calf',
  calf_back_r: 'calf',
  ankle_foot_l: 'ankle_foot',
  ankle_foot_r: 'ankle_foot',
  ankle_foot_back_l: 'ankle_foot',
  ankle_foot_back_r: 'ankle_foot',
  hip_l: 'hip',
  hip_r: 'hip',
  glute_l: 'glute',
  glute_r: 'glute',
  shoulder_l: 'shoulder',
  shoulder_r: 'shoulder',
  shoulder_back_l: 'shoulder',
  shoulder_back_r: 'shoulder',
  head: 'head',
  chest: 'chest',
  abs: 'abs',
  neck_back: 'neck',
  upper_back: 'upper_back',
  lower_back: 'lower_back',
}

export function getRegionsByView(view) {
  return BODY_REGIONS.filter((r) => r.view === view)
}

/** Groups regions by section for the list UI. Returns array of { group, regions }. */
export function getRegionsByGroup() {
  const byGroup = new Map()
  for (const r of BODY_REGIONS) {
    const g = r.group || 'Other'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g).push(r)
  }
  for (const arr of byGroup.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  return BODY_GROUP_ORDER.map((group) => ({
    group,
    regions: byGroup.get(group) || [],
  })).filter(({ regions }) => regions.length > 0)
}

export function getCanonicalRegion(regionId) {
  return REGION_TO_CANONICAL[regionId] ?? regionId
}
