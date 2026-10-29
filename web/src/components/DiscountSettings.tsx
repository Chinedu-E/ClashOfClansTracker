import { clampDiscount, type GlobalDiscounts } from '../lib/discounts'

interface Props {
  discounts: GlobalDiscounts
  onChange: (next: GlobalDiscounts) => void
}

export function DiscountSettings({ discounts, onChange }: Props) {
  return (
    <div className="discount-panel">
      <div>
        <h3>Global builder discounts</h3>
        <p className="muted tiny">
          Applied to remaining costs, recommendations, and hero max paths (Gold Pass / event
          boosts).
        </p>
      </div>
      <div className="discount-grid">
        <label className="storage-field">
          <span>Cost discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={discounts.costPercent}
            onChange={(event) =>
              onChange({
                ...discounts,
                costPercent: clampDiscount(Number(event.target.value) || 0),
              })
            }
          />
        </label>
        <label className="storage-field">
          <span>Time discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={discounts.timePercent}
            onChange={(event) =>
              onChange({
                ...discounts,
                timePercent: clampDiscount(Number(event.target.value) || 0),
              })
            }
          />
        </label>
      </div>
      {(discounts.costPercent > 0 || discounts.timePercent > 0) && (
        <p className="discount-active">
          Active: {discounts.costPercent}% cheaper, {discounts.timePercent}% faster
        </p>
      )}
    </div>
  )
}
