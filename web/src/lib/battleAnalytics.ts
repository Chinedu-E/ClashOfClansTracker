import { parseArmyShareCode, type ParsedArmy } from './army'
import { coreLoot } from './battleLoot'
import { parseBattleTimestamp } from './format'
import type { BattleLogEntry, GameDataIndex } from '../types'

export type BattleModeFilter = 'all' | 'attack' | 'defense'
export type BattleTypeFilter = 'all' | 'home' | 'ranked' | 'legend' | 'other'

export interface BattleKpis {
  battles: number
  attacks: number
  defenses: number
  avgStars: number
  threeStarRate: number
  failRate: number
  avgDestruction: number
  avgDuration: number
  totalGold: number
  totalElixir: number
  totalDark: number
  avgGold: number
  avgElixir: number
  avgDark: number
  withArmy: number
}

export interface StarBucket {
  stars: number
  count: number
  percent: number
}

export interface TypeBreakdown {
  key: BattleTypeFilter
  label: string
  count: number
  attacks: number
  avgStars: number
  threeStarRate: number
  avgDestruction: number
  totalGold: number
  totalElixir: number
  totalDark: number
}

export interface TroopPerformance {
  name: string
  category: string
  appearances: number
  avgStars: number
  threeStarRate: number
  zeroStarRate: number
  avgDestruction: number
  totalStars: number
  avgCount: number
}

export interface CompositionPerformance {
  signature: string
  label: string
  appearances: number
  avgStars: number
  threeStarRate: number
  avgDestruction: number
  sampleArmy: ParsedArmy | null
}

export interface ThMatchup {
  key: string
  label: string
  count: number
  avgStars: number
  threeStarRate: number
  avgDestruction: number
}

export interface TrendPoint {
  label: string
  key: string
  battles: number
  avgStars: number
  threeStarRate: number
  gold: number
  elixir: number
  dark: number
}

export interface Insight {
  tone: 'positive' | 'neutral' | 'warning'
  title: string
  detail: string
}

export interface BattleAnalytics {
  filtered: BattleLogEntry[]
  kpis: BattleKpis
  starDistribution: StarBucket[]
  byType: TypeBreakdown[]
  troopRankings: TroopPerformance[]
  spellRankings: TroopPerformance[]
  compositions: CompositionPerformance[]
  thMatchups: ThMatchup[]
  trend: TrendPoint[]
  insights: Insight[]
}

function normalizeBattleType(raw: string | undefined): BattleTypeFilter {
  const value = (raw ?? '').toLowerCase().replace(/[_-\s]/g, '')
  if (!value || value.includes('home')) return 'home'
  if (value.includes('rank')) return 'ranked'
  if (value.includes('legend')) return 'legend'
  return 'other'
}

function typeLabel(key: BattleTypeFilter): string {
  switch (key) {
    case 'home':
      return 'Home / Multiplayer'
    case 'ranked':
      return 'Ranked'
    case 'legend':
      return 'Legend'
    case 'other':
      return 'Other'
    default:
      return 'All'
  }
}

export function filterBattles(
  battles: BattleLogEntry[],
  mode: BattleModeFilter,
  type: BattleTypeFilter,
): BattleLogEntry[] {
  return battles.filter((battle) => {
    if (mode === 'attack' && !battle.attack) return false
    if (mode === 'defense' && battle.attack) return false
    if (type !== 'all' && normalizeBattleType(battle.battleType) !== type) return false
    return true
  })
}

function avg(sum: number, count: number): number {
  return count > 0 ? sum / count : 0
}

function compositionSignature(army: ParsedArmy): { signature: string; label: string } {
  const parts = [...army.troops, ...army.unknown.filter((u) => u.category === 'troop')]
    .map((unit) => `${unit.name}:${unit.count}`)
    .sort()
  const signature = parts.join('|') || 'empty'
  const label =
    parts
      .slice(0, 4)
      .map((part) => {
        const [name, count] = part.split(':')
        return `${count} ${name}`
      })
      .join(' · ') || 'Empty army'
  return { signature, label }
}

function emptyKpis(): BattleKpis {
  return {
    battles: 0,
    attacks: 0,
    defenses: 0,
    avgStars: 0,
    threeStarRate: 0,
    failRate: 0,
    avgDestruction: 0,
    avgDuration: 0,
    totalGold: 0,
    totalElixir: 0,
    totalDark: 0,
    avgGold: 0,
    avgElixir: 0,
    avgDark: 0,
    withArmy: 0,
  }
}

