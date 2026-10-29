import { useId, useState, type ReactNode } from 'react'
import { isSectionOpen, saveSectionOpen } from '../lib/storage'

interface Props {
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = true,
  children,
  className = '',
}: Props) {
  const [open, setOpen] = useState(() => isSectionOpen(id, defaultOpen))
  const contentId = useId()

  function toggle() {
    setOpen((current) => {
      const next = !current
      saveSectionOpen(id, next)
      return next
    })
  }

  return (
    <section className={`panel collapsible-section ${open ? 'open' : 'collapsed'} ${className}`.trim()}>
      <button
        type="button"
        className="collapse-trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="panel-title collapse-title">
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
        <span className="collapse-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div id={contentId} className="collapse-body">
          {children}
        </div>
      )}
    </section>
  )
}
