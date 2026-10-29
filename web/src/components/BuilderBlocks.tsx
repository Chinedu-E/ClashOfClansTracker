import { useMemo } from 'react'
import {
  blocksHavePlans,
  buildLiveBoard,
  computeBlockTotals,
  listBuildableOptions,
  newLineId,
  type BuilderBlocksState,
  type BlockLine,
} from '../lib/builderBlocks'
import type { GlobalDiscounts } from '../lib/discounts'
import { formatCompact, formatCountdown, formatDuration, resourceClass } from '../lib/format'
import type {
  ActiveUpgrade,
  GameDataIndex,
  VillageItem,
} from '../types'
import { ItemIcon } from './ItemIcon'

interface Props {
  blocks: BuilderBlocksState
  onChange: (blocks: BuilderBlocksState) => void
  items: VillageItem[]
  actives: ActiveUpgrade[]
  gameData: GameDataIndex
  discounts: GlobalDiscounts
  hallLevel: number
}

function updateBlock(
  blocks: BuilderBlocksState,
  builderIndex: number,
  updater: (lines: BlockLine[]) => BlockLine[],
): BuilderBlocksState {
  return blocks.map((block) =>
    block.builderIndex === builderIndex ? { ...block, lines: updater(block.lines) } : block,
  )
}

function ResourceTotalsRow({
  gold,
  elixir,
  dark,
  serialTimeSeconds,
}: {
  gold: number
  elixir: number
  dark: number
  serialTimeSeconds: number
}) {
  const chips: { label: string; value: number; resource: string }[] = []
  if (gold > 0) chips.push({ label: 'Gold', value: gold, resource: 'Gold' })
  if (elixir > 0) chips.push({ label: 'Elixir', value: elixir, resource: 'Elixir' })
  if (dark > 0) chips.push({ label: 'DE', value: dark, resource: 'Dark Elixir' })
  if (!chips.length && serialTimeSeconds <= 0) return null

  return (
    <div className="builder-totals">
      <div className="builder-totals-row">
        {chips.map((chip) => (
          <span key={chip.label} className={`resource-chip ${resourceClass(chip.resource)}`}>
            {formatCompact(chip.value)} {chip.label}
          </span>
        ))}
        {serialTimeSeconds > 0 && (
          <span className="time-chip">{formatDuration(serialTimeSeconds)} to max</span>
        )}
      </div>
    </div>
  )
}

