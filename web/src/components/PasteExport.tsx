import { useState } from 'react'

interface Props {
  onImport: (text: string) => void
  hasVillage: boolean
}

export function PasteExport({ onImport, hasVillage }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    try {
      setError(null)
      onImport(text)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText()
      setText(clip)
      setError(null)
      onImport(clip)
      setText('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not read clipboard. Paste into the box instead.',
      )
    }
  }

  return (
    <div className={`paste-content ${hasVillage ? 'compact' : ''}`}>
      {!hasVillage && (
        <ol className="steps">
          <li>Open Clash of Clans → Settings → More Settings</li>
          <li>Under Data Export, tap Copy</li>
          <li>Paste here (or use Paste from clipboard)</li>
        </ol>
      )}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={hasVillage ? 'Paste a fresh village export to refresh…' : 'Paste village JSON here…'}
        rows={hasVillage ? 3 : 8}
      />
      <div className="paste-actions">
        <button type="button" className="primary" onClick={submit} disabled={!text.trim()}>
          Import export
        </button>
        <button type="button" onClick={pasteFromClipboard}>
          Paste from clipboard
        </button>
      </div>
      {error && <p className="error-banner">{error}</p>}
    </div>
  )
}
