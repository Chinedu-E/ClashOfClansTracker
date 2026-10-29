import { useMemo, useState } from 'react'
import gameData from '../game-data/index.json'
import { parseArmyShareCode, type ParsedArmy } from '../lib/army'
import { coreLoot } from '../lib/battleLoot'
import { formatCompact, formatRelativeTime } from '../lib/format'
import type { BattleLogEntry, GameDataIndex } from '../types'
import { ArmyModal } from './ArmyModal'

interface Props {
  battles: BattleLogEntry[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const DATA = gameData as GameDataIndex

function Stars({ count = 0 }: { count?: number }) {
  return (
    <span className="stars" aria-label={`${count} stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? 'lit' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

export function BattleLog({ battles, loading, error, onRefresh }: Props) {
  const [armyModal, setArmyModal] = useState<{
    title: string
    army: ParsedArmy
  } | null>(null)

  const cards = useMemo(
    () =>
      battles.slice(0, 40).map((battle, index) => ({
        battle,
        index,
        loot: coreLoot(battle),
      })),
    [battles],
  )

  function openArmy(battle: BattleLogEntry) {
    const army = parseArmyShareCode(battle.armyShareCode, DATA)
    if (!army) return
    const title = `${battle.attack ? 'Attack' : 'Defense'} vs ${
      battle.opponentName || battle.opponentPlayerTag || 'Unknown'
    }`
    setArmyModal({ title, army })
  }

  return (
    <div>
      <div className="section-toolbar">
        <button type="button" className="primary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh battle log'}
        </button>
      </div>
      {error && <p className="error-banner">{error}</p>}
      {!battles.length && !loading ? (
        <p className="muted">No battles stored yet. Refresh after pasting a village export.</p>
      ) : (
        <div className="battle-grid">
          {cards.map(({ battle, index, loot }) => {
            const destruction = battle.destructionPercentage ?? 0
            const hasArmy = Boolean(battle.armyShareCode?.trim())
            return (
              <article
                key={`${battle.battleTimestamp}-${battle.opponentPlayerTag}-${index}`}
                className={`battle-card ${battle.attack ? 'attack' : 'defense'}`}
              >
                <div className="battle-top">
                  <span className="battle-kind">{battle.attack ? 'Attack' : 'Defense'}</span>
                  <Stars count={battle.stars} />
                </div>
                <h3>
                  {battle.opponentName || battle.opponentPlayerTag || 'Unknown'}
                  {battle.opponentTownHallLevel != null && (
                    <span className="muted"> TH{battle.opponentTownHallLevel}</span>
                  )}
                </h3>
                <div className="muted tiny">{formatRelativeTime(battle.battleTimestamp)}</div>
                <div className="destruction-track">
                  <div className="destruction-fill" style={{ width: `${destruction}%` }} />
                </div>
                <div className="muted tiny">{destruction}% destruction</div>
                <div className="loot-chips">
                  <span className="resource-chip gold">{formatCompact(loot.gold)} Gold</span>
                  <span className="resource-chip elixir">{formatCompact(loot.elixir)} Elixir</span>
                  <span className="resource-chip dark">{formatCompact(loot.dark)} DE</span>
                </div>
                {hasArmy && (
                  <button type="button" className="linkish" onClick={() => openArmy(battle)}>
                    View army
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {armyModal && (
        <ArmyModal
          title={armyModal.title}
          army={armyModal.army}
          onClose={() => setArmyModal(null)}
        />
      )}
    </div>
  )
}
