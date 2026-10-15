import { useMemo, useRef, useState } from 'react'
import type { PoluxUserRef } from '../../types/polux'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  users: PoluxUserRef[]
  placeholder?: string
  onMentionAdded: (userId: number) => void
}

// Détecte un "@" suivi de texte sans espace juste avant le curseur, pour proposer
// l'autocomplete façon Notion/Slack — insère "@Prénom Nom " au clic sur une suggestion.
export function MentionInput({ value, onChange, users, placeholder, onMentionAdded }: MentionInputProps) {
  const [query, setQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const suggestions = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return users.filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)).slice(0, 5)
  }, [query, users])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    onChange(next)
    const cursor = e.target.selectionStart ?? next.length
    const upToCursor = next.slice(0, cursor)
    const match = /@([^\s@]*)$/.exec(upToCursor)
    setQuery(match ? match[1] : null)
  }

  function selectUser(user: PoluxUserRef) {
    const cursor = inputRef.current?.selectionStart ?? value.length
    const upToCursor = value.slice(0, cursor)
    const match = /@([^\s@]*)$/.exec(upToCursor)
    if (!match) return
    const mentionText = `@${user.first_name} ${user.last_name} `
    const next = value.slice(0, match.index) + mentionText + value.slice(cursor)
    onChange(next)
    onMentionAdded(user.id)
    setQuery(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-10 py-1">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUser(u)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {u.first_name} {u.last_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
