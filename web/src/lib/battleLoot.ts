import type { BattleLogEntry } from '../types'

export interface CoreLoot {
  gold: number
  elixir: number
  dark: number
}

export function coreLoot(battle: BattleLogEntry): CoreLoot {
  const pools = [
    ...(battle.lootedResources ?? []),
    ...(battle.extraLootedResources ?? []),
  ]
  const amountFor = (match: (name: string) => boolean) =>
    pools
      .filter((r) => match((r.name ?? '').toLowerCase().replace(/\s+/g, '')))
      .reduce((sum, r) => sum + (r.amount || 0), 0)

  return {
    gold: amountFor((n) => n === 'gold'),
    elixir: amountFor((n) => n === 'elixir'),
    dark: amountFor((n) => n === 'darkelixir'),
  }
}
