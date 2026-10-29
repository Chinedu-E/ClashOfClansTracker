const ASSET_BASE = 'https://assets.clashk.ing'

function cleanName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/\./g, '')
    .replace(/\?/g, '')
    .replace(/\\q/g, '')
    .replace(/’/g, '')
    .replace(/'/g, '')
}

export function iconUrl(
  name: string,
  category: string,
  base: 'home' | 'builder',
  level?: number,
): string {
  const cleaned = cleanName(name)
  const village = base === 'builder' ? 'builder-base' : 'home-village'

  switch (category) {
    case 'troop':
    case 'siege-machine':
      return `${ASSET_BASE}/troops/${cleaned}/icon.webp`
    case 'spell':
      return `${ASSET_BASE}/spells/${cleaned}.webp`
    case 'hero':
      return `${ASSET_BASE}/heroes/${cleaned}/icon.webp`
    case 'pet':
      return `${ASSET_BASE}/pets/${cleaned}/icon.webp`
    case 'hero-equipment':
      return `${ASSET_BASE}/equipment/${cleaned}.webp`
    case 'trap':
      return `${ASSET_BASE}/buildings/${village}/${cleaned}${level ? `/level_${level}` : ''}.webp`
    default:
      return `${ASSET_BASE}/buildings/${village}/${cleaned}/level_${level ?? 1}.webp`
  }
}
