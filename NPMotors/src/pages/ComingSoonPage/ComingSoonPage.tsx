import { Link } from 'react-router-dom'

interface ComingSoonPageProps {
  title: string
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">NPMotors</p>
          <h1>{title}</h1>
          <p className="page-subtitle">This screen hasn&apos;t been built yet.</p>
        </div>
      </header>
      <section className="panel empty-state">
        <h2>{title} is coming soon</h2>
        <p><Link className="text-link" to="/dashboard">Back to dashboard</Link></p>
      </section>
    </div>
  )
}
