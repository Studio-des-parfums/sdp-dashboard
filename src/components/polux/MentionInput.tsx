import { useMemo, useRef, useState } from 'react'
import type { PoluxUserRef } from '../../types/polux'
import { FloatingPanel } from './FloatingPanel'

const ASSIGNED_LABEL = 'Personnes assignées'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  users: PoluxUserRef[]
  placeholder?: string
  onMentionAdded: (userId: number) => void
  /** Sélectionné quand on choisit la suggestion spéciale "@Personnes assignées". */
  onAssignedMentionAdded?: () => void
}

// Détecte un "@" suivi de texte sans espace juste avant le curseur, pour proposer
// l'autocomplete façon Notion/Slack — insère "@Prénom Nom " au clic sur une suggestion.
// Une suggestion spéciale "@Personnes assignées" notifie par email tout le monde assigné
// à la tâche en une seule mention, sans avoir à les citer individuellement.
export function MentionInput({ value, onChange, users, placeholder, onMentionAdded, onAssignedMentionAdded }: MentionInputProps) {
  const [query, setQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const userSuggestions = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return users.filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)).slice(0, 5)
  }, [query, users])

  const showAssignedSuggestion = query !== null && onAssignedMentionAdded && ASSIGNED_LABEL.toLowerCase().includes(query.toLowerCase())

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    onChange(next)
    const cursor = e.target.selectionStart ?? next.length
    const upToCursor = next.slice(0, cursor)
    const match = /@([^\s@]*)$/.exec(upToCursor)
    setQuery(match ? match[1] : null)
  }

  function insertMention(text: string) {
    const cursor = inputRef.current?.selectionStart ?? value.length
    const upToCursor = value.slice(0, cursor)
    const match = /@([^\s@]*)$/.exec(upToCursor)
    if (!match) return
    const mentionText = `@${text} `
    const next = value.slice(0, match.index) + mentionText + value.slice(cursor)
    onChange(next)
    setQuery(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function selectUser(user: PoluxUserRef) {
    insertMention(`${user.first_name} ${user.last_name}`)
    onMentionAdded(user.id)
  }

  function selectAssigned() {
    insertMention(ASSIGNED_LABEL)
    onAssignedMentionAdded?.()
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
      {query !== null && (userSuggestions.length > 0 || showAssignedSuggestion) && (
        <FloatingPanel anchorRef={inputRef} onClose={() => setQuery(null)} width={240} backdrop={false}>
          {showAssignedSuggestion && (
            <button
              type="button"
              onClick={selectAssigned}
              className="w-full px-3 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-gray-100"
            >
              {ASSIGNED_LABEL}
              <span className="ml-1 text-xs font-normal text-gray-500">(notifie tous les assignés)</span>
            </button>
          )}
          {userSuggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUser(u)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {u.first_name} {u.last_name}
            </button>
          ))}
        </FloatingPanel>
      )}
    </div>
  )
}
