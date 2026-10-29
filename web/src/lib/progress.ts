import { applyCostDiscount, applyTimeDiscount, type GlobalDiscounts } from './discounts'
import type {
  ActiveUpgrade,
  GameDataIndex,
  ProgressCategory,
  Recommendation,
  ResourceTotals,
  SortMode,
  VillageItem,
} from '../types'

export interface HeroPathSummary {
  dataId: number
  name: string
  fromLevel: number
  toLevel: number
  townHall: number
  levelsRemaining: number
  cost: number
  resource: string
  timeSeconds: number
  costBeforeDiscount: number
  timeBeforeDiscount: number
}

const CATEGORY_META: { id: string; label: string; match: string[] }[] = [
  { id: 'defense', label: 'Defenses', match: ['defense'] },
  { id: 'wall', label: 'Walls', match: ['wall'] },
  { id: 'trap', label: 'Traps', match: ['trap'] },
  { id: 'resource', label: 'Resources', match: ['resource'] },
  { id: 'army', label: 'Army', match: ['army'] },
  { id: 'hero', label: 'Heroes', match: ['hero'] },
  { id: 'troop', label: 'Troops', match: ['troop', 'siege-machine'] },
  { id: 'spell', label: 'Spells', match: ['spell'] },
  { id: 'pet', label: 'Pets', match: ['pet'] },
  { id: 'equipment', label: 'Equipment', match: ['hero-equipment'] },
]

function buildingLevel(items: VillageItem[], names: string[]): number {
  const found = items.find(
    (item) => item.base === 'home' && names.some((n) => item.name.toLowerCase() === n.toLowerCase()),
  )
  return found?.level ?? 0
}

function findHeroHall(gameData: GameDataIndex) {
  return (
    Object.values(gameData).find(
      (entity) => entity.id === 'hero-hall' || entity.name === 'Hero Hall',
    ) ?? null
  )
}

/** Max hero level unlocked at a Town Hall via that TH's Hero Hall cap. */
export function maxHeroLevelAtTownHall(
  item: VillageItem,
  hallLevel: number,
  gameData: GameDataIndex,
): number {
  if (!item.entity) return item.level
  const heroHall = findHeroHall(gameData)
  const hhCap = heroHall?.maxLevelByHall[String(hallLevel)] ?? 0
  let max = item.level
  for (const level of item.entity.levels) {
    const required = level.heroHallRequired
    if (required == null) continue
    if (required <= hhCap) max = Math.max(max, level.level)
  }
  return max
}

export function maxLevelFor(item: VillageItem, hallLevel: number, allItems: VillageItem[]): number {
  if (!item.entity) return item.level
  const mapped = item.entity.maxLevelByHall[String(hallLevel)]
  if (mapped != null) return mapped

  let max = item.level
  const heroHall = buildingLevel(allItems, ['Hero Hall'])
  const petHouse = buildingLevel(allItems, ['Pet House'])
  const blacksmith = buildingLevel(allItems, ['Blacksmith'])
  const lab = buildingLevel(allItems, ['Laboratory'])

  for (const level of item.entity.levels) {
    if (level.townHallRequired != null) {
      if (level.townHallRequired <= hallLevel) max = Math.max(max, level.level)
      continue
    }
    if (level.heroHallRequired != null) {
      if (heroHall > 0 && level.heroHallRequired <= heroHall) max = Math.max(max, level.level)
      continue
    }
    if (level.petHouseRequired != null) {
      if (petHouse > 0 && level.petHouseRequired <= petHouse) max = Math.max(max, level.level)
      continue
    }
    if (level.blacksmithRequired != null) {
      if (blacksmith > 0 && level.blacksmithRequired <= blacksmith) max = Math.max(max, level.level)
      continue
    }
    if (level.labRequired != null) {
      if (lab > 0 && level.labRequired <= lab && (level.townHallRequired ?? 1) <= hallLevel) {
        max = Math.max(max, level.level)
      }
      continue
    }
  }
  return max
}

function nextLevelRow(item: VillageItem) {
  if (!item.entity) return null
  return item.entity.levels.find((level) => level.level === item.level + 1) ?? null
}

function emptyResources(): ResourceTotals {
  return { Gold: 0, Elixir: 0, 'Dark Elixir': 0 }
}

function addResource(totals: ResourceTotals, resource: string | null | undefined, amount: number) {
  if (!amount) return
  const key = (resource ?? '').toLowerCase()
  if (key.includes('dark')) totals['Dark Elixir'] += amount
  else if (key.includes('elixir')) totals.Elixir += amount
  else if (key.includes('gold')) totals.Gold += amount
}

export function computeProgress(
  items: VillageItem[],
  hallLevel: number,
  base: 'home' | 'builder',
): ProgressCategory[] {
  const scoped = items.filter((item) => item.base === base && item.known)
  return CATEGORY_META.map((meta) => {
    const group = scoped.filter((item) => meta.match.includes(item.category))
    let current = 0
    let max = 0
    for (const item of group) {
      const copies = Math.max(1, item.count)
      const cap = maxLevelFor(item, hallLevel, items)
      current += Math.min(item.level, cap) * copies
      max += cap * copies
    }
    const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
    return { id: meta.id, label: meta.label, current, max, percent }
  }).filter((cat) => cat.max > 0)
}

