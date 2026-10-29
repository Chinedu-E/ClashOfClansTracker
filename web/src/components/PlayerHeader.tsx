import type { PlayerProfile } from '../types'
import { formatNumber } from '../lib/format'

interface Props {
  tag: string
  townHall: number
  builderHall: number
  player: PlayerProfile | null
  playerError: string | null
  view: 'home' | 'builder'
  onViewChange: (view: 'home' | 'builder') => void
  hasBuilder: boolean
}

export function PlayerHeader({
  tag,
  townHall,
  builderHall,
  player,
  playerError,
  view,
  onViewChange,
  hasBuilder,
}: Props) {
  const name = player?.name ?? 'Your village'
  const league = player?.league?.name
  const trophies = player?.trophies
  const clan = player?.clan

  return (
    <div className="hero-header nested">
      <div className="hero-main">
        <div className="th-badge">
          <span>TH</span>
          <strong>{townHall}</strong>
        </div>
        <div>
          <h3 className="hero-name">{name}</h3>
          <div className="hero-sub">
            <code>{tag}</code>
            {league && <span className="pill">{league}</span>}
            {trophies != null && <span className="pill">{formatNumber(trophies)} trophies</span>}
            {clan && (
              <span className="pill">
                {clan.name} {clan.tag}
              </span>
            )}
            {player?.warStars != null && (
              <span className="pill">{formatNumber(player.warStars)} war stars</span>
            )}
          </div>
          {playerError && <p className="muted tiny">API: {playerError}</p>}
        </div>
      </div>
      {hasBuilder && (
        <div className="seg">
          <button
            type="button"
            className={view === 'home' ? 'active' : ''}
            onClick={() => onViewChange('home')}
          >
            Home Village
          </button>
          <button
            type="button"
            className={view === 'builder' ? 'active' : ''}
            onClick={() => onViewChange('builder')}
          >
            Builder Base (BH{builderHall || '?'})
          </button>
        </div>
      )}
    </div>
  )
}
