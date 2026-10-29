import { useEffect, useState } from 'react'
import { formatCountdown, formatDuration } from '../lib/format'
import type { ActiveUpgrade } from '../types'
import { ItemIcon } from './ItemIcon'

interface Props {
  upgrades: ActiveUpgrade[]
}

export function BuilderTimeline({ upgrades }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!upgrades.length) {
    return <p className="muted">No builders busy in this export snapshot.</p>
  }

  const now = Date.now()
  const maxRemaining = Math.max(...upgrades.map((u) => Math.max(0, u.finishesAt - now)), 1)

  return (
    <div className="timeline">
      {upgrades.map((upgrade) => {
        const remaining = Math.max(0, upgrade.finishesAt - now)
        const width = `${Math.max(8, (remaining / maxRemaining) * 100)}%`
        return (
          <div key={`${upgrade.dataId}-${upgrade.finishesAt}`} className="timeline-row">
            <ItemIcon
              name={upgrade.name}
              category={upgrade.category}
              base={upgrade.base}
              level={upgrade.fromLevel}
              size={40}
            />
            <div className="timeline-body">
              <div className="timeline-head">
                <strong>
                  {upgrade.name} {upgrade.fromLevel}→{upgrade.toLevel}
                </strong>
                <span className="countdown">{formatCountdown(upgrade.finishesAt, now)}</span>
              </div>
              <div className="timeline-track">
                <div className="timeline-fill" style={{ width }} />
              </div>
              <div className="muted tiny">
                {remaining > 0 ? `${formatDuration(remaining / 1000)} left` : 'Ready to collect'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
