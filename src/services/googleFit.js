/**
 * Google Fit steps integration.
 * Requires Google Cloud project with Fitness API enabled and OAuth 2.0 Web client ID.
 * If you use Samsung Health, sync it to Google Fit on your phone to have steps appear here.
 */

const FITNESS_SCOPE = 'https://www.googleapis.com/auth/fitness.activity.read'

function loadGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (document.getElementById('gsi-script')) {
      if (window.google?.accounts?.oauth2) return resolve()
      return window.addEventListener('load', () => resolve())
    }
    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
}

/**
 * Get today's start and end in milliseconds (UTC) for the user's local date.
 * Fitness API expects nanoseconds in some places but aggregate uses millis.
 */
function getTodayRangeMillis() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { startTimeMillis: start.getTime(), endTimeMillis: end.getTime() }
}

/**
 * Request access token via Google Identity Services. Resolves with token or rejects.
 * @param {string} clientId - Google OAuth 2.0 Web client ID
 * @param {boolean} prompt - If true, always show consent; if false, silent refresh when possible
 */
export function getGoogleFitToken(clientId, prompt = true) {
  return loadGsi().then(() => {
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: FITNESS_SCOPE,
        callback: (res) => {
          if (res?.access_token) resolve(res.access_token)
          else reject(new Error(res?.error || 'No access token'))
        },
        error_callback: (err) => reject(new Error(err?.message || 'Google Sign-In error')),
      })
      client.requestAccessToken({ prompt: prompt ? 'consent' : 'none' })
    })
  })
}

/**
 * Fetch step count for today from Google Fit. Returns { steps: number } or throws.
 * @param {string} accessToken - OAuth2 access token
 */
export async function fetchStepsToday(accessToken) {
  const { startTimeMillis, endTimeMillis } = getTodayRangeMillis()
  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
      startTimeMillis,
      endTimeMillis,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Fit API ${res.status}`)
  }
  const data = await res.json()
  let steps = 0
  const buckets = data.bucket || []
  for (const bucket of buckets) {
    const datasets = bucket.dataset || []
    for (const ds of datasets) {
      const points = ds.point || []
      for (const pt of points) {
        const vals = pt.value || []
        for (const v of vals) {
          if (typeof v.intVal !== 'undefined') steps += Number(v.intVal)
        }
      }
    }
  }
  return { steps }
}