export function analyzeBattles(
  battles: BattleLogEntry[],
  gameData: GameDataIndex,
  mode: BattleModeFilter,
  type: BattleTypeFilter,
): BattleAnalytics {
  const filtered = filterBattles(battles, mode, type)
  const kpis = emptyKpis()
  const starCounts = [0, 0, 0, 0]
  const typeMap = new Map<BattleTypeFilter, {
    count: number
    attacks: number
    stars: number
    three: number
    destruction: number
    gold: number
    elixir: number
    dark: number
  }>()
  const troopMap = new Map<string, {
    name: string
    category: string
    appearances: number
    stars: number
    three: number
    zero: number
    destruction: number
    counts: number
  }>()
  const spellMap = new Map<string, {
    name: string
    category: string
    appearances: number
    stars: number
    three: number
    zero: number
    destruction: number
    counts: number
  }>()
  const compositionMap = new Map<string, {
    label: string
    appearances: number
    stars: number
    three: number
    destruction: number
    sampleArmy: ParsedArmy | null
  }>()
  const thMap = new Map<string, {
    label: string
    count: number
    stars: number
    three: number
    destruction: number
  }>()
  const dayMap = new Map<string, {
    label: string
    battles: number
    stars: number
    three: number
    gold: number
    elixir: number
    dark: number
  }>()

  let starSum = 0
  let three = 0
  let zero = 0
  let destructionSum = 0
  let durationSum = 0
  let durationCount = 0

  for (const battle of filtered) {
    const stars = battle.stars ?? 0
    const destruction = battle.destructionPercentage ?? 0
    const loot = coreLoot(battle)
    const battleType = normalizeBattleType(battle.battleType)

    kpis.battles += 1
    if (battle.attack) kpis.attacks += 1
    else kpis.defenses += 1
    starSum += stars
    destructionSum += destruction
    if (stars >= 3) three += 1
    if (stars <= 0) zero += 1
    starCounts[Math.min(3, Math.max(0, stars))] += 1
    kpis.totalGold += loot.gold
    kpis.totalElixir += loot.elixir
    kpis.totalDark += loot.dark
    if (battle.battleTime != null) {
      durationSum += battle.battleTime
      durationCount += 1
    }
    if (battle.armyShareCode?.trim()) kpis.withArmy += 1

    const typeRow = typeMap.get(battleType) ?? {
      count: 0,
      attacks: 0,
      stars: 0,
      three: 0,
      destruction: 0,
      gold: 0,
      elixir: 0,
      dark: 0,
    }
    typeRow.count += 1
    if (battle.attack) typeRow.attacks += 1
    typeRow.stars += stars
    typeRow.three += stars >= 3 ? 1 : 0
    typeRow.destruction += destruction
    typeRow.gold += loot.gold
    typeRow.elixir += loot.elixir
    typeRow.dark += loot.dark
    typeMap.set(battleType, typeRow)

    if (battle.attack && battle.opponentTownHallLevel != null) {
      const th = String(battle.opponentTownHallLevel)
      const thRow = thMap.get(th) ?? {
        label: `TH${th}`,
        count: 0,
        stars: 0,
        three: 0,
        destruction: 0,
      }
      thRow.count += 1
      thRow.stars += stars
      thRow.three += stars >= 3 ? 1 : 0
      thRow.destruction += destruction
      thMap.set(th, thRow)
    }

    const ts = parseBattleTimestamp(battle.battleTimestamp)
    if (ts != null) {
      const date = new Date(ts)
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
      const day = dayMap.get(key) ?? {
        label,
        battles: 0,
        stars: 0,
        three: 0,
        gold: 0,
        elixir: 0,
        dark: 0,
      }
      day.battles += 1
      day.stars += stars
      day.three += stars >= 3 ? 1 : 0
      day.gold += loot.gold
      day.elixir += loot.elixir
      day.dark += loot.dark
      dayMap.set(key, day)
    }

    if (!battle.attack) continue
    const army = parseArmyShareCode(battle.armyShareCode, gameData)
    if (!army) continue

    const { signature, label } = compositionSignature(army)
    const comp = compositionMap.get(signature) ?? {
      label,
      appearances: 0,
      stars: 0,
      three: 0,
      destruction: 0,
      sampleArmy: army,
    }
    comp.appearances += 1
    comp.stars += stars
    comp.three += stars >= 3 ? 1 : 0
    comp.destruction += destruction
    compositionMap.set(signature, comp)

    for (const unit of [...army.troops, ...army.unknown.filter((u) => u.category === 'troop')]) {
      const row = troopMap.get(unit.name) ?? {
        name: unit.name,
        category: unit.category,
        appearances: 0,
        stars: 0,
        three: 0,
        zero: 0,
        destruction: 0,
        counts: 0,
      }
      row.appearances += 1
      row.stars += stars
      row.three += stars >= 3 ? 1 : 0
      row.zero += stars <= 0 ? 1 : 0
      row.destruction += destruction
      row.counts += unit.count
      troopMap.set(unit.name, row)
    }

    for (const unit of [...army.spells, ...army.unknown.filter((u) => u.category === 'spell')]) {
      const row = spellMap.get(unit.name) ?? {
        name: unit.name,
        category: unit.category,
        appearances: 0,
        stars: 0,
        three: 0,
        zero: 0,
        destruction: 0,
        counts: 0,
      }
      row.appearances += 1
      row.stars += stars
      row.three += stars >= 3 ? 1 : 0
      row.zero += stars <= 0 ? 1 : 0
      row.destruction += destruction
      row.counts += unit.count
      spellMap.set(unit.name, row)
    }
  }

  kpis.avgStars = avg(starSum, kpis.battles)
  kpis.threeStarRate = avg(three, kpis.battles)
  kpis.failRate = avg(zero, kpis.battles)
  kpis.avgDestruction = avg(destructionSum, kpis.battles)
  kpis.avgDuration = avg(durationSum, durationCount)
  kpis.avgGold = avg(kpis.totalGold, kpis.attacks || kpis.battles)
  kpis.avgElixir = avg(kpis.totalElixir, kpis.attacks || kpis.battles)
  kpis.avgDark = avg(kpis.totalDark, kpis.attacks || kpis.battles)

  const starDistribution: StarBucket[] = [0, 1, 2, 3].map((stars) => ({
    stars,
    count: starCounts[stars],
    percent: avg(starCounts[stars], kpis.battles),
  }))

  const byType: TypeBreakdown[] = (['home', 'ranked', 'legend', 'other'] as BattleTypeFilter[])
    .map((key) => {
      const row = typeMap.get(key)
      if (!row) {
        return {
          key,
          label: typeLabel(key),
          count: 0,
          attacks: 0,
          avgStars: 0,
          threeStarRate: 0,
          avgDestruction: 0,
          totalGold: 0,
          totalElixir: 0,
          totalDark: 0,
        }
      }
      return {
        key,
        label: typeLabel(key),
        count: row.count,
        attacks: row.attacks,
        avgStars: avg(row.stars, row.count),
        threeStarRate: avg(row.three, row.count),
        avgDestruction: avg(row.destruction, row.count),
        totalGold: row.gold,
        totalElixir: row.elixir,
        totalDark: row.dark,
      }
    })
    .filter((row) => row.count > 0)

  const toUnitRanking = (
    map: Map<string, {
      name: string
      category: string
      appearances: number
      stars: number
      three: number
      zero: number
      destruction: number
      counts: number
    }>,
  ): TroopPerformance[] =>
    [...map.values()]
      .map((row) => ({
        name: row.name,
        category: row.category,
        appearances: row.appearances,
        avgStars: avg(row.stars, row.appearances),
        threeStarRate: avg(row.three, row.appearances),
        zeroStarRate: avg(row.zero, row.appearances),
        avgDestruction: avg(row.destruction, row.appearances),
        totalStars: row.stars,
        avgCount: avg(row.counts, row.appearances),
      }))
      .sort(
        (a, b) =>
          b.avgStars - a.avgStars ||
          b.threeStarRate - a.threeStarRate ||
          b.appearances - a.appearances,
      )

  const troopRankings = toUnitRanking(troopMap)
  const spellRankings = toUnitRanking(spellMap)

  const compositions = [...compositionMap.entries()]
    .map(([signature, row]) => ({
      signature,
      label: row.label,
      appearances: row.appearances,
      avgStars: avg(row.stars, row.appearances),
      threeStarRate: avg(row.three, row.appearances),
      avgDestruction: avg(row.destruction, row.appearances),
      sampleArmy: row.sampleArmy,
    }))
    .sort(
      (a, b) =>
        b.avgStars - a.avgStars ||
        b.threeStarRate - a.threeStarRate ||
        b.appearances - a.appearances,
    )

  const thMatchups = [...thMap.entries()]
    .map(([key, row]) => ({
      key,
      label: row.label,
      count: row.count,
      avgStars: avg(row.stars, row.count),
      threeStarRate: avg(row.three, row.count),
      avgDestruction: avg(row.destruction, row.count),
    }))
    .sort((a, b) => Number(a.key) - Number(b.key))

  const trend = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      key,
      label: row.label,
      battles: row.battles,
      avgStars: avg(row.stars, row.battles),
      threeStarRate: avg(row.three, row.battles),
      gold: row.gold,
      elixir: row.elixir,
      dark: row.dark,
    }))

  const insights = buildInsights({
    kpis,
    byType,
    troopRankings,
    compositions,
    thMatchups,
    mode,
  })

  return {
    filtered,
    kpis,
    starDistribution,
    byType,
    troopRankings,
    spellRankings,
    compositions,
    thMatchups,
    trend,
    insights,
  }
}

