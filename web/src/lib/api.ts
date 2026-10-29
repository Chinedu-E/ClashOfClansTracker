import type { BattleLogEntry, PlayerProfile } from '../types'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: string }).error)
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return payload as T
}

export function fetchPlayer(tag: string): Promise<PlayerProfile> {
  return getJson(`/api/player?tag=${encodeURIComponent(tag)}`)
}

export async function fetchBattleLog(tag: string): Promise<BattleLogEntry[]> {
  const payload = await getJson<BattleLogEntry[] | { items?: BattleLogEntry[] }>(
    `/api/battlelog?tag=${encodeURIComponent(tag)}`,
  )
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}
