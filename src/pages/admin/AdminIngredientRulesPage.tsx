import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Trash2, X as XIcon } from 'lucide-react'

// Règles de composition entre notes olfactives. Cinq types :
//  - incompatibility : groupe symétrique de notes qui ne doivent jamais être
//    choisies ensemble (pas de note "source", juste un groupe de 2+ notes).
//  - max_dosage       : un groupe de notes partageant le même plafond max_ml.
//  - recommendation   : une note source précise → des notes conseillées.
//  - note_count       : pour une/des taille(s) de flacon donnée(s), un min/max
//    du NOMBRE de notes choisies (pas une quantité en ml) par famille.
//  - group_limit      : un groupe de notes choisies à la main + un plafond sur
//    le nombre de notes que l'utilisateur peut choisir parmi elles (pas de
//    notion de famille tête/cœur/fond, contrairement à note_count).
// Chaque règle peut aussi être restreinte à un coffret, une intensité de
// parfum (léger/modéré/fort/toutes) et une ou plusieurs tailles de flacon.
// Stockage seul pour le moment — l'application de ces règles lors de la
// génération d'une formule (Lylo ou autre) reste à brancher séparément.

type Note = {
  id: number
  type: 'top' | 'heart' | 'base' | 'booster'
  translations: Record<string, string>
  box_sets: string[] | null
}

type RuleType = 'incompatibility' | 'max_dosage' | 'recommendation' | 'note_count' | 'group_limit'
type Intensity = 'legere' | 'moyenne' | 'forte' | 'toutes'

type Rule = {
  id: number
  source_ingredient_id: number | null
  rule_type: RuleType
  max_ml: number | null
  max_choices: number | null
  bottle_sizes: string[]
  box_set: string | null
  intensity: Intensity
  min_top: number | null
  max_top: number | null
  min_heart: number | null
  max_heart: number | null
  min_base: number | null
  max_base: number | null
  note: string | null
  is_active: boolean
  target_ingredient_ids: number[]
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  incompatibility: 'Incompatibilité',
  max_dosage: 'Dosage max',
  recommendation: 'Recommandation',
  note_count: 'Nombre de notes',
  group_limit: 'Limite de choix',
}

const RULE_TYPE_STYLE: Record<RuleType, string> = {
  incompatibility: 'bg-red-500/10 text-red-700',
  max_dosage: 'bg-amber-500/10 text-amber-600',
  recommendation: 'bg-emerald-500/10 text-emerald-600',
  note_count: 'bg-blue-500/10 text-blue-600',
  group_limit: 'bg-purple-500/10 text-purple-600',
}

const NOTE_COUNT_FAMILIES: { key: 'top' | 'heart' | 'base'; label: string }[] = [
  { key: 'top', label: 'Notes de tête' },
  { key: 'heart', label: 'Notes de cœur' },
  { key: 'base', label: 'Notes de fond' },
]

const INTENSITY_LABELS: Record<Intensity, string> = {
  legere: 'Léger',
  moyenne: 'Modéré',
  forte: 'Fort',
  toutes: 'Toutes intensités',
}

const STANDARD_BOTTLE_SIZES = ['30ml', '50ml', '100ml']

function emptyForm() {
  return {
    source_ingredient_id: 0,
    rule_type: 'incompatibility' as RuleType,
    max_ml: '',
    max_choices: '',
    bottle_sizes: [] as string[],
    box_set: '',
    intensity: 'toutes' as Intensity,
    note: '',
    target_ingredient_ids: [] as number[],
    min_top: '', max_top: '',
    min_heart: '', max_heart: '',
    min_base: '', max_base: '',
  }
}

type Form = ReturnType<typeof emptyForm>

