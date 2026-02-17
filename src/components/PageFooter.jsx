import React from 'react'
import { Link } from 'react-router-dom'

export default function PageFooter() {
  return (
    <footer className="page-footer">
      <Link to="/changelog">Changelog</Link>
      <span className="muted">·</span>
      <Link to="/readme">Readme</Link>
    </footer>
  )
}
