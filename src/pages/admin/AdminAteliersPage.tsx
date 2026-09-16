import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X as XIcon } from 'lucide-react'

// Ateliers organisés par l'entreprise, chacun rattaché à un coffret précis.

// Contrairement aux notes/coffrets (bilingues FR/EN), les ateliers ne sont
// saisis qu'en français — pas de public anglophone visé pour l'instant.
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
]

type Atelier = {
  id: number
  coffret_id: number
  description: string | null
  volume_ml: number | null
  is_active: boolean
  translations: Record<string, string>
}

type Coffret = {
  id: number
  translations: Record<string, string>
}

function coffretName(coffret: Coffret): string {
  return coffret.translations.fr || Object.values(coffret.translations)[0] || `#${coffret.id}`
}

function emptyForm() {
  return {
    translations: Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])) as Record<string, string>,
    coffret_id: 0,
    description: '',
    volume_ml: '',
  }
}

function displayName(atelier: Atelier): string {
  return atelier.translations.fr || Object.values(atelier.translations)[0] || '(sans nom)'
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

// Déclaré au niveau module (et non à l'intérieur du composant) : sinon React le
// traiterait comme un type de composant différent à chaque frappe, démontant et
// remontant les inputs, ce qui leur fait perdre le focus à chaque caractère saisi.
function AtelierFormFields({
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
        <div key={lang.code}>
          <label className="text-xs text-gray-600 mb-1 block">Nom ({lang.label}) {lang.code === 'fr' ? '*' : ''}</label>
          <input
            value={form.translations[lang.code] ?? ''}
            onChange={(e) => setForm({ ...form, translations: { ...form.translations, [lang.code]: e.target.value } })}
            placeholder={lang.code === 'fr' ? 'Ex : Atelier découverte' : 'Ex: Discovery workshop'}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Coffret *</label>
        <select
          value={form.coffret_id || ''}
          onChange={(e) => setForm({ ...form, coffret_id: Number(e.target.value) })}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
        >
          <option value="">— Sélectionner —</option>
          {coffrets.map((c) => (
            <option key={c.id} value={c.id}>{coffretName(c)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Quantité (ml)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={form.volume_ml}
          onChange={(e) => setForm({ ...form, volume_ml: e.target.value })}
          placeholder="Ex : 30"
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Déroulé, contenu de l'atelier…"
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
        />
      </div>
    </div>
  )
}

export default function AdminAteliersPage() {
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [coffrets, setCoffrets] = useState<Coffret[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())

  const [selected, setSelected] = useState<Atelier | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      const [ateliersData, coffretsData] = await Promise.all([
        apiFetch('/ateliers?active_only=false'),
        apiFetch('/coffrets'),
      ])
      setAteliers(Array.isArray(ateliersData) ? (ateliersData as Atelier[]) : [])
      setCoffrets(Array.isArray(coffretsData) ? (coffretsData as Coffret[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const coffretsById = useMemo(() => new Map(coffrets.map((c) => [c.id, c])), [coffrets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ateliers
    return ateliers.filter((a) => `${Object.values(a.translations).join(' ')} ${a.description ?? ''}`.toLowerCase().includes(q))
  }, [ateliers, search])

  function hasAtLeastOneName(translations: Record<string, string>) {
    return Object.values(translations).some((v) => v.trim())
  }

  function isFormValid(form: ReturnType<typeof emptyForm>) {
    return hasAtLeastOneName(form.translations) && !!form.coffret_id
  }

  async function createAtelier() {
    if (!isFormValid(createForm)) return
    setIsBusy(true)
    try {
      await apiFetch('/ateliers', {
        method: 'POST',
        body: JSON.stringify({
          translations: createForm.translations,
          coffret_id: createForm.coffret_id,
          description: createForm.description.trim() || null,
          volume_ml: createForm.volume_ml.trim() ? Number(createForm.volume_ml) : null,
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

  function openDetail(atelier: Atelier) {
    setSelected(atelier)
    setEditForm({
      translations: { ...Object.fromEntries(LANGUAGES.map((l) => [l.code, ''])), ...atelier.translations },
      coffret_id: atelier.coffret_id,
      description: atelier.description ?? '',
      volume_ml: atelier.volume_ml != null ? String(atelier.volume_ml) : '',
    })
  }

  async function saveDetail() {
    if (!selected || !isFormValid(editForm)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ateliers/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          translations: editForm.translations,
          coffret_id: editForm.coffret_id,
          description: editForm.description.trim() || null,
          volume_ml: editForm.volume_ml.trim() ? Number(editForm.volume_ml) : null,
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

  async function toggleActive(atelier: Atelier) {
    setIsBusy(true)
    try {
      await apiFetch(`/ateliers/${atelier.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !atelier.is_active }) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteAtelier() {
    if (!selected) return
    if (!window.confirm(`Supprimer l'atelier "${displayName(selected)}" ?`)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ateliers/${selected.id}`, { method: 'DELETE' })
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
          <h1 className="text-xl font-bold text-gray-900">Ateliers</h1>
          <p className="text-xs text-gray-600 mt-1">Ateliers organisés par l'entreprise, chacun rattaché à un coffret.</p>
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
                {LANGUAGES.map((lang) => (
                  <th key={lang.code} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nom ({lang.code.toUpperCase()})</th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Coffret</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Quantité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3 + LANGUAGES.length} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isBusy ? 'Chargement...' : 'Aucun atelier.'}
                  </td>
                </tr>
              )}
              {filtered.map((atelier) => (
                <tr key={atelier.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(atelier)}>
                  {LANGUAGES.map((lang) => (
                    <td key={lang.code} className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{atelier.translations[lang.code] || <span className="text-gray-400 italic font-normal">—</span>}</p>
                      {lang.code === 'fr' && atelier.description && <p className="text-xs text-gray-600 truncate max-w-xs">{atelier.description}</p>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {coffretsById.get(atelier.coffret_id) ? coffretName(coffretsById.get(atelier.coffret_id)!) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {atelier.volume_ml != null ? `${atelier.volume_ml} ml` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(atelier) }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        atelier.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                      }`}
                    >
                      {atelier.is_active ? 'Actif' : 'Inactif'}
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
              <h2 className="text-lg font-semibold text-gray-900">Nouvel atelier</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <AtelierFormFields form={createForm} setForm={setCreateForm} coffrets={coffrets} />
            <div className="flex gap-2 pt-2">
              <button onClick={createAtelier} disabled={isBusy || !isFormValid(createForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Créer</button>
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
              <h2 className="text-lg font-semibold text-gray-900">Atelier — {displayName(selected)}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <AtelierFormFields form={editForm} setForm={setEditForm} coffrets={coffrets} />
            <div className="flex gap-2 pt-2">
              <button onClick={deleteAtelier} className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-700 px-4 py-2 rounded-lg text-sm transition-colors"><Trash2 size={14} /> Supprimer</button>
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
