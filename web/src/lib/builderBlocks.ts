import { applyCostDiscount, applyTimeDiscount, type GlobalDiscounts } from './discounts'
import { maxHeroLevelAtTownHall, maxLevelFor } from './progress'
import type {
  ActiveUpgrade,
  GameDataIndex,
  GameEntity,
  ResourceTotals,
  VillageItem,
} from '../types'

/** Upgrades that occupy a village builder (not lab / pet house / blacksmith research). */
const BUILDER_ACTIVE_CATEGORIES = new Set([
  'defense',
  'resource',
  'army',
  'trap',
  'wall',
  'town-hall',
  'research',
  'hero',
])

export function isBuilderActive(active: Pick<ActiveUpgrade, 'category' | 'base'>): boolean {
  return active.base === 'home' && BUILDER_ACTIVE_CATEGORIES.has(active.category)
}

export const BUILDER_COUNT = 6

export interface BlockLine {
  id: string
  buildingDataId: number
  quantity: number
  /** Higher priority is recommended first. */
  priority: number
}

export interface BuilderBlock {
  builderIndex: number
  lines: BlockLine[]
}

export type BuilderBlocksState = BuilderBlock[]

export interface BuildingOption {
  dataId: number
  name: string
  category: string
}

export interface LineCostBreakdown {
  lineId: string
  buildingDataId: number
  name: string
  category: string
  quantity: number
  priority: number
  unitCost: number
  unitResource: string
  unitTimeSeconds: number
  totalCost: number
  totalTimeSeconds: number
  fromLevel: number | null
  toLevel: number | null
}

export interface BlockTotals {
  builderIndex: number
  gold: number
  elixir: number
  dark: number
  serialTimeSeconds: number
  builderHours: number
  remainingQuantity: number
  lines: LineCostBreakdown[]
}

export interface MatchedInProgress {
  active: ActiveUpgrade
  builderIndex: number
  lineId: string
  buildingDataId: number
  name: string
}

export interface NextStartItem {
  builderIndex: number
  lineId: string
  buildingDataId: number
  name: string
  category: string
  priority: number
  remainingQuantity: number
  unitCost: number
  unitResource: string
  unitTimeSeconds: number
  fromLevel: number | null
  toLevel: number | null
}

export interface HandoffMessage {
  builderIndex: number
  message: string
  nextItemName: string | null
  blockingUpgradeName: string | null
  finishesAt: number | null
}

export interface LiveBlockBoard {
  totals: BlockTotals[]
  inProgressByBuilder: Record<number, MatchedInProgress[]>
  unmatchedActives: ActiveUpgrade[]
  nextByBuilder: Record<number, NextStartItem[]>
  handoffs: HandoffMessage[]
  freeBuilderSlots: number
  builderCapacity: number
}

export function createEmptyBlocks(): BuilderBlocksState {
  return Array.from({ length: BUILDER_COUNT }, (_, index) => ({
    builderIndex: index + 1,
    lines: [],
  }))
}

