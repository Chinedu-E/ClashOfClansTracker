import { formatCompact, formatDuration, formatNumber, resourceClass } from '../lib/format'
import type { HeroPathSummary } from '../lib/progress'
import { ItemIcon } from './ItemIcon'
import { ModalPortal } from './ModalPortal'

interface Props {
  summary: HeroPathSummary
  onClose: () => void
}

export function HeroPathModal({ summary, onClose }: Props) {
  const hasDiscount =
    summary.cost !== summary.costBeforeDiscount ||
    summary.timeSeconds !== summary.timeBeforeDiscount

  return (
    <ModalPortal>
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${summary.name} upgrade path`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title-row">
            <ItemIcon name={summary.name} category="hero" base="home" level={summary.fromLevel} size={56} />
            <div>
              <h2>{summary.name}</h2>
              <p className="muted">
                Path to TH{summary.townHall} max (Lv {summary.fromLevel} → {summary.toLevel})
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {summary.levelsRemaining === 0 ? (
          <p className="muted">Already at the max level for Town Hall {summary.townHall}.</p>
        ) : (
          <div className="hero-path-stats">
            <div className="hero-path-stat">
              <span className="muted">Levels left</span>
              <strong>{summary.levelsRemaining}</strong>
            </div>
            <div className="hero-path-stat">
              <span className="muted">Total cost</span>
              <strong className={`resource-chip ${resourceClass(summary.resource)}`}>
                {formatCompact(summary.cost)} {summary.resource}
              </strong>
              {hasDiscount && (
                <span className="muted tiny strike">
                  was {formatNumber(summary.costBeforeDiscount)}
                </span>
              )}
            </div>
            <div className="hero-path-stat">
              <span className="muted">Total time</span>
              <strong>{formatDuration(summary.timeSeconds)}</strong>
              {hasDiscount && (
                <span className="muted tiny strike">
                  was {formatDuration(summary.timeBeforeDiscount)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}
