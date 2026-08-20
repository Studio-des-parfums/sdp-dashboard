import { useEffect, useRef, useState } from 'react'
import { formulasApi, ordersApi, customersApi, filesApi } from '../../api/ocrClient'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'

interface Note {
  id?: number
  name: string
  quantity: string
}

interface Formula {
  id: number
  reference?: string
  perfume_name?: string
  customer_id?: number
  file_id?: number
  comment?: string
  top_notes: Note[]
  heart_notes: Note[]
  base_notes: Note[]
}

interface Order {
  id: number
  order_type: string
  status: string
}

interface FormulaDetailsPageProps {
  formulaId: number
  customerId: number
  onBack: () => void
}

const TOP_NOTES_OPTIONS = [
  'Bambou', 'Bergamote', 'Bergamote verte', 'Cardamome ginger', 'Citron amère', 'Citron doux',
  "Fleur d'oranger", 'Florale fraîche', 'Freesia', 'Fruit de cassis', 'Géranium sauvage',
  'Gingembre', 'Grenadier', 'Lavande sauvage', 'Lotus', 'Mandarine portofino', 'Note verte',
  'Oeillet fleuri', 'Orange', 'Orange amère', 'Ozone', 'Pamplemousse', 'Poivre sichuan',
  'Pomme', 'Rose de mai', 'Spice bang', 'Thé vert',
]

const HEART_NOTES_OPTIONS = [
  'Cocktail', 'Concombre', 'Figue', 'Fleur de jacinthe', 'Fleur de pêche', 'Fleur de tiaré',
  'Geranium', 'Glycine', 'Hedione', 'Jasmin musqué', 'Jasmin oriental', 'Jonquille', 'Lylibell',
  'Mangue', 'Marine', 'Muguet musqué', 'Mure', 'Note cannelle', 'Note safran', 'Oeillet cuir',
  'Oeillet fruité', 'Pivoine', 'Rhubarbe', 'Romarin', "Rose d'orient", 'Rose fruitée cerise',
  'Tabac blond', 'Tabac gris', 'Tilleul', 'Violette', 'Ylang coton',
]

const BASE_NOTES_OPTIONS = [
  'Accord musc', 'Amande', 'Ambre', 'Ambre oriental', 'Ambre vert', 'Ambreine', 'Bois ambré',
  'Bois booster', 'Bois de cachemire', 'Bois épicé', 'Boisé ambre', 'Boisé cèdre', 'Bouquet fleuri',
  'Cèdre', 'Chocolat au lait', 'Coco des îles', 'Cuir', 'Fève tonka', 'Fleur de jasmin',
  'Frangipane', 'Iris', 'Lilas', 'Mousse', 'Musc blanc', 'Musc floral', 'Myrrhe encens',
  'Note praline', 'Opoponax', "Oud d'or", 'Patchouli', "Poudre d'iris", 'Santal',
  "Santal d'Inde", "Santal d'orient", 'Santal exotique', 'Santaline', 'Tonka', 'Tubereuse',
  'Vanille', 'Vetiver', 'Virginia',
]

const ALL_NOTES_OPTIONS = [...TOP_NOTES_OPTIONS, ...HEART_NOTES_OPTIONS, ...BASE_NOTES_OPTIONS]

function parseQuantity(quantity: string | null | undefined): { value: number; valid: boolean } {
  if (!quantity) return { value: 0, valid: false }
  const str = String(quantity).trim()
  const invalidPatterns = /[+\-×÷✓✗xX*/]|(\d+\s+\d+)/
  if (invalidPatterns.test(str)) return { value: 0, valid: false }
  const match = str.match(/^[\d,.\s]+/)
  if (!match) return { value: 0, valid: false }
  const cleaned = match[0].replace(',', '.').replace(/\s/g, '')
  const parsed = parseFloat(cleaned)
  return { value: isNaN(parsed) ? 0 : parsed, valid: !isNaN(parsed) && cleaned !== '' }
}

