import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X as XIcon } from 'lucide-react'

// Options du parfum (ex: Ruban, Champagne, Flacon murano) : plusieurs sélectionnables à la
// fois côté client. Par défaut disponibles pour tous les coffrets ; une sélection explicite
// de coffrets restreint l'option à ceux-là uniquement (voir option_coffrets côté serveur).

// Le français est le seul champ saisi manuellement ; les autres langues sont générées
// automatiquement côté serveur (OpenAI) à la création/modification, et affichées ici en
// lecture seule une fois l'option enregistrée — même principe que Notes et Ateliers.
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'es', label: 'Espagnol' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ru', label: 'Russe' },
  { code: 'ar', label: 'Arabe' },
]

type OptionItem = {
  id: number
  description: string | null
  image_url: string | null
  is_active: boolean
  coffret_ids: number[]
  atelier_ids: number[]
  translations: Record<string, string>
}

type Coffret = {
  id: number
  translations: Record<string, string>
}

type Atelier = {
  id: number
  coffret_id: number
  translations: Record<string, string>
}

function coffretName(coffret: Coffret): string {
  return coffret.translations.fr || Object.values(coffret.translations)[0] || `#${coffret.id}`
}

function atelierName(atelier: Atelier): string {
  return atelier.translations.fr || Object.values(atelier.translations)[0] || `#${atelier.id}`
}

function emptyForm() {
  return {
    translations: { fr: '' } as Record<string, string>,
    description: '',
    coffret_ids: [] as number[],
    atelier_ids: [] as number[],
  }
}

function displayName(option: OptionItem): string {
  return option.translations.fr || Object.values(option.translations)[0] || '(sans nom)'
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

async function apiUpload(path: string, formData: FormData) {
  const res = await fetch(`${API_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const details = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${details ? ` — ${details}` : ''}`)
  }
  return res.json() as Promise<unknown>
}

