export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes && days < 3) parts.push(`${minutes}m`)
  if (!parts.length) {
    if (seconds < 60) return `${seconds}s`
    parts.push(`${minutes}m`)
  }
  return parts.join(' ')
}

export function formatCountdown(finishesAt: number, now = Date.now()): string {
  const remaining = Math.max(0, Math.floor((finishesAt - now) / 1000))
  if (remaining <= 0) return 'Done'
  return formatDuration(remaining)
}

export function resourceClass(resource: string): string {
  const key = resource.toLowerCase()
  if (key.includes('dark')) return 'resource-dark'
  if (key.includes('elixir')) return 'resource-elixir'
  if (key.includes('gold')) return 'resource-gold'
  return 'resource-other'
}

/** Parse API timestamps like 20261029T152556.000Z into epoch ms. */
export function parseBattleTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z?$/i.exec(value)
  if (compact) {
    const iso = `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`
    const ms = Date.parse(iso)
    return Number.isNaN(ms) ? null : ms
  }
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  const ms = parseBattleTimestamp(value)
  if (ms == null) return value || 'Unknown time'
  const delta = Math.max(0, Math.floor((now - ms) / 1000))
  if (delta < 60) return 'just now'
  if (delta < 3600) {
    const minutes = Math.floor(delta / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  if (delta < 86400) {
    const hours = Math.floor(delta / 3600)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(delta / 86400)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