export function computeRemainingCost(
  items: VillageItem[],
  hallLevel: number,
  base: 'home' | 'builder',
  discounts: GlobalDiscounts,
): ResourceTotals {
  const totals = emptyResources()
  for (const item of items.filter((i) => i.base === base && i.known && !i.upgrading)) {
    const cap = maxLevelFor(item, hallLevel, items)
    const copies = Math.max(1, item.count)
    if (!item.entity || item.level >= cap) continue
    for (let lvl = item.level + 1; lvl <= cap; lvl += 1) {
      const row = item.entity.levels.find((l) => l.level === lvl)
      if (!row) continue
      const cost = applyCostDiscount((row.cost ?? 0) * copies, discounts)
      addResource(totals, row.resource, cost)
    }
  }
  return totals
}

export function computeActiveUpgrades(items: VillageItem[]): ActiveUpgrade[] {
  const now = Date.now()
  return items
    .filter((item) => item.upgrading && item.finishesAt)
    .map((item) => ({
      dataId: item.dataId,
      name: item.name,
      category: item.category,
      base: item.base,
      fromLevel: item.level,
      toLevel: item.level + 1,
      finishesAt: item.finishesAt!,
      remainingSeconds: Math.max(0, Math.floor((item.finishesAt! - now) / 1000)),
      image: item.entity?.levels.find((l) => l.level === item.level)?.image ?? null,
    }))
    .sort((a, b) => a.finishesAt - b.finishesAt)
}

function priorityScore(category: string): number {
  if (category === 'hero') return 0
  if (category === 'army' || category === 'research') return 1
  if (category === 'defense') return 2
  if (category === 'troop' || category === 'spell' || category === 'siege-machine') return 3
  if (category === 'pet') return 4
  if (category === 'resource') return 5
  if (category === 'trap') return 6
  if (category === 'wall') return 7
  return 8
}

export function computeRecommendations(
  items: VillageItem[],
  hallLevel: number,
  base: 'home' | 'builder',
  sortMode: SortMode,
  storage: ResourceTotals | null,
  discounts: GlobalDiscounts,
): Recommendation[] {
  const recs: Recommendation[] = []
  for (const item of items.filter(
    (i) =>
      i.base === base &&
      i.known &&
      !i.upgrading &&
      i.category !== 'hero-equipment',
  )) {
    const cap = maxLevelFor(item, hallLevel, items)
    if (item.level >= cap) continue
    const next = nextLevelRow(item)
    if (!next) continue
    const cost = applyCostDiscount(next.cost ?? 0, discounts)
    const timeSeconds = applyTimeDiscount(next.timeSeconds, discounts)
    const resource = next.resource ?? 'Gold'
    let affordable: boolean | null = null
    if (storage) {
      const key = resource.toLowerCase()
      const available = key.includes('dark')
        ? storage['Dark Elixir']
        : key.includes('elixir')
          ? storage.Elixir
          : storage.Gold
      affordable = available >= cost
    }
    recs.push({
      dataId: item.dataId,
      name: item.name,
      category: item.category,
      base: item.base,
      fromLevel: item.level,
      toLevel: item.level + 1,
      cost,
      resource,
      timeSeconds,
      image: next.image,
      priority: priorityScore(item.category),
      affordable,
    })
  }

  recs.sort((a, b) => {
    if (sortMode === 'cost') return a.cost - b.cost || a.timeSeconds - b.timeSeconds
    if (sortMode === 'priority') return a.priority - b.priority || a.timeSeconds - b.timeSeconds
    // 'time' and 'blocks' (blocks uses its own UI) fall back to shortest time
    return a.timeSeconds - b.timeSeconds || a.cost - b.cost
  })
  return recs
}

/** Cost and time to take a hero from current level to the TH-max level. */
export function computeHeroPathToMax(
  item: VillageItem,
  hallLevel: number,
  gameData: GameDataIndex,
  discounts: GlobalDiscounts,
): HeroPathSummary | null {
  if (!item.entity || item.category !== 'hero') return null
  const toLevel = maxHeroLevelAtTownHall(item, hallLevel, gameData)
  const fromLevel = item.level
  if (toLevel <= fromLevel) {
    return {
      dataId: item.dataId,
      name: item.name,
      fromLevel,
      toLevel,
      townHall: hallLevel,
      levelsRemaining: 0,
      cost: 0,
      resource: 'Dark Elixir',
      timeSeconds: 0,
      costBeforeDiscount: 0,
      timeBeforeDiscount: 0,
    }
  }

  let costBefore = 0
  let timeBefore = 0
  let resource = 'Dark Elixir'
  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl += 1) {
    const row = item.entity.levels.find((l) => l.level === lvl)
    if (!row) continue
    costBefore += row.cost ?? 0
    timeBefore += row.timeSeconds
    if (row.resource) resource = row.resource
  }

  return {
    dataId: item.dataId,
    name: item.name,
    fromLevel,
    toLevel,
    townHall: hallLevel,
    levelsRemaining: toLevel - fromLevel,
    cost: applyCostDiscount(costBefore, discounts),
    resource,
    timeSeconds: applyTimeDiscount(timeBefore, discounts),
    costBeforeDiscount: costBefore,
    timeBeforeDiscount: timeBefore,
  }
}
