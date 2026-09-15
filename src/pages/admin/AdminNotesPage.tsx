import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Plus, FolderPlus, Trash2, X as XIcon } from 'lucide-react'
import AdminIngredientRulesPage from './AdminIngredientRulesPage'

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
  type: 'top' | 'heart' | 'base' | 'booster'
  category: string | null
  description: string | null
  intensity: string | null
  allergens: string[] | null
  coffret_ids: number[]
  is_active: boolean
  translations: Record<string, string>
}

type Coffret = {
  id: number
  is_active: boolean
  translations: Record<string, string>
}

function coffretName(coffret: Coffret): string {
  return coffret.translations.fr || Object.values(coffret.translations)[0] || `#${coffret.id}`
}

const TYPE_LABELS: Record<string, string> = {
  top: 'Tête',
  heart: 'Cœur',
  base: 'Fond',
  booster: 'Booster',
}

const TYPE_STYLE: Record<string, string> = {
  top: 'bg-blue-500/10 text-blue-600',
  heart: 'bg-pink-500/10 text-pink-600',
  base: 'bg-amber-500/10 text-amber-600',
  booster: 'bg-purple-500/10 text-purple-600',
}

function emptyForm() {
  return {
    translations: Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])) as Record<string, string>,
    type: 'top' as 'top' | 'heart' | 'base' | 'booster',
    category: '',
    description: '',
    intensity: '',
    allergens: '',
    coffret_ids: [] as number[],
  }
}

function emptyCoffretForm() {
  return {
    translations: Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])) as Record<string, string>,
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

/** Sélection multiple des coffrets existants (liste fixe, plus de saisie libre). */
function CoffretMultiSelect({
  values,
  onChange,
  coffrets,
}: {
  values: number[]
  onChange: (values: number[]) => void
  coffrets: Coffret[]
}) {
  function toggle(id: number) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id])
  }

  if (coffrets.length === 0) {
    return <p className="text-xs text-gray-500 italic">Aucun coffret créé pour l'instant.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {coffrets.map((c) => (
        <label key={c.id} className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={values.includes(c.id)} onChange={() => toggle(c.id)} className="accent-indigo-600" />
          {coffretName(c)}
        </label>
      ))}
    </div>
  )
}

// Déclaré au niveau module (et non à l'intérieur du composant) : sinon React le
// traiterait comme un type de composant différent à chaque frappe, démontant et
// remontant les inputs, ce qui leur fait perdre le focus à chaque caractère saisi.
function NoteFormFields({
  form,
  setForm,
  coffrets,
}: {
  form: ReturnType<typeof emptyForm>
  setForm: (f: ReturnType<typeof emptyForm>) => void
  coffrets: Coffret[]
}) {
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
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'top' | 'heart' | 'base' | 'booster' })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="top">Note de tête</option>
          <option value="heart">Note de cœur</option>
          <option value="base">Note de fond</option>
          <option value="booster">Booster</option>
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
        <label className="text-xs text-gray-600 mb-1 block">Coffrets</label>
        <CoffretMultiSelect values={form.coffret_ids} onChange={(coffret_ids) => setForm({ ...form, coffret_ids })} coffrets={coffrets} />
      </div>
    </div>
  )
}

