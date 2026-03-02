/**
 * Body regions for the "How's the body" check-in.
 * Each region has id, label, view (front | back), and SVG position (cx, cy, r) for the clickable area.
 * viewBox for the SVG is 0 0 100 280 (portrait body).
 */
export const BODY_REGIONS = [
  // Front
  { id: 'head', label: 'Head / neck', view: 'front', cx: 50, cy: 18, r: 14 },
  { id: 'chest', label: 'Chest', view: 'front', cx: 50, cy: 55, r: 20 },
  { id: 'shoulder_l', label: 'Shoulder (L)', view: 'front', cx: 22, cy: 52, r: 12 },
  { id: 'shoulder_r', label: 'Shoulder (R)', view: 'front', cx: 78, cy: 52, r: 12 },
  { id: 'abs', label: 'Abs / core', view: 'front', cx: 50, cy: 88, r: 16 },
  { id: 'hip_l', label: 'Hip / outer thigh (L)', view: 'front', cx: 32, cy: 118, r: 14 },
  { id: 'hip_r', label: 'Hip / outer thigh (R)', view: 'front', cx: 68, cy: 118, r: 14 },
  { id: 'adductor_l', label: 'Inner thigh / adductor (L)', view: 'front', cx: 30, cy: 158, r: 10 },
  { id: 'adductor_r', label: 'Inner thigh / adductor (R)', view: 'front', cx: 70, cy: 158, r: 10 },
  { id: 'quad_l', label: 'Quad (L)', view: 'front', cx: 32, cy: 195, r: 12 },
  { id: 'quad_r', label: 'Quad (R)', view: 'front', cx: 68, cy: 195, r: 12 },
  { id: 'knee_l', label: 'Knee (L)', view: 'front', cx: 32, cy: 228, r: 10 },
  { id: 'knee_r', label: 'Knee (R)', view: 'front', cx: 68, cy: 228, r: 10 },
  { id: 'calf_l', label: 'Calf / shin (L)', view: 'front', cx: 32, cy: 255, r: 9 },
  { id: 'calf_r', label: 'Calf / shin (R)', view: 'front', cx: 68, cy: 255, r: 9 },
  { id: 'ankle_foot_l', label: 'Ankle / foot (L)', view: 'front', cx: 32, cy: 272, r: 8 },
  { id: 'ankle_foot_r', label: 'Ankle / foot (R)', view: 'front', cx: 68, cy: 272, r: 8 },
  // Back
  { id: 'neck_back', label: 'Neck', view: 'back', cx: 50, cy: 22, r: 10 },
  { id: 'upper_back', label: 'Upper back / lats', view: 'back', cx: 50, cy: 52, r: 22 },
  { id: 'lower_back', label: 'Lower back', view: 'back', cx: 50, cy: 88, r: 18 },
  { id: 'shoulder_back_l', label: 'Shoulder (L)', view: 'back', cx: 22, cy: 50, r: 11 },
  { id: 'shoulder_back_r', label: 'Shoulder (R)', view: 'back', cx: 78, cy: 50, r: 11 },
  { id: 'glute_l', label: 'Glute (L)', view: 'back', cx: 32, cy: 125, r: 14 },
  { id: 'glute_r', label: 'Glute (R)', view: 'back', cx: 68, cy: 125, r: 14 },
  { id: 'hamstring_l', label: 'Hamstring (L)', view: 'back', cx: 32, cy: 195, r: 12 },
  { id: 'hamstring_r', label: 'Hamstring (R)', view: 'back', cx: 68, cy: 195, r: 12 },
  { id: 'knee_back_l', label: 'Knee (L)', view: 'back', cx: 32, cy: 228, r: 9 },
  { id: 'knee_back_r', label: 'Knee (R)', view: 'back', cx: 68, cy: 228, r: 9 },
  { id: 'calf_back_l', label: 'Calf (L)', view: 'back', cx: 32, cy: 255, r: 9 },
  { id: 'calf_back_r', label: 'Calf (R)', view: 'back', cx: 68, cy: 255, r: 9 },
  { id: 'ankle_foot_back_l', label: 'Ankle / foot (L)', view: 'back', cx: 32, cy: 272, r: 8 },
  { id: 'ankle_foot_back_r', label: 'Ankle / foot (R)', view: 'back', cx: 68, cy: 272, r: 8 },
]

/** Normalize region id for exercise adaptation: map left/right and back variants to a canonical id (e.g. knee_l, knee_r, knee_back_l → knee). */
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

export function getCanonicalRegion(regionId) {
  return REGION_TO_CANONICAL[regionId] ?? regionId
}