function displayName(note: Note | undefined): string {
  if (!note) return '(note supprimée)'
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

/** Sélecteur multi-notes simple : liste de cases à cocher filtrable. */
function NoteMultiSelect({
  notes,
  values,
  onChange,
  excludeId,
}: {
  notes: Note[]
  values: number[]
  onChange: (values: number[]) => void
  excludeId?: number
}) {
  const [search, setSearch] = useState('')
  const options = notes.filter((n) => n.id !== excludeId && displayName(n).toLowerCase().includes(search.trim().toLowerCase()))

  function toggle(id: number) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id])
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filtrer les notes…"
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 mb-2"
      />
      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {options.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">Aucune note</p>}
        {options.map((n) => (
          <label key={n.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={values.includes(n.id)} onChange={() => toggle(n.id)} className="accent-indigo-500" />
            {displayName(n)}
          </label>
        ))}
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {values.map((id) => (
            <span key={id} className="flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
              {displayName(notes.find((n) => n.id === id))}
              <button type="button" onClick={() => toggle(id)} className="text-gray-500 hover:text-gray-900" aria-label="Retirer">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Sélecteur multi-tailles : cases à cocher pour les tailles standards + ajout libre. */
function BottleSizeMultiSelect({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [customDraft, setCustomDraft] = useState('')
  const customSizes = values.filter((v) => !STANDARD_BOTTLE_SIZES.includes(v))

  function toggle(size: string) {
    onChange(values.includes(size) ? values.filter((v) => v !== size) : [...values, size])
  }

  function addCustom() {
    const size = customDraft.trim()
    if (!size || values.includes(size)) return
    onChange([...values, size])
    setCustomDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {STANDARD_BOTTLE_SIZES.map((size) => (
          <label key={size} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${values.includes(size) ? 'bg-indigo-600/10 border-indigo-400 text-indigo-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <input type="checkbox" checked={values.includes(size)} onChange={() => toggle(size)} className="accent-indigo-500" />
            {size}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Autre taille (ex: 15ml)…"
          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
        />
        <button type="button" onClick={addCustom} className="bg-white hover:bg-gray-200 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm transition-colors">Ajouter</button>
      </div>
      {customSizes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {customSizes.map((size) => (
            <span key={size} className="flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
              {size}
              <button type="button" onClick={() => toggle(size)} className="text-gray-500 hover:text-gray-900" aria-label="Retirer">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Bornes min/max entières valides ensemble (vide autorisé, min ≤ max si les deux sont renseignés). */
function isValidRange(min: string, max: string): boolean {
  const minEmpty = min.trim() === ''
  const maxEmpty = max.trim() === ''
  if (!minEmpty && (!/^\d+$/.test(min.trim()))) return false
  if (!maxEmpty && (!/^\d+$/.test(max.trim()))) return false
  if (!minEmpty && !maxEmpty && Number(min) > Number(max)) return false
  return true
}

function noteCountPayload(form: Form) {
  return {
    min_top: form.min_top.trim() === '' ? null : Number(form.min_top),
    max_top: form.max_top.trim() === '' ? null : Number(form.max_top),
    min_heart: form.min_heart.trim() === '' ? null : Number(form.min_heart),
    max_heart: form.max_heart.trim() === '' ? null : Number(form.max_heart),
    min_base: form.min_base.trim() === '' ? null : Number(form.min_base),
    max_base: form.max_base.trim() === '' ? null : Number(form.max_base),
  }
}

export default function AdminIngredientRulesPage({ onBack }: { onBack: () => void }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [boxSets, setBoxSets] = useState<string[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<RuleType | ''>('')
  const [boxSetFilter, setBoxSetFilter] = useState('')
  const [intensityFilter, setIntensityFilter] = useState<Intensity | ''>('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm())

  const [selected, setSelected] = useState<Rule | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())

  async function refresh() {
    setError(null)
    setIsBusy(true)
    try {
      const [notesData, rulesData, boxSetsData] = await Promise.all([
        apiFetch('/ingredients?active_only=false'),
        apiFetch('/ingredient-rules'),
        apiFetch('/box-sets'),
      ])
      setNotes(Array.isArray(notesData) ? (notesData as Note[]) : [])
      setRules(Array.isArray(rulesData) ? (rulesData as Rule[]) : [])
      setBoxSets(Array.isArray(boxSetsData) ? (boxSetsData as { name: string }[]).map((b) => b.name) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const notesById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  function noteById(id: number | null | undefined): Note | undefined {
    return id != null ? notesById.get(id) : undefined
  }

  function ruleLabel(rule: Rule): string {
    if (rule.rule_type === 'incompatibility' || rule.rule_type === 'max_dosage' || rule.rule_type === 'group_limit') {
      return rule.target_ingredient_ids.map((id) => displayName(noteById(id))).join(' + ')
    }
    if (rule.rule_type === 'note_count') {
      return rule.bottle_sizes.length > 0 ? rule.bottle_sizes.join(', ') : '(taille non renseignée)'
    }
    return displayName(noteById(rule.source_ingredient_id))
  }

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (typeFilter && r.rule_type !== typeFilter) return false
      if (boxSetFilter && r.box_set !== boxSetFilter) return false
      if (intensityFilter && r.intensity !== intensityFilter && r.intensity !== 'toutes') return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      const sourceName = displayName(noteById(r.source_ingredient_id)).toLowerCase()
      const targetNames = r.target_ingredient_ids.map((id) => displayName(noteById(id)).toLowerCase()).join(' ')
      const bottleSizes = r.bottle_sizes.join(' ').toLowerCase()
      return `${sourceName} ${targetNames} ${bottleSizes} ${r.note ?? ''}`.toLowerCase().includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, search, typeFilter, boxSetFilter, intensityFilter, notesById])

  function isFormValid(form: Form) {
    if (form.rule_type === 'incompatibility') return form.target_ingredient_ids.length >= 2
    if (form.rule_type === 'max_dosage') {
      return form.target_ingredient_ids.length >= 1 && form.max_ml.trim() !== '' && !Number.isNaN(Number(form.max_ml))
    }
    if (form.rule_type === 'group_limit') {
      const n = Number(form.max_choices)
      if (form.target_ingredient_ids.length < 2) return false
      if (form.max_choices.trim() === '' || !Number.isInteger(n) || n < 1) return false
      return n < form.target_ingredient_ids.length
    }
    if (form.rule_type === 'note_count') {
      if (form.bottle_sizes.length === 0) return false
      return NOTE_COUNT_FAMILIES.every(({ key }) => isValidRange(form[`min_${key}`], form[`max_${key}`]))
    }
    if (!form.source_ingredient_id) return false
    return form.target_ingredient_ids.length > 0
  }

  async function createRule() {
    if (!isFormValid(createForm)) return
    setIsBusy(true)
    try {
      await apiFetch('/ingredient-rules', {
        method: 'POST',
        body: JSON.stringify({
          source_ingredient_id: createForm.rule_type === 'recommendation' ? createForm.source_ingredient_id : null,
          rule_type: createForm.rule_type,
          max_ml: createForm.rule_type === 'max_dosage' ? Number(createForm.max_ml) : null,
          max_choices: createForm.rule_type === 'group_limit' ? Number(createForm.max_choices) : null,
          bottle_sizes: createForm.bottle_sizes,
          box_set: createForm.box_set || null,
          intensity: createForm.intensity,
          note: createForm.note.trim() || null,
          target_ingredient_ids: createForm.rule_type !== 'note_count' ? createForm.target_ingredient_ids : [],
          ...noteCountPayload(createForm),
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

  function openDetail(rule: Rule) {
    setSelected(rule)
    setEditForm({
      source_ingredient_id: rule.source_ingredient_id ?? 0,
      rule_type: rule.rule_type,
      max_ml: rule.max_ml != null ? String(rule.max_ml) : '',
      max_choices: rule.max_choices != null ? String(rule.max_choices) : '',
      bottle_sizes: rule.bottle_sizes,
      box_set: rule.box_set ?? '',
      intensity: rule.intensity,
      note: rule.note ?? '',
      target_ingredient_ids: rule.target_ingredient_ids,
      min_top: rule.min_top != null ? String(rule.min_top) : '',
      max_top: rule.max_top != null ? String(rule.max_top) : '',
      min_heart: rule.min_heart != null ? String(rule.min_heart) : '',
      max_heart: rule.max_heart != null ? String(rule.max_heart) : '',
      min_base: rule.min_base != null ? String(rule.min_base) : '',
      max_base: rule.max_base != null ? String(rule.max_base) : '',
    })
  }

  async function saveDetail() {
    if (!selected || !isFormValid(editForm)) return
    setIsBusy(true)
    try {
      await apiFetch(`/ingredient-rules/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          source_ingredient_id: editForm.rule_type === 'recommendation' ? editForm.source_ingredient_id : null,
          rule_type: editForm.rule_type,
          max_ml: editForm.rule_type === 'max_dosage' ? Number(editForm.max_ml) : null,
          max_choices: editForm.rule_type === 'group_limit' ? Number(editForm.max_choices) : null,
          bottle_sizes: editForm.bottle_sizes,
          box_set: editForm.box_set || null,
          intensity: editForm.intensity,
          note: editForm.note.trim() || null,
          is_active: selected.is_active,
          target_ingredient_ids: editForm.rule_type !== 'note_count' ? editForm.target_ingredient_ids : [],
          ...noteCountPayload(editForm),
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

  async function toggleActive(rule: Rule) {
    setIsBusy(true)
    try {
      await apiFetch(`/ingredient-rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !rule.is_active }) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteRule() {
    if (!selected) return
    if (!window.confirm('Supprimer cette règle ?')) return
    setIsBusy(true)
    try {
      await apiFetch(`/ingredient-rules/${selected.id}`, { method: 'DELETE' })
      setSelected(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function FormFields({ form, setForm }: { form: Form; setForm: (f: Form) => void }) {
    // Les notes d'un coffret sont différentes de celles d'un autre : une fois
    // le coffret choisi, on ne propose plus que ses notes dans les sélecteurs.
    const scopedNotes = form.box_set ? notes.filter((n) => n.box_sets?.includes(form.box_set)) : notes

    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Coffret <span className="font-normal">(vide = toutes les notes)</span></label>
          <select
            value={form.box_set}
            onChange={(e) => setForm({ ...form, box_set: e.target.value, source_ingredient_id: 0, target_ingredient_ids: [] })}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">— Tous les coffrets —</option>
            {boxSets.map((bs) => (
              <option key={bs} value={bs}>{bs}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Intensité de parfum concernée *</label>
          <select
            value={form.intensity}
            onChange={(e) => setForm({ ...form, intensity: e.target.value as Intensity })}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="toutes">Toutes intensités</option>
            <option value="legere">Léger</option>
            <option value="moyenne">Modéré</option>
            <option value="forte">Fort</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            Quantité (ml) du parfum concernée {form.rule_type === 'note_count' ? '*' : <span className="font-normal">(vide = toutes tailles)</span>}
          </label>
          <BottleSizeMultiSelect values={form.bottle_sizes} onChange={(bottle_sizes) => setForm({ ...form, bottle_sizes })} />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Type de règle *</label>
          <select
            value={form.rule_type}
            onChange={(e) => setForm({ ...form, rule_type: e.target.value as RuleType })}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="incompatibility">Incompatibilité — ces notes ne doivent jamais être ensemble</option>
            <option value="max_dosage">Dosage max — plafonne la quantité de ces notes</option>
            <option value="recommendation">Recommandation — si une note est choisie, en suggère d'autres</option>
            <option value="note_count">Nombre de notes — min/max de notes par famille pour une taille de flacon</option>
            <option value="group_limit">Limite de choix — plafonne le nombre de notes choisies parmi une liste</option>
          </select>
        </div>

        {form.rule_type === 'incompatibility' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Notes qui ne doivent jamais être ensemble * <span className="font-normal">(2 minimum)</span></label>
            <NoteMultiSelect
              notes={scopedNotes}
              values={form.target_ingredient_ids}
              onChange={(target_ingredient_ids) => setForm({ ...form, target_ingredient_ids })}
            />
          </div>
        )}

        {form.rule_type === 'max_dosage' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Notes concernées * <span className="font-normal">(1 ou plusieurs, même plafond partagé)</span></label>
            <NoteMultiSelect
              notes={scopedNotes}
              values={form.target_ingredient_ids}
              onChange={(target_ingredient_ids) => setForm({ ...form, target_ingredient_ids })}
            />
          </div>
        )}

        {form.rule_type === 'recommendation' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Note source *</label>
            <select
              value={form.source_ingredient_id || ''}
              onChange={(e) => setForm({ ...form, source_ingredient_id: Number(e.target.value) })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            >
              <option value="">— Sélectionner —</option>
              {scopedNotes.map((n) => (
                <option key={n.id} value={n.id}>{displayName(n)}</option>
              ))}
            </select>
          </div>
        )}

        {form.rule_type === 'max_dosage' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Quantité max (ml) *</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.max_ml}
              onChange={(e) => setForm({ ...form, max_ml: e.target.value })}
              placeholder="Ex : 2"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            />
          </div>
        )}

        {form.rule_type === 'recommendation' && (
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Notes conseillées *</label>
            <NoteMultiSelect
              notes={scopedNotes}
              values={form.target_ingredient_ids}
              onChange={(target_ingredient_ids) => setForm({ ...form, target_ingredient_ids })}
              excludeId={form.source_ingredient_id || undefined}
            />
          </div>
        )}

        {form.rule_type === 'group_limit' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Notes du groupe * <span className="font-normal">(2 minimum)</span></label>
              <NoteMultiSelect
                notes={scopedNotes}
                values={form.target_ingredient_ids}
                onChange={(target_ingredient_ids) => setForm({ ...form, target_ingredient_ids })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Nombre max de notes à choisir parmi ce groupe *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.max_choices}
                onChange={(e) => setForm({ ...form, max_choices: e.target.value })}
                placeholder="Ex : 3"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
              <p className="text-[11px] text-gray-500 mt-1">Doit être inférieur au nombre de notes du groupe.</p>
            </div>
          </div>
        )}

        {form.rule_type === 'note_count' && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-500">Nombre de notes choisies par famille (pas une quantité en ml). Laisser vide = pas de contrainte sur cette borne.</p>
            {NOTE_COUNT_FAMILIES.map(({ key, label }) => {
              const minKey = `min_${key}` as const
              const maxKey = `max_${key}` as const
              const rangeValid = isValidRange(form[minKey], form[maxKey])
              return (
                <div key={key} className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-1">
                    <label className="text-xs text-gray-600 mb-1 block">{label}</label>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Min</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form[minKey]}
                      onChange={(e) => setForm({ ...form, [minKey]: e.target.value })}
                      placeholder="0"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Max</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form[maxKey]}
                      onChange={(e) => setForm({ ...form, [maxKey]: e.target.value })}
                      placeholder="—"
                      className={`w-full bg-white border rounded-lg px-3 py-2 text-sm text-gray-900 ${rangeValid ? 'border-gray-300' : 'border-red-400'}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Note libre</label>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Commentaire, justification…"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 text-sm transition-colors flex items-center gap-1">
          <ArrowLeft size={16} /> Retour aux notes
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Règles de composition</h1>
          <p className="text-xs text-gray-600 mt-1">Incompatibilités, dosages max, recommandations et nombre de notes par flacon.</p>
        </div>
        <button onClick={() => { setCreateForm(emptyForm()); setIsCreateOpen(true) }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors shrink-0">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as RuleType | '')} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="">Tous types</option>
          <option value="incompatibility">Incompatibilité</option>
          <option value="max_dosage">Dosage max</option>
          <option value="recommendation">Recommandation</option>
          <option value="note_count">Nombre de notes</option>
          <option value="group_limit">Limite de choix</option>
        </select>
        <select value={boxSetFilter} onChange={(e) => setBoxSetFilter(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="">Tous coffrets</option>
          {boxSets.map((bs) => (
            <option key={bs} value={bs}>{bs}</option>
          ))}
        </select>
        <select value={intensityFilter} onChange={(e) => setIntensityFilter(e.target.value as Intensity | '')} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900">
          <option value="">Toutes intensités</option>
          <option value="legere">Léger</option>
          <option value="moyenne">Modéré</option>
          <option value="forte">Fort</option>
        </select>
      </div>

      {error && <p className="text-red-700 text-sm text-center py-3 bg-red-500/10 rounded-lg mb-4">{error}</p>}

      <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Coffret</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Intensité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Quantité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Détail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Note</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                    {isBusy ? 'Chargement...' : 'Aucune règle.'}
                  </td>
                </tr>
              )}
              {filtered.map((rule) => (
                <tr key={rule.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => openDetail(rule)}>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_TYPE_STYLE[rule.rule_type]}`}>{RULE_TYPE_LABELS[rule.rule_type]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rule.box_set || <span className="text-gray-400 italic">Tous</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{INTENSITY_LABELS[rule.intensity]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rule.bottle_sizes.length > 0 ? rule.bottle_sizes.join(', ') : <span className="text-gray-400 italic">Toutes</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {rule.rule_type === 'incompatibility' || rule.rule_type === 'max_dosage' || rule.rule_type === 'group_limit' ? (
                      <div className="flex flex-wrap gap-1">
                        {rule.target_ingredient_ids.map((id) => (
                          <span key={id} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">{displayName(notesById.get(id))}</span>
                        ))}
                      </div>
                    ) : rule.rule_type === 'note_count' ? (
                      <span className="text-gray-400 italic">—</span>
                    ) : (
                      ruleLabel(rule)
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rule.rule_type === 'max_dosage' ? (
                      <span>Max {rule.max_ml} ml</span>
                    ) : rule.rule_type === 'group_limit' ? (
                      <span>Max {rule.max_choices} choisies</span>
                    ) : rule.rule_type === 'recommendation' && rule.target_ingredient_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {rule.target_ingredient_ids.map((id) => (
                          <span key={id} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">{displayName(notesById.get(id))}</span>
                        ))}
                      </div>
                    ) : rule.rule_type === 'note_count' ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                        {NOTE_COUNT_FAMILIES.map(({ key, label }) => {
                          const min = rule[`min_${key}`]
                          const max = rule[`max_${key}`]
                          if (min == null && max == null) return null
                          return (
                            <span key={key}>{label} : {min ?? 0}–{max ?? '∞'}</span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{rule.note || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(rule) }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        rule.is_active ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
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
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle règle</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <FormFields form={createForm} setForm={setCreateForm} />
            <div className="flex gap-2 pt-2">
              <button onClick={createRule} disabled={isBusy || !isFormValid(createForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Créer</button>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Règle — {ruleLabel(selected)}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-900"><XIcon size={18} /></button>
            </div>
            <FormFields form={editForm} setForm={setEditForm} />
            <div className="flex gap-2 pt-2">
              <button onClick={deleteRule} className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-700 px-4 py-2 rounded-lg text-sm transition-colors"><Trash2 size={14} /> Supprimer</button>
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
