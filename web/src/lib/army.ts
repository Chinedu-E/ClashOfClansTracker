import type { GameDataIndex } from '../types'

export interface ArmyUnit {
  kind: 'troop' | 'spell' | 'unknown'
  id: number
  count: number
  name: string
  category: string
  dataId: number | null
}

export interface ParsedArmy {
  raw: string
  troops: ArmyUnit[]
  spells: ArmyUnit[]
  unknown: ArmyUnit[]
}

function buildLookup(gameData: GameDataIndex) {
  const troops = new Map<number, { name: string; dataId: number; category: string }>()
  const spells = new Map<number, { name: string; dataId: number; category: string }>()

  for (const entity of Object.values(gameData)) {
    if (entity.base !== 'home') continue
    if (entity.category === 'troop' || entity.category === 'siege-machine') {
      // Army links use character/unit CSV index: dataId - 4000000 for most home troops.
      if (entity.dataId >= 4000000 && entity.dataId < 5000000) {
        troops.set(entity.dataId - 4000000, {
          name: entity.name,
          dataId: entity.dataId,
          category: entity.category,
        })
      }
    }
    if (entity.category === 'spell') {
      if (entity.dataId >= 26000000 && entity.dataId < 27000000) {
        spells.set(entity.dataId - 26000000, {
          name: entity.name,
          dataId: entity.dataId,
          category: entity.category,
        })
      }
    }
  }
  return { troops, spells }
}

function parseSection(section: string): { count: number; id: number }[] {
  if (!section) return []
  return section
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [countRaw, idRaw] = part.split(/x/i)
      return { count: Number(countRaw), id: Number(idRaw) }
    })
    .filter((row) => Number.isFinite(row.count) && Number.isFinite(row.id))
}

/** Parse a CopyArmy payload or full link into named troops and spells. */
export function parseArmyShareCode(code: string | null | undefined, gameData: GameDataIndex): ParsedArmy | null {
  if (!code?.trim()) return null
  const raw = code.trim()
  const payload = raw.includes('army=')
    ? decodeURIComponent(raw.split('army=')[1]?.split('&')[0] ?? raw)
    : raw

  const unitsMatch = /u([\d+x-]+)/i.exec(payload)
  const spellsMatch = /s([\d+x-]+)/i.exec(payload)
  const lookup = buildLookup(gameData)

  const troops: ArmyUnit[] = parseSection(unitsMatch?.[1] ?? '').map((row) => {
    const hit = lookup.troops.get(row.id)
    if (hit) {
      return {
        kind: 'troop' as const,
        id: row.id,
        count: row.count,
        name: hit.name,
        category: hit.category,
        dataId: hit.dataId,
      }
    }
    return {
      kind: 'unknown' as const,
      id: row.id,
      count: row.count,
      name: `Troop #${row.id}`,
      category: 'troop',
      dataId: null,
    }
  })

  const spells: ArmyUnit[] = parseSection(spellsMatch?.[1] ?? '').map((row) => {
    const hit = lookup.spells.get(row.id)
    if (hit) {
      return {
        kind: 'spell' as const,
        id: row.id,
        count: row.count,
        name: hit.name,
        category: hit.category,
        dataId: hit.dataId,
      }
    }
    return {
      kind: 'unknown' as const,
      id: row.id,
      count: row.count,
      name: `Spell #${row.id}`,
      category: 'spell',
      dataId: null,
    }
  })

  const unknown = [...troops, ...spells].filter((u) => u.kind === 'unknown')
  return {
    raw: payload,
    troops: troops.filter((u) => u.kind !== 'unknown'),
    spells: spells.filter((u) => u.kind !== 'unknown'),
    unknown,
  }
}
