import type { ProgressCategory } from '../types'

interface Props {
  categories: ProgressCategory[]
}

function Ring({ category }: { category: ProgressCategory }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - category.percent / 100)
  return (
    <div className="ring-card">
      <svg viewBox="0 0 100 100" className="ring-svg">
        <circle className="ring-track" cx="50" cy="50" r={radius} />
        <circle
          className="ring-value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text x="50" y="54" textAnchor="middle" className="ring-percent">
          {Math.round(category.percent)}%
        </text>
      </svg>
      <div className="ring-label">{category.label}</div>
      <div className="ring-sub">
        {Math.round(category.current)} / {Math.round(category.max)}
      </div>
    </div>
  )
}

export function ProgressRings({ categories }: Props) {
  if (!categories.length) {
    return <p className="muted">No progress data for this village yet.</p>
  }
  return (
    <div className="ring-grid">
      {categories.map((category) => (
        <Ring key={category.id} category={category} />
      ))}
    </div>
  )
}
