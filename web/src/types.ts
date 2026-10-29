export type ResourceName = 'Gold' | 'Elixir' | 'Dark Elixir' | string

export interface GameLevel {
  level: number
  cost: number | null
  resource: ResourceName | null
  timeSeconds: number
  townHallRequired: number | null
  labRequired?: number | null
  heroHallRequired?: number | null
  petHouseRequired?: number | null
  blacksmithRequired?: number | null
  image: string | null
}

export interface GameEntity {
  id: string
  dataId: number
  name: string
  base: string
  category: string
  levels: GameLevel[]
  maxLevelByHall: Record<string, number>
  countByHall: Record<string, number | null>
}

export type GameDataIndex = Record<string, GameEntity>

export interface ExportEntry {
  data: number
  lvl?: number
  level?: number
  cnt?: number
  timer?: number
  gear_up?: boolean | number
  gearup?: boolean | number
  supercharge?: number
  [key: string]: unknown
}

export interface VillageExport {
  tag?: string
  timestamp?: number
  [key: string]: unknown
}

export interface VillageItem {
  dataId: number
  name: string
  category: string
  base: 'home' | 'builder'
  level: number
  count: number
  upgrading: boolean
  finishesAt: number | null
  remainingSeconds: number | null
  gearUp: boolean
  supercharge: number | null
  known: boolean
  entity: GameEntity | null
}

export interface ProgressCategory {
  id: string
  label: string
  current: number
  max: number
  percent: number
}

export interface ResourceTotals {
  Gold: number
  Elixir: number
  'Dark Elixir': number
}

export interface Recommendation {
  dataId: number
  name: string
  category: string
  base: 'home' | 'builder'
  fromLevel: number
  toLevel: number
  cost: number
  resource: ResourceName
  timeSeconds: number
  image: string | null
  priority: number
  affordable: boolean | null
}

export interface ActiveUpgrade {
  dataId: number
  name: string
  category: string
  base: 'home' | 'builder'
  fromLevel: number
  toLevel: number
  finishesAt: number
  remainingSeconds: number
  image: string | null
}

export interface PlayerProfile {
  tag: string
  name: string
  townHallLevel: number
  townHallWeaponLevel?: number
  expLevel: number
  trophies: number
  bestTrophies: number
  warStars: number
  attackWins: number
  defenseWins: number
  clan?: { tag: string; name: string; clanLevel?: number; badgeUrls?: Record<string, string> }
  league?: { id: number; name: string; iconUrls?: Record<string, string> }
  builderHallLevel?: number
  builderBaseTrophies?: number
}

export interface BattleResource {
  name: string
  amount: number
}

export interface BattleLogEntry {
  battleType?: string
  attack?: boolean
  armyShareCode?: string
  opponentPlayerTag?: string
  opponentName?: string
  opponentTownHallLevel?: number
  stars?: number
  destructionPercentage?: number
  lootedResources?: BattleResource[]
  extraLootedResources?: BattleResource[]
  availableLoot?: BattleResource[]
  battleTime?: number
  battleTimestamp?: string
}

export type SortMode = 'time' | 'cost' | 'priority' | 'blocks'
export type VillageView = 'home' | 'builder'
