/**
 * Baseline exercise library: Push / Pull / Legs / Mobility / Cardio × Bronze / Gold / Platinum.
 * Tiers are based on ability and readiness (not body weight): someone at any weight can be Bronze, Gold, or Platinum.
 * Each exercise has sets and reps (reps can be "8-12", "30s", "45s hold", etc.).
 * Can be overridden by AI-generated library via "Update workout suggestions".
 *
 * Bronze = building base, recovery, or low energy — lowest impact, most supported options (seated, wall, band)
 * Gold = intermediate ability — standard progressions
 * Platinum = advanced — full range, higher density
 */

export const EXERCISES_BASELINE = {
  push: {
    bronze: [
      { name: 'Wall push-up', description: 'Hands on wall, body angled. Builds base strength; minimal joint load.', equipment: 'Wall', sets: 2, reps: '8-12' },
      { name: 'Standing chest press (band or 4 kg KB)', description: 'Resistance at chest height; control the press.', equipment: 'Band or 4 kg KB', sets: 2, reps: '10-12' },
      { name: 'Seated shoulder press (4 kg KB)', description: 'Single or double arm, controlled. Seat supports spine.', equipment: 'Chair, 4 kg KB', sets: 2, reps: '8-10 each arm' },
      { name: 'Wall slide', description: 'Back and arms on wall, slide arms up/down. Scapular control.', equipment: 'Wall', sets: 2, reps: '8-10' },
      { name: 'Seated chest squeeze (band or ball)', description: 'Hold band or ball at chest, squeeze and release.', equipment: 'Band or soft ball', sets: 2, reps: '12-15' },
      { name: 'Tricep wall push (light)', description: 'Hands at shoulder height on wall, push away slowly.', equipment: 'Wall', sets: 2, reps: '10-12' },
      { name: 'Elevated push-up (hands on high surface)', description: 'Hands on table or rail; reduce bodyweight load further than wall.', equipment: 'Table or rail', sets: 2, reps: '6-10' },
      { name: 'Seated single-arm press', description: 'One arm at a time overhead; reduces load and balances stability.', equipment: 'Chair, 4 kg KB', sets: 2, reps: '6-8 each' },
    ],
    gold: [
      { name: 'Incline push-up', description: 'Hands on bench/table. Reduces bodyweight load.', equipment: 'Bench/table', sets: 3, reps: '8-12' },
      { name: 'Knee push-up', description: 'Knees on floor, full push-up motion.', equipment: 'Floor', sets: 3, reps: '8-12' },
      { name: 'Kettlebell floor press (4–6 kg)', description: 'Lie back, press KBs from chest. One or two arms.', equipment: '4–6 kg KB', sets: 3, reps: '8-10 each' },
      { name: 'Kettlebell overhead press (4–6 kg)', description: 'Strict press, one or two arms.', equipment: '4–6 kg KB', sets: 3, reps: '8-10' },
      { name: 'Tricep wall push (deeper)', description: 'Hands at shoulder height, push away from wall with control.', equipment: 'Wall', sets: 3, reps: '10-12' },
      { name: 'Pec fly (band or light KB)', description: 'Arms open and close at chest height. Control the squeeze.', equipment: 'Band or 4 kg KB', sets: 3, reps: '10-12' },
      { name: 'Diamond push-up (incline)', description: 'Hands close on incline surface for tricep focus.', equipment: 'Bench', sets: 3, reps: '6-10' },
    ],
    platinum: [
      { name: 'Full push-up (floor)', description: 'Standard push-up, full range.', equipment: 'Floor', sets: 3, reps: '10-15' },
      { name: 'Diamond or close-hand push-up', description: 'Hands close for more tricep.', equipment: 'Floor', sets: 3, reps: '8-12' },
      { name: 'Kettlebell push press (6 kg)', description: 'Use legs to drive press overhead.', equipment: '6 kg KB', sets: 3, reps: '8-10' },
      { name: 'Pike push-up', description: 'Hips high, head toward floor. Shoulder focus.', equipment: 'Floor', sets: 3, reps: '6-10' },
      { name: 'Tricep dip (bench)', description: 'Hands on bench, lower and press back up.', equipment: 'Bench', sets: 3, reps: '8-12' },
      { name: 'Archer push-up (assisted or full)', description: 'One arm pushes, other assists; rotate. Advanced.', equipment: 'Floor', sets: 3, reps: '5-8 each' },
      { name: 'Decline push-up', description: 'Feet elevated for more chest/shoulder load.', equipment: 'Bench, floor', sets: 3, reps: '8-12' },
    ],
  },
  pull: {
    bronze: [
      { name: 'Band row (seated or standing)', description: 'Pull band to ribs, squeeze shoulder blade. Seated option for support.', equipment: 'Resistance band', sets: 2, reps: '10-12' },
      { name: 'Doorway row (towel/band)', description: 'Pull yourself toward door frame. Light resistance.', equipment: 'Towel or band', sets: 2, reps: '8-10' },
      { name: 'Band pull-down', description: 'Anchor band high, pull to chest level.', equipment: 'Band', sets: 2, reps: '10-12' },
      { name: 'Face pull (band)', description: 'Pull to face level, external rotation. Rear delt and rotator health.', equipment: 'Band', sets: 2, reps: '12-15' },
      { name: 'Seated band curl', description: 'Sit, curl band with control. Reduces standing load.', equipment: 'Band, chair', sets: 2, reps: '10-12' },
      { name: 'Scapular wall slide (pull phase)', description: 'Arms on wall, pull shoulder blades together.', equipment: 'Wall', sets: 2, reps: '10' },
      { name: 'Seated band pull-apart', description: 'Sit, pull band apart at chest height. Safe for lower back.', equipment: 'Band, chair', sets: 2, reps: '12-15' },
    ],
    gold: [
      { name: 'Inverted row (under table/bar)', description: 'Body under bar, pull chest to bar.', equipment: 'Table or bar', sets: 3, reps: '8-12' },
      { name: 'Kettlebell row (4–6 kg)', description: 'Single-arm row, support on bench or knee.', equipment: '4–6 kg KB', sets: 3, reps: '8-10 each' },
      { name: 'Kettlebell high pull', description: 'Swing path to shoulder, elbow high.', equipment: '4–6 kg KB', sets: 3, reps: '8-10' },
      { name: 'Bent-over Y / T (light KB or band)', description: 'Hinge, raise arms to Y or T for rear delt.', equipment: '4 kg KB or band', sets: 3, reps: '10-12' },
      { name: 'Bicep curl (4–6 kg KB)', description: 'Controlled curl, alternate or both arms.', equipment: '4–6 kg KB', sets: 3, reps: '10-12' },
      { name: 'Band pull-apart', description: 'Hold band in front, pull apart to chest. Rhomboids and rear delt.', equipment: 'Band', sets: 3, reps: '12-15' },
      { name: 'Single-arm band row', description: 'Anchor band, row to hip. Full ROM.', equipment: 'Band', sets: 3, reps: '10 each' },
    ],
    platinum: [
      { name: 'Pull-up progression (band-assisted or negative)', description: 'Assisted pull-up or slow negative.', equipment: 'Bar + band', sets: 3, reps: '5-8 or 3-5 neg' },
      { name: 'Chin-up or neutral grip', description: 'Palms toward you or neutral.', equipment: 'Bar', sets: 3, reps: '6-10' },
      { name: 'Single-arm KB row (strict)', description: 'Full range row with 6 kg, strict form.', equipment: '6 kg KB', sets: 3, reps: '8-10 each' },
      { name: 'Kettlebell renegade row', description: 'Push-up position, row one KB at a time.', equipment: '4–6 kg KB', sets: 3, reps: '6-8 each' },
      { name: 'Hammer curl / alternating curl (6 kg)', description: 'Full ROM bicep work.', equipment: '6 kg KB', sets: 3, reps: '10-12' },
      { name: 'Inverted row (feet elevated)', description: 'Feet on bench for more difficulty.', equipment: 'Bar, bench', sets: 3, reps: '8-12' },
      { name: 'Wide-grip band row', description: 'Wide hands on band for lat focus.', equipment: 'Band', sets: 3, reps: '10-12' },
    ],
  },
  legs: {
    bronze: [
      { name: 'Chair squat', description: 'Sit to chair and stand. Control the descent; build confidence.', equipment: 'Chair', sets: 2, reps: '8-10' },
      { name: 'Wall sit', description: 'Back to wall, hold squat position. Start with 20–30 s.', equipment: 'Wall', sets: 2, reps: '20-30s hold' },
      { name: 'Standing leg lift (hold wall)', description: 'Balance support, lift knee or leg out. Hip stability.', equipment: 'Wall', sets: 2, reps: '8-10 each' },
      { name: 'Seated calf raise', description: 'Feet flat, raise heels. Can use KB on knees for load.', equipment: 'Chair, optional KB', sets: 2, reps: '12-15' },
      { name: 'Seated march', description: 'Sit tall, march knees up. Low impact, circulation.', equipment: 'Chair', sets: 2, reps: '20-30s' },
      { name: 'Glute bridge (floor)', description: 'Feet flat, drive hips up. Gentle on knees.', equipment: 'Floor', sets: 2, reps: '10-12' },
      { name: 'Standing knee extension (hold chair)', description: 'Hold chair, extend one knee at a time. Quad without full squat.', equipment: 'Chair', sets: 2, reps: '8-10 each' },
      { name: 'Heel slide (seated or lying)', description: 'Slide heel toward glute and back. Knee mobility with no load.', equipment: 'Floor or chair', sets: 2, reps: '8-10 each' },
    ],
    gold: [
      { name: 'Goblet squat (4–6 kg KB)', description: 'Hold KB at chest, squat to depth you can.', equipment: '4–6 kg KB', sets: 3, reps: '8-12' },
      { name: 'Box or bench step-up', description: 'Step up and down, alternate legs.', equipment: 'Bench/step', sets: 3, reps: '8-10 each' },
      { name: 'Kettlebell swing (4–6 kg)', description: 'Hinge and swing to chest height.', equipment: '4–6 kg KB', sets: 3, reps: '10-12' },
      { name: 'Standing couch stretch (quad)', description: 'Back foot on couch, stand tall. Good cool-down.', equipment: 'Couch', sets: 2, reps: '20-30s each' },
      { name: 'Glute bridge (feet elevated)', description: 'Feet on bench or step for more range.', equipment: 'Floor, bench', sets: 3, reps: '10-12' },
      { name: 'Reverse lunge (bodyweight or light KB)', description: 'Step back, knee toward floor. Controlled.', equipment: 'Optional 4 kg KB', sets: 3, reps: '6-8 each' },
      { name: 'Calf raise (standing)', description: 'Full range calf raise; use wall for balance.', equipment: 'Floor or step', sets: 3, reps: '12-15' },
    ],
    platinum: [
      { name: 'Goblet squat (full depth, 6 kg)', description: 'Full squat with KB at chest.', equipment: '6 kg KB', sets: 3, reps: '10-12' },
      { name: 'Single-leg deadlift (KB)', description: 'Hinge on one leg, KB in hand.', equipment: '4–6 kg KB', sets: 3, reps: '6-8 each' },
      { name: 'Lunge (walking or reverse, KB optional)', description: 'Lunges with or without weight.', equipment: 'Optional 4–6 kg KB', sets: 3, reps: '8-10 each' },
      { name: 'Kettlebell swing (higher power)', description: 'Swing to shoulder or overhead if ready.', equipment: '6 kg KB', sets: 3, reps: '12-15' },
      { name: 'Calf raise (standing, single leg)', description: 'Full range calf raise on one leg.', equipment: 'Floor or step', sets: 3, reps: '10-12 each' },
      { name: 'Bulgarian split squat (assisted)', description: 'Rear foot elevated, front leg works. Use wall for balance.', equipment: 'Bench, optional KB', sets: 3, reps: '6-8 each' },
      { name: 'Jump squat or squat jump (low impact option: fast bodyweight squat)', description: 'Explosive or fast tempo for density.', equipment: 'Floor', sets: 3, reps: '8-10' },
    ],
  },
  cardio: {
    bronze: [
      { name: 'March in place', description: 'Low impact, 2–5 min. Get heart rate up gently.', equipment: 'None', sets: 1, reps: '2-5 min' },
      { name: 'Step touches', description: 'Side to side step, optional arm swing.', equipment: 'None', sets: 1, reps: '2-4 min' },
      { name: 'Seated knee lifts', description: 'Sit, lift knees alternately. Low impact.', equipment: 'Chair', sets: 1, reps: '2-3 min' },
      { name: 'Arm circles and light movement', description: 'Warm-up style, keep moving.', equipment: 'None', sets: 1, reps: '2-3 min' },
      { name: 'Seated boxing / arm punches', description: 'Sit, punch arms forward and up. Gentle cardio.', equipment: 'Chair', sets: 1, reps: '1-2 min' },
      { name: 'Slow step-up (low height)', description: 'Step up and down on low step or stair. Steady pace.', equipment: 'Step or stair', sets: 1, reps: '3-5 min' },
    ],
    gold: [
      { name: 'Kettlebell swings (continuous, 4–6 kg)', description: '30–60 s intervals. Heart rate up.', equipment: '4–6 kg KB', sets: 3, reps: '30-60s' },
      { name: 'Step-ups (steady pace)', description: 'Alternate legs, 2–5 min.', equipment: 'Step/bench', sets: 1, reps: '3-5 min' },
      { name: 'March with high knees', description: 'Progressive intensity.', equipment: 'None', sets: 1, reps: '2-4 min' },
      { name: 'Goblet hold march', description: 'Hold KB at chest, march in place or short walk.', equipment: '4–6 kg KB', sets: 1, reps: '2-4 min' },
      { name: 'Shadow boxing / light movement', description: 'Keep moving, mix directions.', equipment: 'None', sets: 1, reps: '3-5 min' },
      { name: 'Swing + rest intervals', description: '20–30 s swings, 30 s rest, repeat 4–5 times.', equipment: '4–6 kg KB', sets: 4, reps: '20-30s on' },
    ],
    platinum: [
      { name: 'KB swing circuit (swing, rest, repeat)', description: '30 s on, 15 s off, 4–6 rounds.', equipment: '6 kg KB', sets: 4, reps: '30s on' },
      { name: 'Step-up + press (compound)', description: 'Step up and press KB overhead each rep.', equipment: '6 kg KB, step', sets: 3, reps: '8-10 each' },
      { name: 'Moving lunges + swing', description: 'Lunge walk, then 5 swings, repeat.', equipment: '6 kg KB', sets: 3, reps: '5 swings + 4 lunges' },
      { name: 'Continuous movement block (5–10 min)', description: 'Swings, step-ups, march – minimal rest.', equipment: '6 kg KB, step', sets: 1, reps: '5-10 min' },
      { name: 'Intervals: 20 s work / 10 s rest', description: 'Any combo of swings, step-ups, high knees.', equipment: 'Optional KB', sets: 6, reps: '20s on' },
      { name: 'EMOM swings', description: 'On the minute: 10–15 swings, rest remainder.', equipment: '6 kg KB', sets: 5, reps: '10-15 per min' },
    ],
  },
  mobility: {
    bronze: [
      { name: 'Seated forward fold', description: 'Sit tall, hinge from hips, reach toward feet. Hold 20–30 s.', equipment: 'Chair or floor', sets: 2, reps: '20-30s hold' },
      { name: 'Seated spinal twist', description: 'Sit, twist torso toward one side, hold. Repeat other side.', equipment: 'Chair or floor', sets: 2, reps: '20s each' },
      { name: 'Knee-to-chest (single)', description: 'Lie or stand; pull one knee to chest. Hold 15–20 s.', equipment: 'Floor', sets: 2, reps: '15-20s each' },
      { name: 'Neck and shoulder rolls', description: 'Gentle circles and rolls to release tension.', equipment: 'None', sets: 1, reps: '5 each direction' },
      { name: 'Ankle circles', description: 'Seated or standing; circle ankles both directions.', equipment: 'None', sets: 1, reps: '8 each' },
      { name: 'Seated cat-cow', description: 'Sit, round and arch spine. Gentle spinal mobility.', equipment: 'Chair', sets: 2, reps: '8-10' },
    ],
    gold: [
      { name: 'Cat–cow', description: 'On all fours, round then arch spine. Breathe with the movement.', equipment: 'Floor', sets: 2, reps: '8-10' },
      { name: '90/90 hip switch', description: 'Sit with legs in 90/90; switch sides slowly. Opens hips.', equipment: 'Floor', sets: 2, reps: '5 each side' },
      { name: 'Standing quad stretch', description: 'Stand, pull heel to glute; keep knee down. Hold 20 s.', equipment: 'Wall optional', sets: 2, reps: '20s each' },
      { name: 'Thread the needle', description: 'On all fours, reach one arm under body, rotate chest open.', equipment: 'Floor', sets: 2, reps: '5 each' },
      { name: 'Child’s pose', description: 'Knees under hips, sit back, arms extended or by sides.', equipment: 'Floor', sets: 2, reps: '30s hold' },
      { name: 'Hip flexor stretch (half kneeling)', description: 'One knee down, drive hips forward. Hold 20–30 s.', equipment: 'Floor', sets: 2, reps: '20-30s each' },
    ],
    platinum: [
      { name: 'World’s greatest stretch', description: 'Lunge with rotation: reach arm up, then thread under. Full body.', equipment: 'Floor', sets: 2, reps: '5 each' },
      { name: 'Prone scorpion / T-reach', description: 'Lie face down; reach one foot toward opposite hand. Spine + hip.', equipment: 'Floor', sets: 2, reps: '5 each' },
      { name: 'Couch stretch (quad + hip flexor)', description: 'Back foot on couch or wall, stand tall. Full front leg stretch.', equipment: 'Couch or wall', sets: 2, reps: '30-45s each' },
      { name: '90/90 with lean', description: 'In 90/90, lean forward over front leg for deeper hip opening.', equipment: 'Floor', sets: 2, reps: '20-30s each' },
      { name: 'Dead hang (optional)', description: 'Hang from bar to decompress spine and shoulders. 20–40 s.', equipment: 'Pull-up bar', sets: 2, reps: '20-40s' },
      { name: 'Spinal articulation flow', description: 'Cat–cow, thread needle, child’s pose in sequence. 2–3 min.', equipment: 'Floor', sets: 1, reps: '2-3 min' },
    ],
  },
}

/** Session type to library key (lowercase) */
export function getLibraryKey(sessionType) {
  const t = (sessionType || '').toLowerCase()
  if (['push', 'pull', 'legs', 'mobility', 'cardio'].includes(t)) return t
  return 'push'
}
