import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { messagesClient, type Contact } from '../../api/messagesClient'

/** Participants à choisir, en plus du créateur : un groupe compte au moins 3 personnes (sinon, c'est une discussion privée). */
const MIN_OTHER_MEMBERS = 2

interface NewGroupFormProps {
  contacts: Contact[]
  onCancel: () => void
  onCreated: (groupId: number, name: string) => void
}

// Création d'un groupe : nom + participants (le créateur en devient le propriétaire).
export function NewGroupForm({ contacts, onCancel, onCreated }: NewGroupFormProps) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts
      .filter((c) => !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
      .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
  }, [contacts, search])

  const missing = !name.trim()
    ? 'Donnez un nom au groupe'
    : selected.length < MIN_OTHER_MEMBERS
      ? `Choisissez encore ${MIN_OTHER_MEMBERS - selected.length} participant${MIN_OTHER_MEMBERS - selected.length > 1 ? 's' : ''}`
      : null

  async function create() {
    if (missing) return
    setBusy(true)
    setError(null)
    try {
      const { id } = await messagesClient.createGroup(name.trim(), selected)
      onCreated(id, name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200 shrink-0">
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-900 transition-colors" aria-label="Retour">
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-sm text-gray-900">Nouveau groupe</span>
      </div>

      <div className="space-y-3 px-4 py-3 shrink-0">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Nom du groupe"
          className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white"
        />
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
          <Search size={14} className="shrink-0 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ajouter des participants..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-100">
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={() => setSelected((s) => (s.includes(c.id) ? s.filter((id) => id !== c.id) : [...s, c.id]))}
            />
            <span className="w-8 h-8 shrink-0 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center">
              {`${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase()}
            </span>
            <span className="truncate text-sm text-gray-900">{c.first_name} {c.last_name}</span>
          </label>
        ))}
        {visible.length === 0 && <p className="py-8 text-center text-xs text-gray-600">Aucun collègue trouvé</p>}
      </div>

      <div className="border-t border-gray-200 p-3 shrink-0 space-y-2">
        <p className="text-center text-[11px] text-gray-500">
          {selected.length > 0 ? `Vous + ${selected.length} participant${selected.length > 1 ? 's' : ''}` : `Choisissez au moins ${MIN_OTHER_MEMBERS} participants (vous êtes ajouté automatiquement)`}
        </p>
        <button
          onClick={create}
          disabled={busy || !!missing}
          className="w-full rounded-full bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          {busy ? 'Création...' : missing ?? 'Créer le groupe'}
        </button>
      </div>
    </div>
  )
}
