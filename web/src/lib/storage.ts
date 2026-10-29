import {
  createEmptyBlocks,
  normalizeBlocks,
  type BuilderBlocksState,
  type InProgressSnapshotEntry,
} from './builderBlocks'
import { DEFAULT_DISCOUNTS, clampDiscount, type GlobalDiscounts } from './discounts'
import type { BattleLogEntry, ResourceTotals, VillageExport } from '../types'

const KEYS = {
  export: 'coc-tracker:export',
  storage: 'coc-tracker:storage',
  battles: 'coc-tracker:battles',
  discounts: 'coc-tracker:discounts',
  sections: 'coc-tracker:sections',
  builderBlocks: 'coc-tracker:builder-blocks',
  builderBlockSnapshots: 'coc-tracker:builder-block-snapshots',
} as const

export function loadExport(): VillageExport | null {
  try {
    const raw = localStorage.getItem(KEYS.export)
    return raw ? (JSON.parse(raw) as VillageExport) : null
  } catch {
    return null
  }
}

export function saveExport(data: VillageExport): void {
  localStorage.setItem(KEYS.export, JSON.stringify(data))
}

export function clearExport(): void {
  localStorage.removeItem(KEYS.export)
}

export function loadStorageAmounts(): ResourceTotals {
  try {
    const raw = localStorage.getItem(KEYS.storage)
    if (!raw) return { Gold: 0, Elixir: 0, 'Dark Elixir': 0 }
    return { Gold: 0, Elixir: 0, 'Dark Elixir': 0, ...JSON.parse(raw) }
  } catch {
    return { Gold: 0, Elixir: 0, 'Dark Elixir': 0 }
  }
}

export function saveStorageAmounts(amounts: ResourceTotals): void {
  localStorage.setItem(KEYS.storage, JSON.stringify(amounts))
}

export function loadDiscounts(): GlobalDiscounts {
  try {
    const raw = localStorage.getItem(KEYS.discounts)
    if (!raw) return { ...DEFAULT_DISCOUNTS }
    const parsed = JSON.parse(raw) as Partial<GlobalDiscounts>
    return {
      costPercent: clampDiscount(Number(parsed.costPercent) || 0),
      timePercent: clampDiscount(Number(parsed.timePercent) || 0),
    }
  } catch {
    return { ...DEFAULT_DISCOUNTS }
  }
}

export function saveDiscounts(discounts: GlobalDiscounts): void {
  localStorage.setItem(
    KEYS.discounts,
    JSON.stringify({
      costPercent: clampDiscount(discounts.costPercent),
      timePercent: clampDiscount(discounts.timePercent),
    }),
  )
}

export function loadBattles(tag: string): BattleLogEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.battles)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, BattleLogEntry[]>
    return all[tag] ?? []
  } catch {
    return []
  }
}

export function mergeBattles(tag: string, incoming: BattleLogEntry[]): BattleLogEntry[] {
  const existing = loadBattles(tag)
  const keyOf = (b: BattleLogEntry) =>
    `${b.battleTimestamp ?? ''}|${b.opponentPlayerTag ?? ''}|${b.stars ?? ''}|${b.destructionPercentage ?? ''}|${b.attack ? 1 : 0}`

  const map = new Map<string, BattleLogEntry>()
  for (const battle of [...incoming, ...existing]) {
    map.set(keyOf(battle), battle)
  }
  const merged = [...map.values()].sort((a, b) => {
    const ta = a.battleTimestamp ?? ''
    const tb = b.battleTimestamp ?? ''
    return tb.localeCompare(ta)
  })

  try {
    const raw = localStorage.getItem(KEYS.battles)
    const all = raw ? (JSON.parse(raw) as Record<string, BattleLogEntry[]>) : {}
    all[tag] = merged.slice(0, 200)
    localStorage.setItem(KEYS.battles, JSON.stringify(all))
  } catch {
    // ignore quota errors
  }
  return merged
}

function loadSectionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEYS.sections)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function isSectionOpen(id: string, defaultOpen = true): boolean {
  const state = loadSectionState()
  return Object.prototype.hasOwnProperty.call(state, id) ? Boolean(state[id]) : defaultOpen
}

export function saveSectionOpen(id: string, open: boolean): void {
  const state = loadSectionState()
  state[id] = open
  localStorage.setItem(KEYS.sections, JSON.stringify(state))
}

function blocksStorageKey(tag: string): string {
  return tag.trim() ? tag.trim().toUpperCase() : '_default'
}

export function loadBuilderBlocks(tag: string): BuilderBlocksState {
  try {
    const raw = localStorage.getItem(KEYS.builderBlocks)
    if (!raw) return createEmptyBlocks()
    const all = JSON.parse(raw) as Record<string, unknown>
    return normalizeBlocks(all[blocksStorageKey(tag)])
  } catch {
    return createEmptyBlocks()
  }
}

export function saveBuilderBlocks(tag: string, blocks: BuilderBlocksState): void {
  try {
    const raw = localStorage.getItem(KEYS.builderBlocks)
    const all = raw ? (JSON.parse(raw) as Record<string, BuilderBlocksState>) : {}
    all[blocksStorageKey(tag)] = normalizeBlocks(blocks)
    localStorage.setItem(KEYS.builderBlocks, JSON.stringify(all))
  } catch {
    // ignore quota errors
  }
}

export function loadBuilderBlockSnapshot(tag: string): InProgressSnapshotEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.builderBlockSnapshots)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, InProgressSnapshotEntry[]>
    const rows = all[blocksStorageKey(tag)]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export function saveBuilderBlockSnapshot(tag: string, snapshot: InProgressSnapshotEntry[]): void {
  try {
    const raw = localStorage.getItem(KEYS.builderBlockSnapshots)
    const all = raw ? (JSON.parse(raw) as Record<string, InProgressSnapshotEntry[]>) : {}
    all[blocksStorageKey(tag)] = snapshot
    localStorage.setItem(KEYS.builderBlockSnapshots, JSON.stringify(all))
  } catch {
    // ignore quota errors
  }
}
