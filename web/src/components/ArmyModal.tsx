import type { ParsedArmy } from '../lib/army'
import { ItemIcon } from './ItemIcon'
import { ModalPortal } from './ModalPortal'

interface Props {
  title: string
  army: ParsedArmy
  onClose: () => void
}

function UnitGrid({
  label,
  units,
}: {
  label: string
  units: ParsedArmy['troops']
}) {
  if (!units.length) return null
  return (
    <div className="army-section">
      <h3>{label}</h3>
      <div className="army-grid">
        {units.map((unit) => (
          <div key={`${unit.kind}-${unit.id}`} className="army-unit">
            <ItemIcon name={unit.name} category={unit.category} base="home" size={52} />
            <div>
              <strong>×{unit.count}</strong>
              <div className="muted tiny">{unit.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArmyModal({ title, army, onClose }: Props) {
  return (
    <ModalPortal>
      <div className="modal-backdrop fullscreen" role="presentation" onClick={onClose}>
        <div
          className="modal-card fullscreen-card"
          role="dialog"
          aria-modal="true"
          aria-label="Army composition"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-head">
            <div>
              <h2>Army composition</h2>
              <p className="muted">{title}</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {!army.troops.length && !army.spells.length && !army.unknown.length ? (
            <p className="muted">Could not decode this army share code.</p>
          ) : (
            <div className="army-modal-body">
              <UnitGrid
                label="Troops"
                units={[
                  ...army.troops,
                  ...army.unknown.filter((u) => u.category === 'troop'),
                ]}
              />
              <UnitGrid
                label="Spells"
                units={[
                  ...army.spells,
                  ...army.unknown.filter((u) => u.category === 'spell'),
                ]}
              />
            </div>
          )}

          <p className="muted tiny army-raw">{army.raw}</p>
        </div>
      </div>
    </ModalPortal>
  )
}