// Déclaré au niveau module : voir le commentaire équivalent dans AdminAteliersPage.tsx
// (sinon React démonte/remonte les inputs à chaque frappe et leur fait perdre le focus).
function OptionFormFields({
  form,
  setForm,
  coffrets,
  ateliers,
  existingTranslations,
}: {
  form: ReturnType<typeof emptyForm>
  setForm: (f: ReturnType<typeof emptyForm>) => void
  coffrets: Coffret[]
  ateliers: Atelier[]
  existingTranslations?: Record<string, string>
}) {
  function toggleCoffret(coffretId: number) {
    setForm({
      ...form,
      coffret_ids: form.coffret_ids.includes(coffretId)
        ? form.coffret_ids.filter((id) => id !== coffretId)
        : [...form.coffret_ids, coffretId],
    })
  }

  function toggleAtelier(atelierId: number) {
    setForm({
      ...form,
      atelier_ids: form.atelier_ids.includes(atelierId)
        ? form.atelier_ids.filter((id) => id !== atelierId)
        : [...form.atelier_ids, atelierId],
    })
  }

  const otherLanguages = LANGUAGES.filter((l) => l.code !== 'fr')

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Nom (Français) *</label>
        <input
          value={form.translations.fr ?? ''}
          onChange={(e) => setForm({ ...form, translations: { ...form.translations, fr: e.target.value } })}
          placeholder="Ex : Ruban"
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Les autres langues sont générées automatiquement à l'enregistrement.
        </p>
      </div>

      {existingTranslations && otherLanguages.some((l) => existingTranslations[l.code]) && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Traductions générées</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {otherLanguages.map((lang) => (
              <div key={lang.code} className="text-xs">
                <span className="text-gray-500">{lang.label} : </span>
                <span className="text-gray-900">{existingTranslations[lang.code] || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-600 mb-1 block">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Précisions sur l'option…"
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
        />
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">
          Coffrets concernés — laisser vide pour la rendre disponible à tous les coffrets
        </label>
        <div className="flex flex-wrap gap-2">
          {coffrets.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCoffret(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                form.coffret_ids.includes(c.id)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {coffretName(c)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 mb-1 block">
          Ateliers concernés — laisser vide pour la rendre disponible à tous les ateliers
        </label>
        <div className="flex flex-wrap gap-2">
          {ateliers.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleAtelier(a.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                form.atelier_ids.includes(a.id)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {atelierName(a)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminOptionsPage() {
  const [options, setOptions] = useState<OptionItem[]>([])
  const [coffrets, setCoffrets] = useState<Coffret[]>([])
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())

  const [selected, setSelected] = useState<OptionItem | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      const [optionsData, coffretsData, ateliersData] = await Promise.all([
        apiFetch('/options'),
        apiFetch('/coffrets'),
        apiFetch('/ateliers'),
      ])
      setOptions(Array.isArray(optionsData) ? (optionsData as OptionItem[]) : [])
      setCoffrets(Array.isArray(coffretsData) ? (coffretsData as Coffret[]) : [])
      setAteliers(Array.isArray(ateliersData) ? (ateliersData as Atelier[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const coffretsById = useMemo(() => new Map(coffrets.map((c) => [c.id, c])), [coffrets])
  const ateliersById = useMemo(() => new Map(ateliers.map((a) => [a.id, a])), [ateliers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${Object.values(o.translations).join(' ')} ${o.description ?? ''}`.toLowerCase().includes(q))
  }, [options, search])

  function hasAtLeastOneName(translations: Record<string, string>) {
    return Object.values(translations).some((v) => v.trim())
  }

  function isFormValid(form: ReturnType<typeof emptyForm>) {
    return hasAtLeastOneName(form.translations)
  }

  async function createOption() {
    if (!isFormValid(createForm)) return
    setIsBusy(true)
    try {
      await apiFetch('/options', {
        method: 'POST',
        body: JSON.stringify({
          translations: createForm.translations,
          description: createForm.description.trim() || null,
          coffret_ids: createForm.coffret_ids,
          atelier_ids: createForm.atelier_ids,
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

  function openDetail(option: OptionItem) {
    setSelected(option)
    setEditForm({
      translations: { fr: option.translations.fr ?? '' },
      description: option.description ?? '',
      coffret_ids: option.coffret_ids,
      atelier_ids: option.atelier_ids,
    })
  }

  async function saveDetail() {
    if (!selected || !isFormValid(editForm)) return
    setIsBusy(true)
    try {
      await apiFetch(`/options/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          translations: editForm.translations,
          description: editForm.description.trim() || null,
          coffret_ids: editForm.coffret_ids,
          atelier_ids: editForm.atelier_ids,
          is_active: selected.is_active,
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

  async function uploadImage(file: File) {
    if (!selected) return
    setIsBusy(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const updated = await apiUpload(`/options/${selected.id}/image`, formData) as OptionItem
      setSelected(updated)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function removeImage() {
    if (!selected) return
    setIsBusy(true)
    try {
      await apiFetch(`/options/${selected.id}/image`, { method: 'DELETE' })
      setSelected((prev) => (prev ? { ...prev, image_url: null } : prev))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function toggleActive(option: OptionItem) {
    setIsBusy(true)
    try {
      await apiFetch(`/options/${option.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !option.is_active }) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteOption() {
    if (!selected) return
    if (!window.confirm(`Supprimer l'option "${displayName(selected)}" ?`)) return
    setIsBusy(true)
    try {
      await apiFetch(`/options/${selected.id}`, { method: 'DELETE' })
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Options</h1>
          <p className="text-xs text-gray-600 mt-1">Options du parfum (ruban, champagne, flacon…), sélectionnables par le client en plus de sa formule.</p>
        </div>
        <button onClick={() => { setCreateForm(emptyForm()); setIsCreateOpen(true) }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors shrink-0">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400" />
      </div>

      {error && <p className="text-red-700 text-sm text-center py-3 bg-red-500/10 rounded-lg mb-4">{error}</p>}

      <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Traductions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Coffrets</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Ateliers</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isBusy ? 'Chargement...' : 'Aucune option.'}
                  </td>
                </tr>
              )}
              {filtered.map((option) => {
                const translatedCount = LANGUAGES.filter((l) => l.code !== 'fr' && option.translations[l.code]).length
                return (
                <tr key={option.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(option)}>
                  <td className="px-4 py-3">
                    {option.image_url ? (
                      <img src={option.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{option.translations.fr || <span className="text-gray-400 italic font-normal">—</span>}</p>
                    {option.description && <p className="text-xs text-gray-600 truncate max-w-xs">{option.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {translatedCount === 0 ? (
                      <span className="text-amber-600">Aucune</span>
                    ) : (
                      `${translatedCount}/${LANGUAGES.length - 1} langues`
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {option.coffret_ids.length === 0
                      ? 'Tous les coffrets'
                      : option.coffret_ids.map((id) => (coffretsById.get(id) ? coffretName(coffretsById.get(id)!) : `#${id}`)).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {option.atelier_ids.length === 0
                      ? 'Tous les ateliers'
                      : option.atelier_ids.map((id) => (ateliersById.get(id) ? atelierName(ateliersById.get(id)!) : `#${id}`)).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(option) }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        option.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                      }`}
                    >
                      {option.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle option</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <OptionFormFields form={createForm} setForm={setCreateForm} coffrets={coffrets} ateliers={ateliers} />
            <div className="flex gap-2 pt-2">
              <button onClick={createOption} disabled={isBusy || !isFormValid(createForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Créer</button>
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
              <h2 className="text-lg font-semibold text-gray-900">Option — {displayName(selected)}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Image</label>
              {selected.image_url ? (
                <div className="flex items-center gap-3">
                  <img src={selected.image_url} alt={displayName(selected)} className="h-20 w-20 rounded-lg object-cover border border-gray-300" />
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-white hover:bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg text-xs transition-colors border border-gray-300">
                      Remplacer
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }} />
                    </label>
                    <button onClick={removeImage} className="bg-red-600/20 hover:bg-red-600/30 text-red-700 px-3 py-1.5 rounded-lg text-xs transition-colors">Retirer</button>
                  </div>
                </div>
              ) : (
                <label className="inline-block cursor-pointer bg-white hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm transition-colors border border-gray-300">
                  Choisir une image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }} />
                </label>
              )}
            </div>
            <OptionFormFields form={editForm} setForm={setEditForm} coffrets={coffrets} ateliers={ateliers} existingTranslations={selected.translations} />
            <div className="flex gap-2 pt-2">
              <button onClick={deleteOption} className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-700 px-4 py-2 rounded-lg text-sm transition-colors"><Trash2 size={14} /> Supprimer</button>
              <div className="flex-1" />
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors">Fermer</button>
              <button onClick={saveDetail} disabled={isBusy || !isFormValid(editForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
