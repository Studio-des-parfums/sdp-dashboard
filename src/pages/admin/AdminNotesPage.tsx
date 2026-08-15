import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X as XIcon } from 'lucide-react'

// Notes olfactives : référentiel partagé entre tous les projets (Lylo et les suivants),
// stocké dans la base générale du dashboard SDP plutôt que dans une base propre à un projet.
// Une note = une seule ligne, avec un nom par langue (translations) plutôt qu'une ligne
// dupliquée par langue — évite de créer deux fois la même note pour FR et EN.

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
]

type Note = {
  id: number
  type: 'top' | 'heart' | 'base'
  category: string | null
  description: string | null
  intensity: string | null
  allergens: string[] | null
  box_sets: string[] | null
  is_active: boolean
  translations: Record<string, string>
}

const TYPE_LABELS: Record<string, string> = {
  top: 'Tête',
  heart: 'Cœur',
  base: 'Fond',
}

const TYPE_STYLE: Record<string, string> = {
  top: 'bg-blue-500/10 text-blue-600',
  heart: 'bg-pink-500/10 text-pink-600',
  base: 'bg-amber-500/10 text-amber-600',
}

function emptyForm() {
  return {
    translations: Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])) as Record<string, string>,
    type: 'top' as 'top' | 'heart' | 'base',
    category: '',
    description: '',
    intensity: '',
    allergens: '',
    box_sets: [] as string[],
  }
}

