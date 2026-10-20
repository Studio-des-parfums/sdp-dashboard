import { useEffect, useRef, useState } from 'react'
import { formulasApi, ordersApi, customersApi, filesApi } from '../../api/ocrClient'
import { fetchNoteNamesByType, fetchOptionNames } from '../../api/ingredientsClient'
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
  atelier_id?: number
  atelier_name?: string
  top_notes: Note[]
  heart_notes: Note[]
  base_notes: Note[]
  booster_notes: Note[]
  options: string[]
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
  onOpenFormula?: (formulaId: number) => void
}

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
  const rotated = rotation % 180 !== 0

  if (!size || boxW <= 0 || boxH <= 0) {
    return {
      maxWidth: rotated ? `${boxH}px` : '100%',
      maxHeight: rotated ? `${boxW > 0 ? boxW : boxH}px` : `${boxH}px`,
      objectFit: 'contain',
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.3s ease',
    }
  }

  // When rotated 90deg or 270deg, visual width is size.h * scale and visual height is size.w * scale
  // Constrain visual bounding box to fit inside boxW x boxH
  const availW = rotated ? boxH : boxW
  const availH = rotated ? boxW : boxH
  const baseScale = Math.min(availW / size.w, availH / size.h)
  const scale = baseScale * zoom
  const width = Math.floor(size.w * scale)
  const height = Math.floor(size.h * scale)

  return {
    width,
    height,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `rotate(${rotation}deg)`,
    transition: 'transform 0.3s ease',
  }
}

