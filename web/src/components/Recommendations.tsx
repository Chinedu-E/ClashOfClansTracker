import { formatCompact, formatDuration, resourceClass } from '../lib/format'
import type { Recommendation, SortMode } from '../types'
import { ItemIcon } from './ItemIcon'
import type { ReactNode } from 'react'

interface Props {
  items: Recommendation[]
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
  onHeroClick?: (dataId: number) => void
  blocksPanel?: ReactNode
}

export function Recommendations({
  items,
  sortMode,
  onSortChange,
  onHeroClick,
  blocksPanel,
}: Props) {
  return (
    <div>
      <div className="section-toolbar">
        <div className="seg">
          {(
            [
              ['time', 'Shortest time'],
              ['cost', 'Lowest cost'],
              ['priority', 'Heroes & lab'],
              ['blocks', 'Builder blocks'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={sortMode === mode ? 'active' : ''}
              onClick={() => onSortChange(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sortMode === 'blocks' ? (
        blocksPanel
      ) : !items.length ? (
        <p className="muted">Everything is maxed for this Town Hall.</p>
      ) : (
        <div className="rec-grid">
          {items.slice(0, 36).map((rec) => {
            const isHero = rec.category === 'hero'
            const clickable = isHero && onHeroClick
            const body = (
              <>
                <ItemIcon
                  name={rec.name}
                  category={rec.category}
                  base={rec.base}
                  level={rec.toLevel}
                  size={52}
                />
                <div className="rec-body">
                  <h3>{rec.name}</h3>
                  <div className="rec-level">
                    Lv {rec.fromLevel} → {rec.toLevel}
                    {isHero && <span className="hero-hint"> · tap for TH max path</span>}
                  </div>
                  <div className="rec-meta">
                    <span className={`resource-chip ${resourceClass(rec.resource)}`}>
                      {formatCompact(rec.cost)} {rec.resource}
                    </span>
                    <span className="time-chip">{formatDuration(rec.timeSeconds)}</span>
                  </div>
                  {rec.affordable === true && <div className="afford-badge">Affordable</div>}
                  {rec.affordable === false && <div className="need-badge">Need more loot</div>}
                </div>
              </>
            )

            if (clickable) {
              return (
                <button
                  key={`${rec.dataId}-${rec.fromLevel}`}
                  type="button"
                  className={`rec-card clickable ${rec.affordable === true ? 'affordable' : ''}`}
                  onClick={() => onHeroClick(rec.dataId)}
                >
                  {body}
                </button>
              )
            }

            return (
              <article
                key={`${rec.dataId}-${rec.fromLevel}`}
                className={`rec-card ${rec.affordable === true ? 'affordable' : ''}`}
              >
                {body}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