// Nom à afficher pour une note : la traduction française en priorité, sinon la
// première langue disponible.
function displayName(note: Note): string {
  return note.translations.fr || Object.values(note.translations)[0] || '(sans nom)'
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const details = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${details ? ` — ${details}` : ''}`)
  }
  if (res.status === 204) return null
  return res.json() as Promise<unknown>
}

/**
 * Champ "tags" : Entrée pour ajouter, croix pour retirer, autocomplete sur les
 * coffrets déjà utilisés ailleurs (évite doublons/fautes de frappe).
 */
function TagInput({
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    if (!values.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      onChange([...values, tag])
    }
    setDraft('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag))
  }

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !values.some((v) => v.toLowerCase() === s.toLowerCase()) &&
      s.toLowerCase().includes(draft.trim().toLowerCase())
  )

  return (
    <div className="relative">
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {values.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-gray-900" aria-label={`Retirer ${tag}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setShowSuggestions(true) }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag(draft)
          } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            removeTag(values[values.length - 1])
          }
        }}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-md">
          {filteredSuggestions.map((s) => (
            <button type="button" key={s} onMouseDown={(e) => { e.preventDefault(); addTag(s) }} className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())

  const [selected, setSelected] = useState<Note | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      const params = new URLSearchParams({ active_only: 'false' })
      if (typeFilter) params.set('type', typeFilter)
      const data = await apiFetch(`/ingredients?${params}`)
      setNotes(Array.isArray(data) ? (data as Note[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { void refresh() }, [typeFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => {
      const names = Object.values(n.translations).join(' ')
      return `${names} ${n.category ?? ''} ${n.description ?? ''}`.toLowerCase().includes(q)
    })
  }, [notes, search])

  const boxSetSuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const bs of n.box_sets ?? []) set.add(bs)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [notes])

  function parseAllergens(raw: string): string[] | null {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts : null
  }

  function hasAtLeastOneName(translations: Record<string, string>) {
    return Object.values(translations).some((v) => v.trim())
  }

  async function createNote() {
    if (!hasAtLeastOneName(createForm.translations)) return
    setIsBusy(true)
    try {
      await apiFetch('/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          translations: createForm.translations,
          type: createForm.type,
          category: createForm.category.trim() || null,
          description: createForm.description.trim() || null,
          intensity: createForm.intensity.trim() || null,
          allergens: parseAllergens(createForm.allergens),
          box_sets: createForm.box_sets.length > 0 ? createForm.box_sets : null,
        }),
      })
      setIsCreateOpen(false)
      setCreateForm(emptyForm())
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function openDetail(note: Note) {
    setSelected(note)
    setEditForm({
      translations: { ...Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])), ...note.translations },
      type: note.type,
      category: note.category ?? '',
      description: note.description ?? '',
      intensity: note.intensity ?? '',
      allergens: note.allergens ? note.allergens.join(', ') : '',
      box_sets: note.box_sets ?? [],
    })
  }

  async function saveDetail() {
    if (!selected || !hasAtLeastOneName(editForm.translations)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ingredients/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          translations: editForm.translations,
          type: editForm.type,
          category: editForm.category.trim() || null,
          description: editForm.description.trim() || null,
          intensity: editForm.intensity.trim() || null,
          allergens: parseAllergens(editForm.allergens),
          is_active: selected.is_active,
          box_sets: editForm.box_sets.length > 0 ? editForm.box_sets : null,
        }),
      })
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function toggleActive(note: Note) {
    setIsBusy(true)
    try {
      await apiFetch(`/ingredients/${note.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !note.is_active }) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteNote() {
    if (!selected) return
    if (!window.confirm(`Supprimer la note "${displayName(selected)}" ?`)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ingredients/${selected.id}`, { method: 'DELETE' })
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function FormFields({ form, setForm }: { form: ReturnType<typeof emptyForm>; setForm: (f: ReturnType<typeof emptyForm>) => void }) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {LANGUAGES.map((lang) => (
          <div key={lang.code} className={LANGUAGES.length % 2 === 1 ? '' : ''}>
            <label className="text-xs text-gray-600 mb-1 block">Nom ({lang.label}) {lang.code === 'fr' ? '*' : ''}</label>
            <input
              value={form.translations[lang.code] ?? ''}
              onChange={(e) => setForm({ ...form, translations: { ...form.translations, [lang.code]: e.target.value } })}
              placeholder={lang.code === 'fr' ? 'Ex : Bergamote fraîche' : 'Ex: Fresh bergamot'}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Type *</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'top' | 'heart' | 'base' })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
            <option value="top">Note de tête</option>
            <option value="heart">Note de cœur</option>
            <option value="base">Note de fond</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Catégorie</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="adult, enfant…" className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
        </div>
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Intensité</label>
          <select value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
            <option value="">— Non renseignée —</option>
            <option value="legere">Légère</option>
            <option value="moyenne">Moyenne</option>
            <option value="forte">Forte</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600 mb-1 block">Description olfactive</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Note agrumée, fraîche et lumineuse…" className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600 mb-1 block">Allergènes <span className="font-normal">(séparés par des virgules — laisser vide = IA raisonne seule)</span></label>
          <input value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} placeholder="limonène, linalool, géraniol…" className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600 mb-1 block">Coffrets <span className="font-normal">(Entrée pour ajouter)</span></label>
          <TagInput values={form.box_sets} onChange={(box_sets) => setForm({ ...form, box_sets })} suggestions={boxSetSuggestions} placeholder="Découverte, Prestige…" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notes olfactives</h1>
          <p className="text-xs text-gray-600 mt-1">Référentiel partagé entre tous les projets, utilisé notamment par l'IA pour générer des formules de parfum.</p>
        </div>
        <button onClick={() => { setCreateForm(emptyForm()); setIsCreateOpen(true) }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors shrink-0">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="">Tous types</option>
          <option value="top">Tête</option>
          <option value="heart">Cœur</option>
          <option value="base">Fond</option>
        </select>
      </div>

      {error && <p className="text-red-700 text-sm text-center py-3 bg-red-500/10 rounded-lg mb-4">{error}</p>}

      <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                {LANGUAGES.map((lang) => (
                  <th key={lang.code} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nom ({lang.code.toUpperCase()})</th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Intensité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Allergènes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Coffrets</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5 + LANGUAGES.length} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isBusy ? 'Chargement...' : 'Aucune note.'}
                  </td>
                </tr>
              )}
              {filtered.map((note) => (
                <tr key={note.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(note)}>
                  {LANGUAGES.map((lang) => (
                    <td key={lang.code} className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{note.translations[lang.code] || <span className="text-gray-400 italic font-normal">—</span>}</p>
                      {lang.code === 'fr' && note.description && <p className="text-xs text-gray-600 truncate max-w-xs">{note.description}</p>}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[note.type]}`}>{TYPE_LABELS[note.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{note.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{note.intensity || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {note.allergens ? (
                      <span className="text-orange-600">{note.allergens.length} renseigné{note.allergens.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-gray-500 italic">IA raisonne</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {note.box_sets && note.box_sets.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {note.box_sets.map((bs) => (
                          <span key={bs} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">{bs}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(note) }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        note.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                      }`}
                    >
                      {note.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle note</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <FormFields form={createForm} setForm={setCreateForm} />
            <div className="flex gap-2 pt-2">
              <button onClick={createNote} disabled={isBusy || !hasAtLeastOneName(createForm.translations)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Créer</button>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Note — {displayName(selected)}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <FormFields form={editForm} setForm={setEditForm} />
            <div className="flex gap-2 pt-2">
              <button onClick={deleteNote} className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-700 px-4 py-2 rounded-lg text-sm transition-colors"><Trash2 size={14} /> Supprimer</button>
              <div className="flex-1" />
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors">Fermer</button>
              <button onClick={saveDetail} disabled={isBusy || !hasAtLeastOneName(editForm.translations)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