function buildInsights(input: {
  kpis: BattleKpis
  byType: TypeBreakdown[]
  troopRankings: TroopPerformance[]
  compositions: CompositionPerformance[]
  thMatchups: ThMatchup[]
  mode: BattleModeFilter
}): Insight[] {
  const insights: Insight[] = []
  const { kpis, byType, troopRankings, compositions, thMatchups, mode } = input
  if (!kpis.battles) {
    return [
      {
        tone: 'neutral',
        title: 'No battles in this filter',
        detail: 'Refresh the battle log or widen the mode / type filters to populate analytics.',
      },
    ]
  }

  insights.push({
    tone: kpis.threeStarRate >= 0.35 ? 'positive' : kpis.threeStarRate < 0.15 ? 'warning' : 'neutral',
    title: `${Math.round(kpis.threeStarRate * 100)}% three-star rate`,
    detail: `Across ${kpis.battles} battles you average ${kpis.avgStars.toFixed(2)} stars and ${Math.round(kpis.avgDestruction)}% destruction.`,
  })

  const ranked = byType.find((row) => row.key === 'ranked')
  const home = byType.find((row) => row.key === 'home')
  if (ranked && home && ranked.count >= 3 && home.count >= 3) {
    const delta = ranked.avgStars - home.avgStars
    insights.push({
      tone: delta >= 0 ? 'positive' : 'warning',
      title:
        delta >= 0
          ? 'Ranked outperforms multiplayer'
          : 'Multiplayer outperforms ranked',
      detail: `Ranked avg ${ranked.avgStars.toFixed(2)}★ vs home ${home.avgStars.toFixed(2)}★ (${ranked.count} ranked, ${home.count} home).`,
    })
  } else if (ranked && ranked.count >= 3) {
    insights.push({
      tone: 'neutral',
      title: 'Ranked sample ready',
      detail: `${ranked.count} ranked battles at ${ranked.avgStars.toFixed(2)}★ average and ${Math.round(ranked.threeStarRate * 100)}% triple rate.`,
    })
  }

  const reliableTroops = troopRankings.filter((row) => row.appearances >= 3)
  if (reliableTroops[0]) {
    const best = reliableTroops[0]
    insights.push({
      tone: 'positive',
      title: `${best.name} leads star production`,
      detail: `Used in ${best.appearances} attacks with ${best.avgStars.toFixed(2)}★ average and ${Math.round(best.threeStarRate * 100)}% triples.`,
    })
  }

  const weakTroops = [...reliableTroops].sort(
    (a, b) => a.avgStars - b.avgStars || b.zeroStarRate - a.zeroStarRate,
  )
  if (weakTroops[0] && weakTroops[0].avgStars < 1.5) {
    const worst = weakTroops[0]
    insights.push({
      tone: 'warning',
      title: `${worst.name} underperforms`,
      detail: `${worst.appearances} attacks averaging ${worst.avgStars.toFixed(2)}★ with ${Math.round(worst.zeroStarRate * 100)}% zero-star outcomes.`,
    })
  }

  const reliableComps = compositions.filter((row) => row.appearances >= 2)
  if (reliableComps[0]) {
    const best = reliableComps[0]
    insights.push({
      tone: 'positive',
      title: 'Best repeating composition',
      detail: `${best.label} — ${best.appearances} uses, ${best.avgStars.toFixed(2)}★, ${Math.round(best.threeStarRate * 100)}% triples.`,
    })
  }

  if (thMatchups.length >= 2 && mode !== 'defense') {
    const sorted = [...thMatchups].sort((a, b) => b.avgStars - a.avgStars)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    if (best && worst && best.key !== worst.key) {
      insights.push({
        tone: 'neutral',
        title: `Strongest vs ${best.label}`,
        detail: `${best.avgStars.toFixed(2)}★ on ${best.count} attacks. Softest results vs ${worst.label} (${worst.avgStars.toFixed(2)}★).`,
      })
    }
  }

  if (kpis.withArmy < kpis.attacks * 0.5 && kpis.attacks > 0) {
    insights.push({
      tone: 'warning',
      title: 'Limited army data',
      detail: `Only ${kpis.withArmy}/${kpis.attacks} attacks include an army share code, so troop rankings cover a partial sample.`,
    })
  }

  return insights.slice(0, 6)
}
