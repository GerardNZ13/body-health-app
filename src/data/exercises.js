/**
 * Baseline exercise library: Push / Pull / Legs / Mobility / Cardio × Bronze / Gold / Platinum.
 * Tiers are based on ability and readiness (not body weight): someone at any weight can be Bronze, Gold, or Platinum.
 * Each exercise has sets (3 where possible), reps, and core: true/false (core = primary for goal; builder = additional).
 * Counts per tier: Bronze 2–4 (all core), Gold 3–5 (most core, rest builders), Platinum 4–6 (2/3–3/4 core, rest builders).
 * Can be overridden by AI-generated library via "Update workout suggestions".
 *
 * Bronze = building base, recovery, or low energy — lowest impact, most supported options (seated, wall, band)
 * Gold = intermediate ability — standard progressions
 * Platinum = advanced — full range, higher density
 */

export const EXERCISES_BASELINE = {
  push: {
    bronze: [
      { name: 'Wall push-up', description: 'Hands on wall, body angled. Builds base strength; minimal joint load.', equipment: 'Wall', sets: 3, reps: '8-12', core: true },
      { name: 'Standing chest press (band or 4 kg KB)', description: 'Resistance at chest height; control the press.', equipment: 'Band or 4 kg KB', sets: 3, reps: '10-12', core: true },
      { name: 'Seated shoulder press (4 kg KB)', description: 'Single or double arm, controlled. Seat supports spine.', equipment: 'Chair, 4 kg KB', sets: 3, reps: '8-10 each arm', core: true },
      { name: 'Wall slide', description: 'Back and arms on wall, slide arms up/down. Scapular control.', equipment: 'Wall', sets: 3, reps: '8-10', core: true },
    ],
    gold: [
      { name: 'Incline push-up', description: 'Hands on bench/table. Reduces bodyweight load.', equipment: 'Bench/table', sets: 3, reps: '8-12', core: true },
      { name: 'Knee push-up', description: 'Knees on floor, full push-up motion.', equipment: 'Floor', sets: 3, reps: '8-12', core: true },
      { name: 'Kettlebell floor press (4–6 kg)', description: 'Lie back, press KBs from chest. One or two arms.', equipment: '4–6 kg KB', sets: 3, reps: '8-10 each', core: true },
      { name: 'Kettlebell overhead press (4–6 kg)', description: 'Strict press, one or two arms.', equipment: '4–6 kg KB', sets: 3, reps: '8-10', core: true },
      { name: 'Pec fly (band or light KB)', description: 'Arms open and close at chest height. Control the squeeze.', equipment: 'Band or 4 kg KB', sets: 3, reps: '10-12', core: false },
    ],
    platinum: [
      { name: 'Full push-up (floor)', description: 'Standard push-up, full range.', equipment: 'Floor', sets: 3, reps: '10-15', core: true },
      { name: 'Kettlebell push press (6 kg)', description: 'Use legs to drive press overhead.', equipment: '6 kg KB', sets: 3, reps: '8-10', core: true },
      { name: 'Pike push-up', description: 'Hips high, head toward floor. Shoulder focus.', equipment: 'Floor', sets: 3, reps: '6-10', core: true },
      { name: 'Tricep dip (bench)', description: 'Hands on bench, lower and press back up.', equipment: 'Bench', sets: 3, reps: '8-12', core: true },
      { name: 'Diamond or close-hand push-up', description: 'Hands close for more tricep.', equipment: 'Floor', sets: 3, reps: '8-12', core: false },
      { name: 'Decline push-up', description: 'Feet elevated for more chest/shoulder load.', equipment: 'Bench, floor', sets: 3, reps: '8-12', core: false },
    ],
  },
  pull: {
    bronze: [
      { name: 'Band row (seated or standing)', description: 'Pull band to ribs, squeeze shoulder blade. Seated option for support.', equipment: 'Resistance band', sets: 3, reps: '10-12', core: true },
      { name: 'Band pull-down', description: 'Anchor band high, pull to chest level.', equipment: 'Band', sets: 3, reps: '10-12', core: true },
      { name: 'Face pull (band)', description: 'Pull to face level, external rotation. Rear delt and rotator health.', equipment: 'Band', sets: 3, reps: '12-15', core: true },
      { name: 'Seated band curl', description: 'Sit, curl band with control. Reduces standing load.', equipment: 'Band, chair', sets: 3, reps: '10-12', core: true },
    ],
    gold: [
      { name: 'Inverted row (under table/bar)', description: 'Body under bar, pull chest to bar.', equipment: 'Table or bar', sets: 3, reps: '8-12', core: true },
      { name: 'Kettlebell row (4–6 kg)', description: 'Single-arm row, support on bench or knee.', equipment: '4–6 kg KB', sets: 3, reps: '8-10 each', core: true },
      { name: 'Kettlebell high pull', description: 'Swing path to shoulder, elbow high.', equipment: '4–6 kg KB', sets: 3, reps: '8-10', core: true },
      { name: 'Bicep curl (4–6 kg KB)', description: 'Controlled curl, alternate or both arms.', equipment: '4–6 kg KB', sets: 3, reps: '10-12', core: true },
      { name: 'Band pull-apart', description: 'Hold band in front, pull apart to chest. Rhomboids and rear delt.', equipment: 'Band', sets: 3, reps: '12-15', core: false },
    ],
    platinum: [
      { name: 'Pull-up progression (band-assisted or negative)', description: 'Assisted pull-up or slow negative.', equipment: 'Bar + band', sets: 3, reps: '5-8 or 3-5 neg', core: true },
      { name: 'Single-arm KB row (strict)', description: 'Full range row with 6 kg, strict form.', equipment: '6 kg KB', sets: 3, reps: '8-10 each', core: true },
      { name: 'Kettlebell renegade row', description: 'Push-up position, row one KB at a time.', equipment: '4–6 kg KB', sets: 3, reps: '6-8 each', core: true },
      { name: 'Chin-up or neutral grip', description: 'Palms toward you or neutral.', equipment: 'Bar', sets: 3, reps: '6-10', core: true },
      { name: 'Hammer curl / alternating curl (6 kg)', description: 'Full ROM bicep work.', equipment: '6 kg KB', sets: 3, reps: '10-12', core: false },
      { name: 'Inverted row (feet elevated)', description: 'Feet on bench for more difficulty.', equipment: 'Bar, bench', sets: 3, reps: '8-12', core: false },
    ],
  },
  legs: {
    bronze: [
      { name: 'Chair squat', description: 'Sit to chair and stand. Control the descent; build confidence.', equipment: 'Chair', sets: 3, reps: '8-10', core: true },
      { name: 'Wall sit', description: 'Back to wall, hold squat position. Start with 20–30 s.', equipment: 'Wall', sets: 3, reps: '20-30s hold', core: true },
      { name: 'Glute bridge (floor)', description: 'Feet flat, drive hips up. Gentle on knees.', equipment: 'Floor', sets: 3, reps: '10-12', core: true },
      { name: 'Seated calf raise', description: 'Feet flat, raise heels. Can use KB on knees for load.', equipment: 'Chair, optional KB', sets: 3, reps: '12-15', core: true },
    ],
    gold: [
      { name: 'Goblet squat (4–6 kg KB)', description: 'Hold KB at chest, squat to depth you can.', equipment: '4–6 kg KB', sets: 3, reps: '8-12', core: true },
      { name: 'Kettlebell swing (4–6 kg)', description: 'Hinge and swing to chest height.', equipment: '4–6 kg KB', sets: 3, reps: '10-12', core: true },
      { name: 'Box or bench step-up', description: 'Step up and down, alternate legs.', equipment: 'Bench/step', sets: 3, reps: '8-10 each', core: true },
      { name: 'Reverse lunge (bodyweight or light KB)', description: 'Step back, knee toward floor. Controlled.', equipment: 'Optional 4 kg KB', sets: 3, reps: '6-8 each', core: true },
      { name: 'Glute bridge (feet elevated)', description: 'Feet on bench or step for more range.', equipment: 'Floor, bench', sets: 3, reps: '10-12', core: false },
    ],
    platinum: [
      { name: 'Goblet squat (full depth, 6 kg)', description: 'Full squat with KB at chest.', equipment: '6 kg KB', sets: 3, reps: '10-12', core: true },
      { name: 'Kettlebell swing (higher power)', description: 'Swing to shoulder or overhead if ready.', equipment: '6 kg KB', sets: 3, reps: '12-15', core: true },
      { name: 'Single-leg deadlift (KB)', description: 'Hinge on one leg, KB in hand.', equipment: '4–6 kg KB', sets: 3, reps: '6-8 each', core: true },
      { name: 'Bulgarian split squat (assisted)', description: 'Rear foot elevated, front leg works. Use wall for balance.', equipment: 'Bench, optional KB', sets: 3, reps: '6-8 each', core: true },
      { name: 'Lunge (walking or reverse, KB optional)', description: 'Lunges with or without weight.', equipment: 'Optional 4–6 kg KB', sets: 3, reps: '8-10 each', core: false },
      { name: 'Calf raise (standing, single leg)', description: 'Full range calf raise on one leg.', equipment: 'Floor or step', sets: 3, reps: '10-12 each', core: false },
    ],
  },
  cardio: {
    bronze: [
      { name: 'March in place', description: 'Low impact, 2–5 min. Get heart rate up gently.', equipment: 'None', sets: 3, reps: '2-3 min', core: true },
      { name: 'Step touches', description: 'Side to side step, optional arm swing.', equipment: 'None', sets: 3, reps: '2-3 min', core: true },
      { name: 'Seated knee lifts', description: 'Sit, lift knees alternately. Low impact.', equipment: 'Chair', sets: 3, reps: '2 min', core: true },
      { name: 'Slow step-up (low height)', description: 'Step up and down on low step or stair. Steady pace.', equipment: 'Step or stair', sets: 3, reps: '2-3 min', core: true },
    ],
    gold: [
      { name: 'Kettlebell swings (continuous, 4–6 kg)', description: '30–60 s intervals. Heart rate up.', equipment: '4–6 kg KB', sets: 3, reps: '30-60s', core: true },
      { name: 'Step-ups (steady pace)', description: 'Alternate legs, 2–5 min.', equipment: 'Step/bench', sets: 3, reps: '2-3 min', core: true },
      { name: 'March with high knees', description: 'Progressive intensity.', equipment: 'None', sets: 3, reps: '2-3 min', core: true },
      { name: 'Swing + rest intervals', description: '20–30 s swings, 30 s rest, repeat 3 times.', equipment: '4–6 kg KB', sets: 3, reps: '20-30s on', core: true },
      { name: 'Goblet hold march', description: 'Hold KB at chest, march in place or short walk.', equipment: '4–6 kg KB', sets: 3, reps: '2 min', core: false },
    ],
    platinum: [
      { name: 'KB swing circuit (swing, rest, repeat)', description: '30 s on, 15 s off, 4–6 rounds.', equipment: '6 kg KB', sets: 3, reps: '30s on', core: true },
      { name: 'Step-up + press (compound)', description: 'Step up and press KB overhead each rep.', equipment: '6 kg KB, step', sets: 3, reps: '8-10 each', core: true },
      { name: 'Moving lunges + swing', description: 'Lunge walk, then 5 swings, repeat.', equipment: '6 kg KB', sets: 3, reps: '5 swings + 4 lunges', core: true },
      { name: 'EMOM swings', description: 'On the minute: 10–15 swings, rest remainder.', equipment: '6 kg KB', sets: 3, reps: '10-15 per min', core: true },
      { name: 'Intervals: 20 s work / 10 s rest', description: 'Any combo of swings, step-ups, high knees.', equipment: 'Optional KB', sets: 3, reps: '20s on', core: false },
      { name: 'Continuous movement block (5–10 min)', description: 'Swings, step-ups, march – minimal rest.', equipment: '6 kg KB, step', sets: 1, reps: '5-10 min', core: false },
    ],
  },
  mobility: {
    bronze: [
      { name: 'Seated forward fold', description: 'Sit tall, hinge from hips, reach toward feet. Hold 20–30 s.', equipment: 'Chair or floor', sets: 3, reps: '20-30s hold', core: true },
      { name: 'Seated spinal twist', description: 'Sit, twist torso toward one side, hold. Repeat other side.', equipment: 'Chair or floor', sets: 3, reps: '20s each', core: true },
      { name: 'Knee-to-chest (single)', description: 'Lie or stand; pull one knee to chest. Hold 15–20 s.', equipment: 'Floor', sets: 3, reps: '15-20s each', core: true },
      { name: 'Seated cat-cow', description: 'Sit, round and arch spine. Gentle spinal mobility.', equipment: 'Chair', sets: 3, reps: '8-10', core: true },
    ],
    gold: [
      { name: 'Cat–cow', description: 'On all fours, round then arch spine. Breathe with the movement.', equipment: 'Floor', sets: 3, reps: '8-10', core: true },
      { name: '90/90 hip switch', description: 'Sit with legs in 90/90; switch sides slowly. Opens hips.', equipment: 'Floor', sets: 3, reps: '5 each side', core: true },
      { name: 'Standing quad stretch', description: 'Stand, pull heel to glute; keep knee down. Hold 20 s.', equipment: 'Wall optional', sets: 3, reps: '20s each', core: true },
      { name: 'Child’s pose', description: 'Knees under hips, sit back, arms extended or by sides.', equipment: 'Floor', sets: 3, reps: '30s hold', core: false },
      { name: 'Hip flexor stretch (half kneeling)', description: 'One knee down, drive hips forward. Hold 20–30 s.', equipment: 'Floor', sets: 3, reps: '20-30s each', core: true },
    ],
    platinum: [
      { name: 'World’s greatest stretch', description: 'Lunge with rotation: reach arm up, then thread under. Full body.', equipment: 'Floor', sets: 3, reps: '5 each', core: true },
      { name: 'Prone scorpion / T-reach', description: 'Lie face down; reach one foot toward opposite hand. Spine + hip.', equipment: 'Floor', sets: 3, reps: '5 each', core: true },
      { name: 'Couch stretch (quad + hip flexor)', description: 'Back foot on couch or wall, stand tall. Full front leg stretch.', equipment: 'Couch or wall', sets: 3, reps: '30-45s each', core: true },
      { name: '90/90 with lean', description: 'In 90/90, lean forward over front leg for deeper hip opening.', equipment: 'Floor', sets: 3, reps: '20-30s each', core: true },
      { name: 'Dead hang (optional)', description: 'Hang from bar to decompress spine and shoulders. 20–40 s.', equipment: 'Pull-up bar', sets: 3, reps: '20-40s', core: false },
      { name: 'Spinal articulation flow', description: 'Cat–cow, thread needle, child’s pose in sequence. 2–3 min.', equipment: 'Floor', sets: 1, reps: '2-3 min', core: false },
    ],
  },
}

/** Session type to library key (lowercase) */
export function getLibraryKey(sessionType) {
  const t = (sessionType || '').toLowerCase()
  if (['push', 'pull', 'legs', 'mobility', 'cardio'].includes(t)) return t
  return 'push'
}
