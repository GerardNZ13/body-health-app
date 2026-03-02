import React, { useState, useCallback } from 'react'
import { useHealth, generateProfileCode } from '../store/HealthContext'
import './ProfileGate.css'

export default function ProfileGate() {
  const { createProfile, loadProfile, importProfileData } = useHealth()
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')
  const [newCode, setNewCode] = useState(null)
  const [importMessage, setImportMessage] = useState(null)

  const handleCreate = useCallback(() => {
    setError('')
    const code = generateProfileCode()
    setNewCode(code)
  }, [])

  const handleContinueWithNewCode = useCallback(() => {
    if (newCode) createProfile(newCode)
  }, [newCode, createProfile])

  const handleLoad = useCallback(
    (e) => {
      e?.preventDefault()
      setError('')
      const code = codeInput.trim().toUpperCase()
      if (!code) {
        setError('Enter your profile code.')
        return
      }
      const ok = loadProfile(code)
      if (ok) {
        setCodeInput('')
      } else {
        setError('Could not load that code. Try again or create a new profile.')
      }
    },
    [codeInput, loadProfile]
  )

  const handleCopyCode = useCallback(() => {
    if (!newCode) return
    navigator.clipboard?.writeText(newCode).then(
      () => {},
      () => {}
    )
  }, [newCode])

  return (
    <div className="profile-gate">
      <div className="profile-gate-card card">
        <h1 className="profile-gate-title">Body Health</h1>
        <p className="profile-gate-intro muted">
          Your data is stored locally under a unique code. Create a new profile or enter your code to load your data.
        </p>

        {newCode ? (
          <div className="profile-gate-new">
            <p className="profile-gate-code-label">Your profile code — save it to load your data on another device:</p>
            <div className="profile-gate-code-row">
              <code className="profile-gate-code">{newCode}</code>
              <button type="button" className="btn btn-ghost" onClick={handleCopyCode}>
                Copy
              </button>
            </div>
            <p className="muted small">Copy it somewhere safe, then continue. You’ll need this code to load your data on another phone or browser.</p>
            <button type="button" className="btn btn-primary" onClick={handleContinueWithNewCode}>
              Continue to app
            </button>
          </div>
        ) : (
          <>
            <div className="profile-gate-actions">
              <button type="button" className="btn btn-primary" onClick={handleCreate}>
                Create new profile
              </button>
            </div>
            <div className="profile-gate-divider">
              <span className="muted small">or enter your code</span>
            </div>
            <form onSubmit={handleLoad} className="profile-gate-load">
              <input
                type="text"
                className="profile-gate-input"
                placeholder="e.g. A1B2C3D4E5"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                maxLength={12}
                autoComplete="off"
                aria-label="Profile code"
              />
              <button type="submit" className="btn">
                Load my data
              </button>
            </form>
            <div className="profile-gate-divider">
              <span className="muted small">or restore from backup</span>
            </div>
            <label className="profile-gate-import-btn btn btn-ghost">
              Import from file
              <input
                type="file"
                accept=".json,application/json"
                className="profile-gate-import-input"
                onChange={(e) => {
                  setError('')
                  setImportMessage(null)
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(reader.result)
                      const result = importProfileData(parsed)
                      if (result.ok) {
                        setImportMessage({ type: 'success', text: 'Data imported. Opening your profile.' })
                      } else {
                        setImportMessage({ type: 'error', text: result.error })
                      }
                    } catch (_) {
                      setImportMessage({ type: 'error', text: 'Invalid JSON. Use an export from this app.' })
                    }
                  }
                  reader.readAsText(file)
                  e.target.value = ''
                }}
              />
            </label>
            {importMessage && (
              <p className={importMessage.type === 'success' ? 'profile-gate-import-ok' : 'profile-gate-error'} role="alert">
                {importMessage.text}
              </p>
            )}
            {error && <p className="profile-gate-error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