export default function AdminNotesPage() {
  const [view, setView] = useState<'notes' | 'rules'>('notes')
  const [notes, setNotes] = useState<Note[]>([])
  const [coffrets, setCoffrets] = useState<Coffret[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())

  const [isCreateCoffretOpen, setIsCreateCoffretOpen] = useState(false)
  const [createCoffretForm, setCreateCoffretForm] = useState(emptyCoffretForm())

  const [selected, setSelected] = useState<Note | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      const params = new URLSearchParams({ active_only: 'false' })
      if (typeFilter) params.set('type', typeFilter)
      const [notesData, coffretsData] = await Promise.all([
        apiFetch(`/ingredients?${params}`),
        apiFetch('/coffrets'),
      ])
      setNotes(Array.isArray(notesData) ? (notesData as Note[]) : [])
      setCoffrets(Array.isArray(coffretsData) ? (coffretsData as Coffret[]) : [])
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
          coffret_ids: createForm.coffret_ids,
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
      coffret_ids: note.coffret_ids,
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
          coffret_ids: editForm.coffret_ids,
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
      setSelected((prev) => (prev && prev.id === note.id ? { ...prev, is_active: !note.is_active } : prev))
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

  function notesForCoffret(coffretId: number) {
    return notes.filter((n) => n.coffret_ids.includes(coffretId))
  }

  function filteredNotesForCoffret(coffretId: number) {
    return filtered.filter((n) => n.coffret_ids.includes(coffretId))
  }

  function hasCoffretName(translations: Record<string, string>) {
    return Object.values(translations).some((v) => v.trim())
  }

  async function createCoffret() {
    if (!hasCoffretName(createCoffretForm.translations)) return
    setIsBusy(true)
    try {
      await apiFetch('/coffrets', {
        method: 'POST',
        body: JSON.stringify({ translations: createCoffretForm.translations }),
      })
      setIsCreateCoffretOpen(false)
      setCreateCoffretForm(emptyCoffretForm())
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmDeleteCoffret(coffret: Coffret) {
    const affected = notesForCoffret(coffret.id).filter((n) => n.type !== 'booster' && n.coffret_ids.length === 1).length
    const message = affected > 0
      ? `Supprimer le coffret "${coffretName(coffret)}" ? ${affected} note(s) n'appartenant qu'à ce coffret seront aussi supprimée(s).`
      : `Supprimer le coffret "${coffretName(coffret)}" ?`
    if (!window.confirm(message)) return
    setIsBusy(true)
    try {
      await apiFetch(`/coffrets/${coffret.id}`, { method: 'DELETE' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function unlinkNoteFromCoffret(note: Note, coffret: Coffret) {
    const isLastCoffret = note.coffret_ids.length === 1
    const message = isLastCoffret
      ? `Retirer "${displayName(note)}" de "${coffretName(coffret)}" ? C'est son dernier coffret : la note sera supprimée.`
      : `Retirer "${displayName(note)}" du coffret "${coffretName(coffret)}" ?`
    if (!window.confirm(message)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ingredients/${note.id}/coffrets/${coffret.id}`, { method: 'DELETE' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  if (view === 'rules') {
    return <AdminIngredientRulesPage onBack={() => setView('notes')} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Coffrets et Notes</h1>
          <p className="text-xs text-gray-600 mt-1">Référentiel partagé entre tous les projets, utilisé notamment par l'IA pour générer des formules de parfum.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setView('rules')} className="flex items-center gap-1.5 bg-white hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm transition-colors border border-gray-300">
            <ListChecks size={16} /> Règles
          </button>
          <button onClick={() => { setCreateCoffretForm(emptyCoffretForm()); setIsCreateCoffretOpen(true) }} className="flex items-center gap-1.5 bg-white hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm transition-colors border border-gray-300">
            <FolderPlus size={16} /> Créer un coffret
          </button>
          <button onClick={() => { setCreateForm(emptyForm()); setIsCreateOpen(true) }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <Plus size={16} /> Ajouter une note
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="">Tous types</option>
          <option value="top">Tête</option>
          <option value="heart">Cœur</option>
          <option value="base">Fond</option>
          <option value="booster">Booster</option>
        </select>
      </div>

      {error && <p className="text-red-700 text-sm text-center py-3 bg-red-500/10 rounded-lg mb-4">{error}</p>}

      {coffrets.length === 0 ? (
        <div className="bg-gray-100 rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-500">
          {isBusy ? 'Chargement...' : 'Aucun coffret. Créez-en un pour commencer à y ajouter des notes.'}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {coffrets.map((coffret) => {
            const coffretNotes = filteredNotesForCoffret(coffret.id)
            return (
              <div key={coffret.id} className="w-72 shrink-0 bg-gray-100 rounded-xl border border-gray-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 shrink-0">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{coffretName(coffret)}</h3>
                    <p className="text-xs text-gray-500">{coffretNotes.length} note{coffretNotes.length > 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => confirmDeleteCoffret(coffret)} className="text-gray-500 hover:text-red-600 transition-colors shrink-0" aria-label={`Supprimer ${coffretName(coffret)}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {coffretNotes.length === 0 && (
                    <p className="text-xs text-gray-500 italic text-center py-6">Aucune note.</p>
                  )}
                  {coffretNotes.map((note) => (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => openDetail(note)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{displayName(note)}</p>
                          <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[note.type]}`}>{TYPE_LABELS[note.type]}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkNoteFromCoffret(note, coffret) }}
                          className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                          aria-label={`Retirer ${displayName(note)} de ${coffretName(coffret)}`}
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                      {!note.is_active && <p className="text-xs text-amber-600 mt-1">Inactif</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création de coffret */}
      {isCreateCoffretOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCreateCoffretOpen(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouveau coffret</h2>
              <button onClick={() => setIsCreateCoffretOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {LANGUAGES.map((lang) => (
                <div key={lang.code}>
                  <label className="text-xs text-gray-600 mb-1 block">Nom ({lang.label}) {lang.code === 'fr' ? '*' : ''}</label>
                  <input
                    value={createCoffretForm.translations[lang.code] ?? ''}
                    onChange={(e) => setCreateCoffretForm({ translations: { ...createCoffretForm.translations, [lang.code]: e.target.value } })}
                    placeholder={lang.code === 'fr' ? 'Ex : Découverte' : 'Ex: Discovery'}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={createCoffret} disabled={isBusy || !hasCoffretName(createCoffretForm.translations)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Créer</button>
              <button onClick={() => setIsCreateCoffretOpen(false)} className="text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle note</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <NoteFormFields form={createForm} setForm={setCreateForm} coffrets={coffrets} />
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(selected)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selected.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  }`}
                >
                  {selected.is_active ? 'Actif' : 'Inactif'}
                </button>
                <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
              </div>
            </div>
            <NoteFormFields form={editForm} setForm={setEditForm} coffrets={coffrets} />
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
