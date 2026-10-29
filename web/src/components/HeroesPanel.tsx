import type { VillageItem } from '../types'
import { ItemIcon } from './ItemIcon'

interface Props {
  heroes: VillageItem[]
  onHeroClick: (dataId: number) => void
}

export function HeroesPanel({ heroes, onHeroClick }: Props) {
  if (!heroes.length) return null
  return (
    <div className="hero-strip">
      {heroes.map((hero) => (
        <button
          key={hero.dataId}
          type="button"
          className="hero-chip"
          onClick={() => onHeroClick(hero.dataId)}
        >
          <ItemIcon
            name={hero.name}
            category="hero"
            base="home"
            level={hero.level}
            size={40}
          />
          <div>
            <strong>{hero.name}</strong>
            <div className="muted tiny">
              Lv {hero.level}
              {hero.upgrading ? ' · upgrading' : ''}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
