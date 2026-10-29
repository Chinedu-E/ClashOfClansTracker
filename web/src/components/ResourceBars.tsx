import { formatCompact, formatNumber } from '../lib/format'
import type { ResourceTotals } from '../types'

interface Props {
  remaining: ResourceTotals
  storage: ResourceTotals
  onStorageChange: (next: ResourceTotals) => void
}

const ORDER: (keyof ResourceTotals)[] = ['Gold', 'Elixir', 'Dark Elixir']

export function ResourceBars({ remaining, storage, onStorageChange }: Props) {
  const max = Math.max(...ORDER.map((key) => remaining[key]), 1)

  return (
    <div className="resource-panel">
      <div className="resource-bars">
        {ORDER.map((key) => {
          const amount = remaining[key]
          const width = `${Math.max(4, (amount / max) * 100)}%`
          const className =
            key === 'Gold' ? 'gold' : key === 'Elixir' ? 'elixir' : 'dark'
          return (
            <div key={key} className="resource-row">
              <div className="resource-meta">
                <span className={`resource-chip ${className}`}>{key}</span>
                <strong>{formatCompact(amount)}</strong>
              </div>
              <div className="resource-track">
                <div className={`resource-fill ${className}`} style={{ width }} />
              </div>
              <div className="muted tiny">{formatNumber(amount)} remaining</div>
            </div>
          )
        })}
      </div>

      <div className="storage-inputs">
        <h3>Current storages</h3>
        <p className="muted tiny">
          Optional. The export does not include loot — enter what you have so recommendations can
          mark affordability.
        </p>
        <div className="storage-grid">
          {ORDER.map((key) => (
            <label key={key} className="storage-field">
              <span>{key}</span>
              <input
                type="number"
                min={0}
                value={storage[key] || ''}
                placeholder="0"
                onChange={(event) =>
                  onStorageChange({
                    ...storage,
                    [key]: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
