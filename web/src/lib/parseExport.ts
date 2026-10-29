import type { ExportEntry, GameDataIndex, VillageExport, VillageItem } from '../types'

const HOME_ARRAY_KEYS = new Set([
  'buildings',
  'traps',
  'decos',
  'obstacles',
  'units',
  'spells',
  'heroes',
  'pets',
  'equipment',
  'hero_equipment',
  'siege_machines',
  'guardians',
  'helpers',
])

function isExportEntry(value: unknown): value is ExportEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExportEntry).data === 'number'
  )
}

function baseForKey(key: string): 'home' | 'builder' {
  return key.endsWith('2') ? 'builder' : 'home'
}

function categoryFallback(dataId: number, base: 'home' | 'builder'): string {
  if (dataId >= 28000000 && dataId < 29000000) return 'hero'
  if (dataId >= 73000000 && dataId < 74000000) return 'pet'
  if (dataId >= 12000000 && dataId < 13000000) return 'trap'
  if (dataId >= 4000000 && dataId < 5000000) return 'troop'
  if (dataId >= 26000000 && dataId < 27000000) return 'spell'
  if (base === 'builder') return 'builder'
  return 'building'
}

export function parseVillageExport(
  raw: VillageExport,
  gameData: GameDataIndex,
): VillageItem[] {
  const exportTimestamp = typeof raw.timestamp === 'number' ? raw.timestamp : Math.floor(Date.now() / 1000)
  const items: VillageItem[] = []

  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue
    const base = baseForKey(key)
    const keyRoot = key.replace(/2$/, '')
    if (!HOME_ARRAY_KEYS.has(keyRoot) && !keyRoot.startsWith('building') && !keyRoot.startsWith('unit')) {
      // Still accept any array of {data, lvl} objects
      if (!value.some(isExportEntry)) continue
    }

    for (const entry of value) {
      if (!isExportEntry(entry)) continue
      const entity = gameData[String(entry.data)] ?? null
      const level = entry.lvl ?? entry.level ?? 0
      const count = entry.cnt ?? (entry.timer != null ? 1 : 1)
      const upgrading = entry.timer != null && entry.timer > 0
      const finishesAt = upgrading ? (exportTimestamp + entry.timer!) * 1000 : null
      const remainingSeconds = upgrading
        ? Math.max(0, Math.floor((finishesAt! - Date.now()) / 1000))
        : null

      items.push({
        dataId: entry.data,
        name: entity?.name ?? `Unknown #${entry.data}`,
        category: entity?.category ?? categoryFallback(entry.data, base),
        base,
        level,
        count: upgrading ? 1 : count,
        upgrading,
        finishesAt,
        remainingSeconds,
        gearUp: Boolean(entry.gear_up ?? entry.gearup),
        supercharge: typeof entry.supercharge === 'number' ? entry.supercharge : null,
        known: Boolean(entity),
        entity,
      })
    }
  }

  return items
}

export function findTownHallLevel(items: VillageItem[]): number {
  const th = items.find(
    (item) =>
      item.base === 'home' &&
      (item.dataId === 1000001 || item.name === 'Town Hall' || item.category === 'town-hall'),
  )
  return th?.level ?? 1
}

export function findBuilderHallLevel(items: VillageItem[]): number {
  const bh = items.find(
    (item) =>
      item.base === 'builder' &&
      (item.name === 'Builder Hall' || item.category === 'builder-hall'),
  )
  return bh?.level ?? 1
}

export function parseExportText(text: string): VillageExport {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Paste is empty.')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('Could not parse JSON. Copy the full village export from the game.')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Export must be a JSON object.')
  }
  return parsed as VillageExport
}