function calculateNotesStats(notes: Note[]) {
  if (!notes || notes.length === 0) return { total: 0, invalidNotes: [] as string[] }
  let total = 0
  const invalidNotes: string[] = []
  notes.forEach(note => {
    const { value, valid } = parseQuantity(note.quantity)
    if (valid) total += value
    else if (note.quantity && note.quantity.trim() !== '') invalidNotes.push(note.name || 'Note sans nom')
  })
  return { total, invalidNotes }
}

function getFitStyle(
  size: { w: number; h: number } | null,
  boxW: number,
  boxH: number,
  rotation: number,
  zoom = 1,
): React.CSSProperties {
  if (!size || boxW <= 0 || boxH <= 0) {
    return { width: '100%', transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }
  }
  const rotated = rotation % 180 !== 0
  const base = Math.min(boxW / size.w, boxH / size.h)
  const scale = rotated ? Math.min(base, boxW / size.h, boxH / size.w) : base
  const width = Math.floor(size.w * scale * zoom)
  const height = Math.floor(size.h * scale * zoom)
  return {
    width,
    height,
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 0.3s ease',
    marginTop: rotated ? Math.floor((width - height) / 2) : 0,
  }
}

export default function FormulaDetailsPage({ formulaId, customerId, onBack }: FormulaDetailsPageProps) {
  const { showError, showSuccess } = useToast()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingData, setEditingData] = useState<Formula | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [previewRotation, setPreviewRotation] = useState(0)
  const [lightboxRotation, setLightboxRotation] = useState(0)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewWidth, setPreviewWidth] = useState(0)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      formulasApi.getById(formulaId),
      customerId ? customersApi.getById(customerId) : Promise.resolve(null),
    ])
      .then(([f, cust]) => {
        setFormula(f)
        setEditingData(JSON.parse(JSON.stringify(f)))
        if (cust) {
          const name = cust.name || [cust.first_name, cust.last_name].filter(Boolean).join(' ') || ''
          setCustomerName(name)
        }
        if (f.file_id) fetchOrders(f.id)
      })
      .catch(() => showError('Erreur', 'Impossible de charger la formule'))
      .finally(() => setLoading(false))
  }, [formulaId, customerId])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const update = () => setPreviewWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
      setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight })
    }
  }

  const fetchOrders = async (fId: number | undefined) => {
    if (!fId) return
    setOrdersLoading(true)
    try {
      const data = await ordersApi.getByFormulaId(fId)
      setOrders(data.orders || data.results || [])
    } catch { /* ignore */ }
    finally { setOrdersLoading(false) }
  }

  const handleNoteChange = (noteType: 'top_notes' | 'heart_notes' | 'base_notes', index: number, field: 'name' | 'quantity', value: string) => {
    if (!editingData) return
    const updated = { ...editingData }
    const notes = [...updated[noteType]]
    notes[index] = { ...notes[index], [field]: value }
    updated[noteType] = notes
    setEditingData(updated)
  }

  const handleAddNote = (noteType: 'top_notes' | 'heart_notes' | 'base_notes') => {
    if (!editingData) return
    const updated = { ...editingData }
    updated[noteType] = [...updated[noteType], { name: '', quantity: '' }]
    setEditingData(updated)
  }

  const handleRemoveNote = (noteType: 'top_notes' | 'heart_notes' | 'base_notes', index: number) => {
    if (!editingData) return
    const updated = { ...editingData }
    updated[noteType] = updated[noteType].filter((_, i) => i !== index)
    setEditingData(updated)
  }

  const handleSave = async () => {
    if (!editingData) return
    setIsSaving(true)
    try {
      await formulasApi.updateNotes(formulaId, {
        perfume_name: editingData.perfume_name,
        top_notes: editingData.top_notes,
        heart_notes: editingData.heart_notes,
        base_notes: editingData.base_notes,
      })
      setFormula(JSON.parse(JSON.stringify(editingData)))
      setIsEditing(false)
      showSuccess('Notes enregistrées')
    } catch {
      showError('Erreur', 'Impossible de sauvegarder les notes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingData(formula ? JSON.parse(JSON.stringify(formula)) : null)
    setIsEditing(false)
  }

  const displayData = isEditing ? editingData : formula
  const topStats = calculateNotesStats(displayData?.top_notes || [])
  const heartStats = calculateNotesStats(displayData?.heart_notes || [])
  const baseStats = calculateNotesStats(displayData?.base_notes || [])
  const grandTotal = topStats.total + heartStats.total + baseStats.total
  const allInvalidNotes = [...topStats.invalidNotes, ...heartStats.invalidNotes, ...baseStats.invalidNotes]
  const hasAnyInvalid = allInvalidNotes.length > 0

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!formula) {
    return (
      <div className="text-center py-12">
        <p className="text-red-700 text-sm">Formule introuvable</p>
        <button onClick={onBack} className="mt-4 text-sm text-indigo-600 hover:text-indigo-600">Retour</button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 transition-colors text-lg">←</button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{formula.reference || `Formule #${formula.id}`}</h1>
          <p className="text-xs text-gray-600">Nom du parfum : {formula.perfume_name || 'Non renseigné'}</p>
          {customerName && (
            <p className="text-xs text-gray-600">Client : {customerName}</p>
          )}
        </div>
        {!isEditing && (
          <Button size="sm" onClick={() => setIsEditing(true)} className="ml-auto">✏️ Modifier</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">🧪 Composition de la formule</h2>

          {!isEditing ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                {(['top_notes', 'heart_notes', 'base_notes'] as const).map((noteType, ti) => {
                  const stats = [topStats, heartStats, baseStats][ti]
                  const notes = displayData?.[noteType] || []
                  return (
                    <div key={noteType}>
                      <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                        {['Notes de tête', 'Notes de cœur', 'Notes de fond'][ti]}
                      </h5>
                      {notes.length > 0 ? (
                        <ul className="space-y-1">
                          {notes.map((note, ni) => (
                            <li key={note.id || ni} className="flex justify-between text-xs text-gray-600">
                              <span>{note.name}</span>
                              <span className="text-gray-600">{note.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-700">Aucune note</p>
                      )}
                      {!hasAnyInvalid && notes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-[11px]">
                          <span className="text-gray-600">Total: </span>
                          <span className="text-gray-900 font-medium">{stats.total.toFixed(2)} ml</span>
                          {grandTotal > 0 && (
                            <span className="text-gray-600 ml-1">
                              ({((stats.total / grandTotal) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!hasAnyInvalid && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm">
                  <span className="text-gray-600 font-medium">Total formule :</span>
                  <span className="text-gray-900 font-bold">{grandTotal.toFixed(2)} ml</span>
                </div>
              )}

              {hasAnyInvalid && (
                <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
                  ⚠️ Certaines notes ont une quantité qui ne correspond pas à un nombre valide : {allInvalidNotes.join(', ')}.
                </div>
              )}

              {formula.comment && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-1">Commentaire</h5>
                  <p className="text-xs text-gray-600">{formula.comment}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-xs text-gray-600 mb-1 block">Nom du parfum</label>
                <input
                  type="text"
                  value={editingData?.perfume_name || ''}
                  onChange={e => setEditingData(prev => prev ? { ...prev, perfume_name: e.target.value } : prev)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['top_notes', 'heart_notes', 'base_notes'] as const).map((noteType, ti) => (
                  <div key={noteType}>
                    <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                      {['Notes de tête', 'Notes de cœur', 'Notes de fond'][ti]}
                    </h5>
                    <div className="space-y-1">
                      {editingData?.[noteType]?.map((note, ni) => (
                        <div key={ni} className="flex gap-1 items-center">
                          <select
                            value={note.name}
                            onChange={e => handleNoteChange(noteType, ni, 'name', e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Choisir --</option>
                            {note.name && !ALL_NOTES_OPTIONS.includes(note.name) && (
                              <option value={note.name}>{note.name}</option>
                            )}
                            <optgroup label="Notes de Tête">
                              {TOP_NOTES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </optgroup>
                            <optgroup label="Notes de Cœur">
                              {HEART_NOTES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </optgroup>
                            <optgroup label="Notes de Fond">
                              {BASE_NOTES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </optgroup>
                          </select>
                          <input
                            type="text"
                            value={note.quantity}
                            onChange={e => handleNoteChange(noteType, ni, 'quantity', e.target.value)}
                            className="w-14 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 outline-none focus:border-indigo-500"
                            placeholder="Qté"
                          />
                          <button
                            onClick={() => handleRemoveNote(noteType, ni)}
                            className="text-red-700 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddNote(noteType)}
                        className="text-xs text-indigo-600 hover:text-indigo-600 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>Annuler</Button>
                <Button size="sm" onClick={handleSave} loading={isSaving}>
                  {isSaving ? 'Enregistrement...' : '💾 Enregistrer'}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">🖼 Document associé</h2>
            {formula.file_id ? (
              <div>
                <div ref={previewRef} className="bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                  <img
                    src={formulasApi.getThumbnailUrl(formulaId)}
                    alt="Aperçu"
                    className="cursor-pointer relative z-10"
                    onLoad={handleImageLoad}
                    style={getFitStyle(naturalSize, previewWidth, 420, previewRotation)}
                    onClick={() => { setLightboxImage(formulasApi.getThumbnailUrl(formulaId)); setLightboxRotation(previewRotation); setLightboxZoom(1) }}
                  />
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPreviewRotation(r => (r - 90 + 360) % 360)}
                    className="text-xs text-gray-500 hover:text-gray-900 bg-white px-2 py-1 rounded transition-colors"
                    title="Pivoter à gauche"
                  >
                    ↺
                  </button>
                  <button
                    onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                    className="text-xs text-gray-500 hover:text-gray-900 bg-white px-2 py-1 rounded transition-colors"
                    title="Pivoter à droite"
                  >
                    ↻
                  </button>
                </div>
                <div className="mt-2 text-center">
                  <a
                    href={filesApi.getDownloadUrl(formula.file_id!)}
                    download
                    className="text-xs text-indigo-600 hover:text-indigo-600 transition-colors"
                  >
                    ⬇️ Télécharger
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <span className="text-2xl mb-2">📄</span>
                <p className="text-sm">Aucun document associé</p>
              </div>
            )}
          </div>

          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">📦 Commandes liées ({orders.length})</h2>
            {ordersLoading ? (
              <p className="text-sm text-gray-600">Chargement...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-600">Aucune commande liée à cette formule</p>
            ) : (
              <div className="space-y-2">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-900">#{o.id} - {o.order_type}</span>
                    <span className="text-gray-600">{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-4">
              <div className={`flex flex-1 max-w-2xl rounded-lg ${lightboxZoom > 1 ? 'overflow-auto max-h-[70vh]' : ''}`}>
                <img
                  src={lightboxImage}
                  alt="Aperçu"
                  className="rounded-lg relative z-10 m-auto shrink-0"
                  onLoad={handleImageLoad}
                  style={getFitStyle(naturalSize, Math.min(window.innerWidth - 200, 632), window.innerHeight * 0.7, lightboxRotation, lightboxZoom)}
                />
              </div>
              <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 flex flex-col gap-2 shrink-0">
                <div className="flex justify-end">
                  <button onClick={() => setLightboxImage(null)} className="text-gray-900/60 hover:text-gray-900 text-sm">✕ Fermer</button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setLightboxRotation(r => (r - 90 + 360) % 360)}
                    className="text-gray-900 bg-white hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    ↺
                  </button>
                  <button
                    onClick={() => setLightboxRotation(r => (r + 90) % 360)}
                    className="text-gray-900 bg-white hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    ↻
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setLightboxZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
                    className="text-gray-900 bg-white hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    −
                  </button>
                  <span className="flex items-center text-xs text-gray-500 w-10 justify-center">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setLightboxZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                    className="text-gray-900 bg-white hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Retour au client</button>
    </div>
  )
}