export default function FormulaDetailsPage({ formulaId, customerId, onBack, onOpenFormula }: FormulaDetailsPageProps) {
  const { showError, showSuccess } = useToast()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [editingData, setEditingData] = useState<Formula | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [previewRotation, setPreviewRotation] = useState(0)
  const [lightboxRotation, setLightboxRotation] = useState(0)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [previewWidth, setPreviewWidth] = useState(0)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [thumbnailVersion, setThumbnailVersion] = useState(0)
  const [noteOptions, setNoteOptions] = useState<{ top: string[]; heart: string[]; base: string[]; booster: string[] }>({ top: [], heart: [], base: [], booster: [] })
  const [optionCatalog, setOptionCatalog] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetchNoteNamesByType('top'),
      fetchNoteNamesByType('heart'),
      fetchNoteNamesByType('base'),
      fetchNoteNamesByType('booster'),
    ]).then(([top, heart, base, booster]) => setNoteOptions({ top, heart, base, booster }))
    fetchOptionNames().then(setOptionCatalog)
  }, [])

  useEffect(() => {
    Promise.all([
      formulasApi.getById(formulaId),
      customerId ? customersApi.getById(customerId) : Promise.resolve(null),
    ])
      .then(([raw, cust]) => {
        const f: Formula = { ...raw, booster_notes: raw.booster_notes || [], options: raw.options || [] }
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
  }, [loading, formula?.file_id])

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      setNaturalSize({ w: imageRef.current.naturalWidth, h: imageRef.current.naturalHeight })
    }
  }, [thumbnailVersion, formula?.file_id, loading])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
      setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight })
    }
  }

  const handleGeneratePdf = async () => {
    if (!formula) return
    setGeneratingPdf(true)
    try {
      const updated = await formulasApi.generatePdf(formula.id)
      setFormula(prev => (prev ? { ...prev, file_id: updated.file_id } : prev))
      setThumbnailVersion(v => v + 1)
      showSuccess('Fiche PDF générée')
    } catch {
      showError('Erreur', 'Impossible de générer la fiche PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDuplicate = async () => {
    if (!formula || isDuplicating) return
    setIsDuplicating(true)
    try {
      const duplicated = await formulasApi.duplicate(formula.id)
      showSuccess(`Formule dupliquée avec succès : ${duplicated.reference || `#${duplicated.id}`}`)
      if (onOpenFormula) {
        onOpenFormula(duplicated.id)
      } else {
        const f: Formula = {
          ...duplicated,
          booster_notes: duplicated.booster_notes || [],
          options: duplicated.options || [],
        }
        setFormula(f)
        setEditingData(JSON.parse(JSON.stringify(f)))
      }
    } catch {
      showError('Erreur', 'Impossible de dupliquer la formule')
    } finally {
      setIsDuplicating(false)
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

  type NoteField = 'top_notes' | 'heart_notes' | 'base_notes' | 'booster_notes'

  const handleNoteChange = (noteType: NoteField, index: number, field: 'name' | 'quantity', value: string) => {
    if (!editingData) return
    const updated = { ...editingData }
    const notes = [...updated[noteType]]
    notes[index] = { ...notes[index], [field]: value }
    updated[noteType] = notes
    setEditingData(updated)
  }

  const handleAddNote = (noteType: NoteField) => {
    if (!editingData) return
    const updated = { ...editingData }
    updated[noteType] = [...updated[noteType], { name: '', quantity: '' }]
    setEditingData(updated)
  }

  const handleRemoveNote = (noteType: NoteField, index: number) => {
    if (!editingData) return
    const updated = { ...editingData }
    updated[noteType] = updated[noteType].filter((_, i) => i !== index)
    setEditingData(updated)
  }

  const handleToggleOption = (name: string) => {
    if (!editingData) return
    const has = editingData.options.includes(name)
    setEditingData({
      ...editingData,
      options: has ? editingData.options.filter(o => o !== name) : [...editingData.options, name],
    })
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
        booster_notes: editingData.booster_notes,
        options: editingData.options,
      })
      setFormula(JSON.parse(JSON.stringify(editingData)))
      setIsEditing(false)
      showSuccess('Formule enregistrée')
    } catch {
      showError('Erreur', 'Impossible de sauvegarder la formule')
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
  const boosterStats = calculateNotesStats(displayData?.booster_notes || [])
  const grandTotal = topStats.total + heartStats.total + baseStats.total + boosterStats.total
  const allInvalidNotes = [...topStats.invalidNotes, ...heartStats.invalidNotes, ...baseStats.invalidNotes, ...boosterStats.invalidNotes]
  const hasAnyInvalid = allInvalidNotes.length > 0
  const hasBoosterNotes = (displayData?.booster_notes?.length || 0) > 0
  const hasOptions = (displayData?.options?.length || 0) > 0

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
          {formula.atelier_name && (
            <p className="text-xs text-gray-600">Atelier : {formula.atelier_name}</p>
          )}
        </div>
        {!isEditing && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              {isDuplicating ? '⏳ Duplication...' : '📑 Dupliquer'}
            </Button>
            <Button size="sm" onClick={() => setIsEditing(true)}>✏️ Modifier</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">🧪 Composition de la formule</h2>

          {!isEditing ? (
            <>
              <div className={`grid gap-4 ${hasBoosterNotes ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
                {hasBoosterNotes && (
                  <div>
                    <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                      Notes booster
                    </h5>
                    <ul className="space-y-1">
                      {(displayData?.booster_notes || []).map((note, ni) => (
                        <li key={note.id || ni} className="flex justify-between text-xs text-gray-600">
                          <span>{note.name}</span>
                          <span className="text-gray-600">{note.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {!hasAnyInvalid && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-[11px]">
                        <span className="text-gray-600">Total: </span>
                        <span className="text-gray-900 font-medium">{boosterStats.total.toFixed(2)} ml</span>
                        {grandTotal > 0 && (
                          <span className="text-gray-600 ml-1">
                            ({((boosterStats.total / grandTotal) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

              {hasOptions && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Options choisies</h5>
                  <div className="flex flex-wrap gap-2">
                    {(displayData?.options || []).map((option, oi) => (
                      <span key={oi} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-lg">
                        {option}
                      </span>
                    ))}
                  </div>
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
              <div className="mb-5">
                <label className="text-xs text-gray-600 mb-1 block">Nom du parfum</label>
                <input
                  type="text"
                  value={editingData?.perfume_name || ''}
                  onChange={e => setEditingData(prev => prev ? { ...prev, perfume_name: e.target.value } : prev)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-5">
                {([
                  { type: 'top_notes' as const, label: 'Notes de tête', options: noteOptions.top, accent: 'border-sky-200 bg-sky-50/50' },
                  { type: 'heart_notes' as const, label: 'Notes de cœur', options: noteOptions.heart, accent: 'border-rose-200 bg-rose-50/50' },
                  { type: 'base_notes' as const, label: 'Notes de fond', options: noteOptions.base, accent: 'border-amber-200 bg-amber-50/50' },
                  { type: 'booster_notes' as const, label: 'Notes booster', options: noteOptions.booster, accent: 'border-violet-200 bg-violet-50/50' },
                ]).map(({ type, label, options, accent }) => (
                  <div key={type} className={`rounded-lg border ${accent} p-3`}>
                    <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">{label}</h5>
                    <div className="space-y-2">
                      {editingData?.[type]?.map((note, ni) => (
                        <div key={ni} className="flex flex-wrap gap-2 items-center">
                          <select
                            value={note.name}
                            onChange={e => handleNoteChange(type, ni, 'name', e.target.value)}
                            className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Choisir --</option>
                            {note.name && !options.includes(note.name) && (
                              <option value={note.name}>{note.name}</option>
                            )}
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <input
                            type="text"
                            value={note.quantity}
                            onChange={e => handleNoteChange(type, ni, 'quantity', e.target.value)}
                            className="w-16 shrink-0 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500"
                            placeholder="Qté"
                          />
                          <button
                            onClick={() => handleRemoveNote(type, ni)}
                            className="shrink-0 text-red-700 hover:text-red-800 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddNote(type)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                      >
                        + Ajouter une note
                      </button>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">Options</h5>
                  {optionCatalog.length === 0 ? (
                    <p className="text-xs text-gray-500">Aucune option disponible dans le catalogue.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {optionCatalog.map(name => {
                        const selected = editingData?.options.includes(name) ?? false
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => handleToggleOption(name)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              selected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                            }`}
                          >
                            {selected ? '✓ ' : ''}{name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                <div
                  ref={previewRef}
                  className="relative w-full h-[420px] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
                >
                  <img
                    ref={imageRef}
                    src={`${formulasApi.getThumbnailUrl(formulaId)}?v=${thumbnailVersion}`}
                    alt="Aperçu"
                    className="cursor-pointer select-none"
                    onLoad={handleImageLoad}
                    style={getFitStyle(naturalSize, previewWidth, 420, previewRotation)}
                    onClick={() => { setLightboxImage(`${formulasApi.getThumbnailUrl(formulaId)}?v=${thumbnailVersion}`); setLightboxRotation(previewRotation); setLightboxZoom(1) }}
                  />
                </div>
                <div className="relative z-10 flex justify-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setPreviewRotation(r => (r - 90 + 360) % 360)}
                    className="text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                    title="Pivoter à gauche (-90°)"
                  >
                    ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                    className="text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                    title="Pivoter à droite (+90°)"
                  >
                    ↻
                  </button>
                  {previewRotation !== 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewRotation(0)}
                      className="text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="Réinitialiser la rotation"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-col items-center gap-2">
                  <a
                    href={filesApi.getDownloadUrl(formula.file_id!)}
                    download
                    className="text-xs text-indigo-600 hover:text-indigo-600 transition-colors"
                  >
                    ⬇️ Télécharger
                  </a>
                  <Button size="sm" variant="secondary" onClick={handleGeneratePdf} loading={generatingPdf}>
                    {generatingPdf ? 'Génération...' : '🔄 Régénérer la fiche PDF'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <span className="text-2xl mb-2">📄</span>
                <p className="text-sm mb-3">Aucun document associé</p>
                <p className="text-xs text-gray-500 mb-3 text-center">
                  Cette formule a probablement été créée digitalement.<br />Vous pouvez générer une fiche PDF qui sera associée à cette formule.
                </p>
                <Button size="sm" variant="secondary" onClick={handleGeneratePdf} loading={generatingPdf}>
                  {generatingPdf ? 'Génération...' : '📄 Générer la fiche PDF'}
                </Button>
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
              <div className={`relative flex flex-1 items-center justify-center rounded-lg max-w-2xl h-[70vh] max-h-[70vh] ${lightboxZoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}>
                <img
                  src={lightboxImage}
                  alt="Aperçu"
                  className="rounded-lg m-auto shrink-0 select-none"
                  onLoad={handleImageLoad}
                  style={getFitStyle(naturalSize, Math.min(window.innerWidth - 200, 632), window.innerHeight * 0.7, lightboxRotation, lightboxZoom)}
                />
              </div>
              <div className="relative z-20 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 flex flex-col gap-2 shrink-0">
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