export function BuilderBlocks({
  blocks,
  onChange,
  items,
  actives,
  gameData,
  discounts,
  hallLevel,
}: Props) {
  const options = useMemo(() => listBuildableOptions(gameData), [gameData])
  const editTotals = useMemo(
    () => computeBlockTotals(blocks, items, gameData, discounts, hallLevel),
    [blocks, items, gameData, discounts, hallLevel],
  )
  const live = useMemo(
    () => buildLiveBoard(blocks, items, actives, gameData, discounts, hallLevel),
    [blocks, items, actives, gameData, discounts, hallLevel],
  )
  const showLive = blocksHavePlans(blocks)

  const addLine = (builderIndex: number) => {
    const first = options[0]
    if (!first) return
    onChange(
      updateBlock(blocks, builderIndex, (lines) => [
        ...lines,
        {
          id: newLineId(),
          buildingDataId: first.dataId,
          quantity: 1,
          priority: lines.length ? Math.max(...lines.map((l) => l.priority)) + 1 : 1,
        },
      ]),
    )
  }

  const patchLine = (
    builderIndex: number,
    lineId: string,
    patch: Partial<Pick<BlockLine, 'buildingDataId' | 'quantity' | 'priority'>>,
  ) => {
    onChange(
      updateBlock(blocks, builderIndex, (lines) =>
        lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
      ),
    )
  }

  const removeLine = (builderIndex: number, lineId: string) => {
    onChange(updateBlock(blocks, builderIndex, (lines) => lines.filter((l) => l.id !== lineId)))
  }

  return (
    <div className="builder-blocks">
      <div className="builder-blocks-toolbar">
        <p className="muted">
          Queues to TH max
          {showLive
            ? ` · ${live.freeBuilderSlots}/${live.builderCapacity} builders free`
            : ''}
          {live.unmatchedActives.length > 0
            ? ` · off-block: ${live.unmatchedActives.map((a) => a.name).join(', ')}`
            : ''}
        </p>
      </div>

      {live.handoffs.length > 0 && (
        <ul className="builder-handoff-list">
          {live.handoffs.map((handoff) => (
            <li key={handoff.builderIndex}>{handoff.message}</li>
          ))}
        </ul>
      )}

      <div className="builder-grid">
        {blocks.map((block) => {
          const totals = editTotals.find((t) => t.builderIndex === block.builderIndex)
          const inProgress = showLive ? live.inProgressByBuilder[block.builderIndex] ?? [] : []
          const next = showLive ? live.nextByBuilder[block.builderIndex]?.[0] : undefined

          return (
            <article key={block.builderIndex} className="builder-card">
              <header className="builder-card-head">
                <h4>Builder {block.builderIndex}</h4>
                <button
                  type="button"
                  className="tiny-btn"
                  onClick={() => addLine(block.builderIndex)}
                >
                  + Add
                </button>
              </header>

              {showLive && (inProgress.length > 0 || next) && (
                <div className="builder-status">
                  {inProgress.map((row) => (
                    <div
                      key={`${row.lineId}-${row.active.finishesAt}`}
                      className="builder-status-row"
                    >
                      <ItemIcon
                        name={row.name}
                        category={row.active.category}
                        base="home"
                        level={row.active.toLevel}
                        size={28}
                      />
                      <span className="builder-status-text">
                        <strong>{row.name}</strong>
                        <span className="muted"> · {formatCountdown(row.active.finishesAt)}</span>
                      </span>
                      <span className="builder-status-tag">Now</span>
                    </div>
                  ))}
                  {next && (
                    <div className="builder-status-row next">
                      <ItemIcon
                        name={next.name}
                        category={next.category}
                        base="home"
                        level={next.toLevel ?? 1}
                        size={28}
                      />
                      <span className="builder-status-text">
                        <strong>{next.name}</strong>
                        {next.fromLevel != null && next.toLevel != null && (
                          <span className="muted">
                            {' '}
                            {next.fromLevel}→{next.toLevel}
                          </span>
                        )}
                      </span>
                      <span className="builder-status-tag next">Next</span>
                    </div>
                  )}
                </div>
              )}

              {!block.lines.length ? (
                <p className="muted tiny builder-empty">Empty queue</p>
              ) : (
                <ul className="builder-edit-list">
                  {block.lines.map((line) => (
                    <li key={line.id}>
                      <select
                        value={line.buildingDataId || ''}
                        onChange={(e) =>
                          patchLine(block.builderIndex, line.id, {
                            buildingDataId: Number(e.target.value),
                          })
                        }
                        aria-label="Building"
                      >
                        {options.map((opt) => (
                          <option key={opt.dataId} value={opt.dataId}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        title="Quantity"
                        aria-label="Quantity"
                        onChange={(e) =>
                          patchLine(block.builderIndex, line.id, {
                            quantity: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                      <input
                        type="number"
                        value={line.priority}
                        title="Priority (higher first)"
                        aria-label="Priority"
                        onChange={(e) =>
                          patchLine(block.builderIndex, line.id, {
                            priority: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="tiny-btn danger"
                        onClick={() => removeLine(block.builderIndex, line.id)}
                        aria-label="Remove line"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {totals && (
                <ResourceTotalsRow
                  gold={totals.gold}
                  elixir={totals.elixir}
                  dark={totals.dark}
                  serialTimeSeconds={totals.serialTimeSeconds}
                />
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