export function newLineId(): string {
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function listBuildableOptions(gameData: GameDataIndex): BuildingOption[] {
  const allowed = new Set([
    'defense',
    'resource',
    'army',
    'trap',
    'wall',
    'town-hall',
    'research',
    'hero',
  ])
  return Object.values(gameData)
    .filter((entity) => entity.base === 'home' && allowed.has(entity.category))
    .map((entity) => ({
      dataId: entity.dataId,
      name: entity.name,
      category: entity.category,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Display / debug key for a timer; not used for plan completion. */
export function activeTimerKey(active: Pick<ActiveUpgrade, 'dataId' | 'finishesAt'>): string {
  return `${active.dataId}:${active.finishesAt}`
}

/**
 * Stable continuity key across re-pastes. Export timestamps shift `finishesAt`
 * every paste, so completion must never key off that value.
 */
export function continuityKey(lineId: string, buildingDataId: number): string {
  return `${lineId}:${buildingDataId}`
}

export interface InProgressSnapshotEntry {
  key: string
  continuity: string
  lineId: string
  builderIndex: number
  buildingDataId: number
}

function matchActivesToLines(
  blocks: BuilderBlocksState,
  actives: ActiveUpgrade[],
): InProgressSnapshotEntry[] {
  const remainingQty: Record<string, number> = {}
  for (const block of blocks) {
    for (const line of block.lines) remainingQty[line.id] = Math.max(0, line.quantity)
  }
  const ownershipIndex = blocks.flatMap((block) =>
    block.lines.map((line, order) => ({ builderIndex: block.builderIndex, line, order })),
  )
  const snapshot: InProgressSnapshotEntry[] = []
  for (const active of actives.filter(isBuilderActive)) {
    const candidates = ownershipIndex
      .filter(
        (row) =>
          row.line.buildingDataId === active.dataId && (remainingQty[row.line.id] ?? 0) > 0,
      )
      .sort(
        (a, b) =>
          b.line.priority - a.line.priority ||
          a.builderIndex - b.builderIndex ||
          a.order - b.order,
      )
    const hit = candidates[0]
    if (!hit) continue
    remainingQty[hit.line.id] = Math.max(0, (remainingQty[hit.line.id] ?? 0) - 1)
    snapshot.push({
      key: activeTimerKey(active),
      continuity: continuityKey(hit.line.id, hit.line.buildingDataId),
      lineId: hit.line.id,
      builderIndex: hit.builderIndex,
      buildingDataId: hit.line.buildingDataId,
    })
  }
  return snapshot
}

/**
 * Refresh the in-progress snapshot after an export paste.
 *
 * Plans are never auto-removed when timers change: re-exports shift
 * `finishesAt`, which used to look like completions and wiped queue lines.
 * Path-to-max lines stay until the player edits them or they are pruned as maxed.
 */
export function reconcileCompletedUpgrades(
  blocks: BuilderBlocksState,
  actives: ActiveUpgrade[],
  _previous: InProgressSnapshotEntry[] = [],
): { blocks: BuilderBlocksState; snapshot: InProgressSnapshotEntry[]; changed: boolean } {
  const currentSnapshot = matchActivesToLines(blocks, actives)
  void _previous
  return { blocks, snapshot: currentSnapshot, changed: false }
}

/** Drop planned lines that already have nothing left to TH max. */
export function pruneMaxedBlockLines(
  blocks: BuilderBlocksState,
  items: VillageItem[],
  gameData: GameDataIndex,
  hallLevel: number,
): { blocks: BuilderBlocksState; changed: boolean } {
  let changed = false
  const next = blocks.map((block) => {
    const lines = block.lines.filter((line) => {
      const entity = gameData[String(line.buildingDataId)]
      if (!entity || line.quantity <= 0) {
        changed = true
        return false
      }
      const toLevel = capForEntity(entity, line.buildingDataId, items, hallLevel, gameData)
      const fallback = currentBuildingLevel(items, line.buildingDataId) ?? 0
      const fromLevels = instanceLevelsForLine(items, line.buildingDataId, line.quantity, fallback)
      const path = pathToMaxForLevels(entity, fromLevels, toLevel, {
        costPercent: 0,
        timePercent: 0,
      })
      if (path.levelsRemaining <= 0) {
        changed = true
        return false
      }
      return true
    })
    return lines === block.lines ? block : { ...block, lines }
  })
  return { blocks: changed ? next : blocks, changed }
}

function emptyResources(): ResourceTotals {
  return { Gold: 0, Elixir: 0, 'Dark Elixir': 0 }
}

function addResource(totals: ResourceTotals, resource: string, amount: number) {
  if (!amount) return
  const key = resource.toLowerCase()
  if (key.includes('dark')) totals['Dark Elixir'] += amount
  else if (key.includes('elixir')) totals.Elixir += amount
  else if (key.includes('gold')) totals.Gold += amount
}

/** Best current level snapshot for a building from village items. */
export function currentBuildingLevel(items: VillageItem[], dataId: number): number | null {
  const matches = items.filter(
    (item) => item.base === 'home' && item.dataId === dataId && !item.upgrading,
  )
  if (!matches.length) {
    const upgrading = items.find(
      (item) => item.base === 'home' && item.dataId === dataId && item.upgrading,
    )
    return upgrading ? upgrading.level : null
  }
  // Use the lowest idle level — those are the next upgrades you typically queue.
  return Math.min(...matches.map((item) => item.level))
}

function nextLevelForBuilding(
  entity: GameEntity,
  fromLevel: number | null,
): { fromLevel: number; toLevel: number; cost: number; resource: string; timeSeconds: number } | null {
  if (fromLevel == null) {
    const first = entity.levels.find((level) => level.level === 1) ?? entity.levels[0]
    if (!first) return null
    return {
      fromLevel: Math.max(0, first.level - 1),
      toLevel: first.level,
      cost: first.cost ?? 0,
      resource: first.resource ?? 'Gold',
      timeSeconds: first.timeSeconds,
    }
  }
  const next = entity.levels.find((level) => level.level === fromLevel + 1)
  if (!next) return null
  return {
    fromLevel,
    toLevel: next.level,
    cost: next.cost ?? 0,
    resource: next.resource ?? 'Gold',
    timeSeconds: next.timeSeconds,
  }
}

function capForEntity(
  entity: GameEntity,
  dataId: number,
  items: VillageItem[],
  hallLevel: number,
  gameData: GameDataIndex,
): number {
  const sample =
    items.find((item) => item.base === 'home' && item.dataId === dataId) ??
    ({
      dataId,
      name: entity.name,
      category: entity.category,
      base: 'home' as const,
      level: 0,
      count: 1,
      upgrading: false,
      finishesAt: null,
      remainingSeconds: null,
      gearUp: false,
      supercharge: null,
      known: true,
      entity,
    } satisfies VillageItem)

  if (entity.category === 'hero') {
    return maxHeroLevelAtTownHall(sample, hallLevel, gameData)
  }
  return maxLevelFor(sample, hallLevel, items)
}

/** Instance levels for the lowest `qty` idle copies (falls back to upgrading / assumed level). */
function instanceLevelsForLine(
  items: VillageItem[],
  dataId: number,
  qty: number,
  fallbackLevel: number,
): number[] {
  const idle = items
    .filter((item) => item.base === 'home' && item.dataId === dataId && !item.upgrading)
    .flatMap((item) => Array.from({ length: Math.max(1, item.count) }, () => item.level))
    .sort((a, b) => a - b)

  if (idle.length >= qty) return idle.slice(0, qty)

  const upgrading = items
    .filter((item) => item.base === 'home' && item.dataId === dataId && item.upgrading)
    .map((item) => item.level)
  const pooled = [...idle, ...upgrading].sort((a, b) => a - b)
  const levels: number[] = []
  for (let i = 0; i < qty; i += 1) {
    levels.push(pooled[i] ?? fallbackLevel)
  }
  return levels
}

interface PathToMax {
  fromLevel: number
  toLevel: number
  levelsRemaining: number
  gold: number
  elixir: number
  dark: number
  timeSeconds: number
  /** Dominant resource for chips (largest share). */
  primaryResource: string
  primaryCost: number
}

function pathToMaxForLevels(
  entity: GameEntity,
  fromLevels: number[],
  toLevel: number,
  discounts: GlobalDiscounts,
): PathToMax {
  const resources = emptyResources()
  let timeSeconds = 0
  let levelsRemaining = 0
  let minFrom = fromLevels[0] ?? 0

  for (const fromLevel of fromLevels) {
    minFrom = Math.min(minFrom, fromLevel)
    for (let lvl = fromLevel + 1; lvl <= toLevel; lvl += 1) {
      const row = entity.levels.find((level) => level.level === lvl)
      if (!row) continue
      levelsRemaining += 1
      addResource(resources, row.resource ?? 'Gold', applyCostDiscount(row.cost ?? 0, discounts))
      timeSeconds += applyTimeDiscount(row.timeSeconds, discounts)
    }
  }

  const primaryResource =
    resources['Dark Elixir'] >= resources.Gold && resources['Dark Elixir'] >= resources.Elixir
      ? 'Dark Elixir'
      : resources.Elixir >= resources.Gold
        ? 'Elixir'
        : 'Gold'
  const primaryCost =
    primaryResource === 'Dark Elixir'
      ? resources['Dark Elixir']
      : primaryResource === 'Elixir'
        ? resources.Elixir
        : resources.Gold

  return {
    fromLevel: minFrom,
    toLevel,
    levelsRemaining,
    gold: resources.Gold,
    elixir: resources.Elixir,
    dark: resources['Dark Elixir'],
    timeSeconds,
    primaryResource,
    primaryCost,
  }
}

export function computeBlockTotals(
  blocks: BuilderBlocksState,
  items: VillageItem[],
  gameData: GameDataIndex,
  discounts: GlobalDiscounts,
  hallLevel: number,
  remainingQtyByLine?: Record<string, number>,
): BlockTotals[] {
  return blocks.map((block) => {
    const resources = emptyResources()
    let serialTimeSeconds = 0
    let remainingQuantity = 0
    const lines: LineCostBreakdown[] = []

    for (const line of block.lines) {
      const entity = gameData[String(line.buildingDataId)]
      if (!entity) continue
      const qty =
        remainingQtyByLine && Object.prototype.hasOwnProperty.call(remainingQtyByLine, line.id)
          ? Math.max(0, remainingQtyByLine[line.id])
          : Math.max(0, line.quantity)
      if (qty <= 0) {
        lines.push({
          lineId: line.id,
          buildingDataId: line.buildingDataId,
          name: entity.name,
          category: entity.category,
          quantity: 0,
          priority: line.priority,
          unitCost: 0,
          unitResource: 'Gold',
          unitTimeSeconds: 0,
          totalCost: 0,
          totalTimeSeconds: 0,
          fromLevel: null,
          toLevel: null,
        })
        continue
      }

      const toLevel = capForEntity(entity, line.buildingDataId, items, hallLevel, gameData)
      const fallback = currentBuildingLevel(items, line.buildingDataId) ?? 0
      const fromLevels = instanceLevelsForLine(items, line.buildingDataId, qty, fallback)
      const path = pathToMaxForLevels(entity, fromLevels, toLevel, discounts)

      remainingQuantity += path.levelsRemaining
      serialTimeSeconds += path.timeSeconds
      resources.Gold += path.gold
      resources.Elixir += path.elixir
      resources['Dark Elixir'] += path.dark

      const perCopyTime = qty > 0 ? Math.round(path.timeSeconds / qty) : 0
      const perCopyCost = qty > 0 ? Math.round(path.primaryCost / qty) : 0

      lines.push({
        lineId: line.id,
        buildingDataId: line.buildingDataId,
        name: entity.name,
        category: entity.category,
        quantity: qty,
        priority: line.priority,
        unitCost: perCopyCost,
        unitResource: path.primaryResource,
        unitTimeSeconds: perCopyTime,
        totalCost: path.primaryCost,
        totalTimeSeconds: path.timeSeconds,
        fromLevel: path.fromLevel,
        toLevel: path.toLevel,
      })
    }

    return {
      builderIndex: block.builderIndex,
      gold: resources.Gold,
      elixir: resources.Elixir,
      dark: resources['Dark Elixir'],
      serialTimeSeconds,
      builderHours: serialTimeSeconds / 3600,
      remainingQuantity,
      lines,
    }
  })
}

function countBuilderCapacity(items: VillageItem[]): number {
  const huts = items.filter(
    (item) =>
      item.base === 'home' &&
      (item.name === "Builders Hut" ||
        item.name === "Builder's Hut" ||
        item.dataId === 1000015),
  )
  const fromHuts = huts.reduce((sum, hut) => sum + Math.max(1, hut.count), 0)
  return Math.max(BUILDER_COUNT, fromHuts || BUILDER_COUNT)
}

/**
 * Live board: match export timers onto owning blocks, recommend next by priority,
 * and surface handoff messages when builders are tied up off-block.
 */
export function buildLiveBoard(
  blocks: BuilderBlocksState,
  items: VillageItem[],
  actives: ActiveUpgrade[],
  gameData: GameDataIndex,
  discounts: GlobalDiscounts,
  hallLevel: number,
): LiveBlockBoard {
  const matchSlots: Record<string, number> = {}
  for (const block of blocks) {
    for (const line of block.lines) {
      matchSlots[line.id] = Math.max(0, line.quantity)
    }
  }

  const inProgressByBuilder: Record<number, MatchedInProgress[]> = {}
  for (let i = 1; i <= BUILDER_COUNT; i += 1) inProgressByBuilder[i] = []
  const unmatchedActives: ActiveUpgrade[] = []

  // Prefer matching timers to the earliest / highest-priority owning line.
  const ownershipIndex = blocks.flatMap((block) =>
    block.lines.map((line, order) => ({
      builderIndex: block.builderIndex,
      line,
      order,
    })),
  )

  const homeActives = actives.filter((active) => active.base === 'home')
  const builderActives = homeActives.filter(isBuilderActive)

  for (const active of homeActives) {
    // Only builder-slot work claims planned lines; lab research never owns a queue line match.
    if (!isBuilderActive(active)) {
      continue
    }
    const candidates = ownershipIndex
      .filter(
        (row) =>
          row.line.buildingDataId === active.dataId && (matchSlots[row.line.id] ?? 0) > 0,
      )
      .sort(
        (a, b) =>
          b.line.priority - a.line.priority ||
          a.builderIndex - b.builderIndex ||
          a.order - b.order,
      )

    const hit = candidates[0]
    if (!hit) {
      unmatchedActives.push(active)
      continue
    }

    matchSlots[hit.line.id] = Math.max(0, (matchSlots[hit.line.id] ?? 0) - 1)
    inProgressByBuilder[hit.builderIndex].push({
      active,
      builderIndex: hit.builderIndex,
      lineId: hit.line.id,
      buildingDataId: hit.line.buildingDataId,
      name: active.name,
    })
  }

  // Path-to-max totals use village levels (not match-slot consumption).
  const totals = computeBlockTotals(blocks, items, gameData, discounts, hallLevel)

  const nextByBuilder: Record<number, NextStartItem[]> = {}
  for (const block of blocks) {
    const nexts: NextStartItem[] = []
    const ranked = [...block.lines].sort(
      (a, b) => b.priority - a.priority || block.lines.indexOf(a) - block.lines.indexOf(b),
    )
    for (const line of ranked) {
      if (line.quantity <= 0) continue
      const entity = gameData[String(line.buildingDataId)]
      if (!entity) continue
      const toLevel = capForEntity(entity, line.buildingDataId, items, hallLevel, gameData)
      const fallback = currentBuildingLevel(items, line.buildingDataId) ?? 0
      const fromLevels = instanceLevelsForLine(items, line.buildingDataId, line.quantity, fallback)
      const path = pathToMaxForLevels(entity, fromLevels, toLevel, discounts)
      if (path.levelsRemaining <= 0) continue

      const inFlight = (inProgressByBuilder[block.builderIndex] ?? []).filter(
        (row) => row.lineId === line.id,
      ).length
      const fromLevel = Math.min(...fromLevels)
      // Recommend the next level after any in-flight upgrade on this line.
      const adjustedFrom =
        inFlight > 0 ? Math.min(toLevel - 1, fromLevel + inFlight) : fromLevel
      const nextRow = nextLevelForBuilding(entity, adjustedFrom)
      if (!nextRow || nextRow.toLevel > toLevel) continue

      nexts.push({
        builderIndex: block.builderIndex,
        lineId: line.id,
        buildingDataId: line.buildingDataId,
        name: entity.name,
        category: entity.category,
        priority: line.priority,
        remainingQuantity: path.levelsRemaining,
        unitCost: applyCostDiscount(nextRow.cost, discounts),
        unitResource: nextRow.resource,
        unitTimeSeconds: applyTimeDiscount(nextRow.timeSeconds, discounts),
        fromLevel: nextRow.fromLevel,
        toLevel: nextRow.toLevel,
      })
    }
    nextByBuilder[block.builderIndex] = nexts
  }

  const builderCapacity = countBuilderCapacity(items)
  const busySlots = builderActives.length
  const freeBuilderSlots = Math.max(0, builderCapacity - busySlots)

  type HandoffNeed = {
    builderIndex: number
    next: NextStartItem
    inProgress: MatchedInProgress[]
    remaining: number
    kind: 'idle' | 'more-help' | 'free'
  }

  const needs: HandoffNeed[] = []
  for (const block of blocks) {
    const next = nextByBuilder[block.builderIndex]?.[0]
    const inProgress = inProgressByBuilder[block.builderIndex] ?? []
    const remaining =
      totals.find((t) => t.builderIndex === block.builderIndex)?.remainingQuantity ?? 0
    if (!next || remaining <= 0) continue

    if (inProgress.length === 0 && freeBuilderSlots === 0) {
      needs.push({ builderIndex: block.builderIndex, next, inProgress, remaining, kind: 'idle' })
    } else if (inProgress.length > 0 && freeBuilderSlots === 0 && remaining > inProgress.length) {
      needs.push({
        builderIndex: block.builderIndex,
        next,
        inProgress,
        remaining,
        kind: 'more-help',
      })
    } else if (inProgress.length === 0 && freeBuilderSlots > 0) {
      needs.push({ builderIndex: block.builderIndex, next, inProgress, remaining, kind: 'free' })
    }
  }

  // Unique "after X finishes" assignment: prefer unmatched builder work, then other blocks' timers.
  const releasers = [...unmatchedActives, ...builderActives]
    .filter((active, index, arr) => arr.findIndex((a) => a === active) === index)
    .sort((a, b) => a.finishesAt - b.finishesAt)

  const usedReleaserKeys = new Set<string>()
  const handoffs: HandoffMessage[] = []

  for (const need of needs) {
    if (need.kind === 'free') {
      handoffs.push({
        builderIndex: need.builderIndex,
        nextItemName: need.next.name,
        blockingUpgradeName: null,
        finishesAt: null,
        message: `Builder slot free — start Builder ${need.builderIndex}'s next item: ${need.next.name}.`,
      })
      continue
    }

    const inProgressKeys = new Set(
      need.inProgress.map((row) => activeTimerKey(row.active)),
    )
    const blocking =
      releasers.find((active) => {
        const key = activeTimerKey(active)
        if (usedReleaserKeys.has(key)) return false
        if (inProgressKeys.has(key)) return false
        return true
      }) ?? null

    if (blocking) usedReleaserKeys.add(activeTimerKey(blocking))

    if (need.kind === 'idle') {
      handoffs.push({
        builderIndex: need.builderIndex,
        nextItemName: need.next.name,
        blockingUpgradeName: blocking?.name ?? null,
        finishesAt: blocking?.finishesAt ?? null,
        message: blocking
          ? `After ${blocking.name} finishes, assign a free builder to start Builder ${need.builderIndex}'s next item: ${need.next.name}.`
          : `Assign a free builder to start Builder ${need.builderIndex}'s next item: ${need.next.name}.`,
      })
    } else {
      const helping = need.inProgress.length
      handoffs.push({
        builderIndex: need.builderIndex,
        nextItemName: need.next.name,
        blockingUpgradeName: blocking?.name ?? null,
        finishesAt: blocking?.finishesAt ?? null,
        message: blocking
          ? `${helping} builder${helping === 1 ? '' : 's'} already on Builder ${need.builderIndex}'s block. After ${blocking.name} finishes, assign another builder to ${need.next.name}.`
          : `${helping} builder${helping === 1 ? '' : 's'} already on Builder ${need.builderIndex}'s block. Assign another builder to ${need.next.name} when a slot frees.`,
      })
    }
  }

  return {
    totals,
    inProgressByBuilder,
    unmatchedActives,
    nextByBuilder,
    handoffs,
    freeBuilderSlots,
    builderCapacity,
  }
}

export function blocksHavePlans(blocks: BuilderBlocksState): boolean {
  return blocks.some((block) => block.lines.some((line) => line.quantity > 0 && line.buildingDataId))
}

export function normalizeBlocks(raw: unknown): BuilderBlocksState {
  const empty = createEmptyBlocks()
  if (!Array.isArray(raw)) return empty
  return empty.map((slot) => {
    const found = raw.find(
      (row) =>
        row &&
        typeof row === 'object' &&
        (row as BuilderBlock).builderIndex === slot.builderIndex,
    ) as BuilderBlock | undefined
    if (!found) return slot
    const lines = Array.isArray(found.lines)
      ? found.lines
          .filter((line) => line && typeof line === 'object')
          .map((line) => ({
            id: typeof line.id === 'string' && line.id ? line.id : newLineId(),
            buildingDataId: Number(line.buildingDataId) || 0,
            quantity: Math.max(0, Number(line.quantity) || 0),
            priority: Number(line.priority) || 0,
          }))
          .filter((line) => line.buildingDataId > 0)
      : []
    return { builderIndex: slot.builderIndex, lines }
  })
}
