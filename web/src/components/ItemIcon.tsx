import { useState } from 'react'
import { iconUrl } from '../lib/icons'

interface Props {
  name: string
  category: string
  base: 'home' | 'builder'
  level?: number
  size?: number
}

export function ItemIcon({ name, category, base, level, size = 48 }: Props) {
  const [failed, setFailed] = useState(false)
  const src = iconUrl(name, category, base, level)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (failed) {
    return (
      <div className="item-icon fallback" style={{ width: size, height: size }} title={name}>
        {initial}
      </div>
    )
  }

  return (
    <img
      className="item-icon"
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
