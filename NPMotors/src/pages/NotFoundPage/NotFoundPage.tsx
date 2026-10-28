import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page empty-state">
      <div className="empty-state__icon" aria-hidden="true">404</div>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="primary-button" to="/dashboard">Return to dashboard</Link>
    </div>
  )
}
