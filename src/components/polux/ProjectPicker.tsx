import { useMemo, useState } from 'react'
import { Input } from '../ui/lylo/Input'

interface ProjectPickerProps {
  value: string
  existingProjects: string[]
  onChange: (value: string) => void
  onCommit?: (value: string) => void
}

// Champ "Projet" : propose les projets déjà renseignés et encore en cours (au moins une
// tâche non terminée), tout en restant un texte libre si aucun ne convient.
export function ProjectPicker({ value, existingProjects, onChange, onCommit }: ProjectPickerProps) {
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase()
    return existingProjects.filter((p) => !query || p.toLowerCase().includes(query))
  }, [existingProjects, value])

  function select(project: string) {
    onChange(project)
    onCommit?.(project)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); onCommit?.(value) }}
        placeholder="Nom du projet (optionnel)"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((p) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(p) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
