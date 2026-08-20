import { useState, useEffect } from 'react'
import { customerReviewsApi, filesApi, formulasApi } from '../../api/ocrClient'
import { Button } from '../../components/ui/Button'

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

interface ReviewCustomer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  job: string
  country: string
  city: string
  reference: string
  date: string
  verified_email: string
  verified_phone: string
  type?: string
  formulas?: ReviewFormula[]
}

interface ReviewFormula {
  id: number
  reference: string
  perfume_name?: string
  file_id?: number
  top_notes: { id?: number; name: string; quantity: string }[]
  heart_notes: { id?: number; name: string; quantity: string }[]
  base_notes: { id?: number; name: string; quantity: string }[]
}

interface ReviewFile {
  id: number
  file_name: string
  file_type: string
}

function formatDateDisplay(dateString: string | null | undefined): string {
  if (!dateString) return 'Non renseigné'
  const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  if (ddmmyyyyRegex.test(dateString)) return dateString
  try {
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
  } catch { /* ignore */ }
  return dateString
}

export default function CustomerReviewsPage({ onBack }: { onBack: () => void }) {
  const [reviews, setReviews] = useState<ReviewCustomer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalReviews, setTotalReviews] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<ReviewCustomer | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [modalError, setModalError] = useState('')
  const [customerFiles, setCustomerFiles] = useState<ReviewFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [formulas, setFormulas] = useState<ReviewFormula[]>([])
  const [editingFormulas, setEditingFormulas] = useState<ReviewFormula[]>([])
  const [lightboxImage, setLightboxImage] = useState<ReviewFile | null>(null)
  const [lightboxRotation, setLightboxRotation] = useState(0)
  const [previewRotation, setPreviewRotation] = useState(0)
  const [selectedFormula] = useState<ReviewFormula | null>(null)
  const [showFormulaModal, setShowFormulaModal] = useState(false)

  const pageSize = 10

  useEffect(() => {
    fetchReviews()
  }, [currentPage, searchTerm])

  const fetchReviews = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await customerReviewsApi.getAll(currentPage, pageSize, null, searchTerm || null)
      setReviews(data.customers || [])
      setTotalReviews(data.total || 0)
    } catch {
      setError('Erreur lors du chargement des clients en attente')
      setReviews([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return
    try {
      await customerReviewsApi.delete(reviewId)
      fetchReviews()
    } catch {
      setError('Erreur lors de la suppression du client')
    }
  }

  const handleValidate = async (reviewId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir valider ce client ?')) return
    try {
      await customerReviewsApi.validate(reviewId)
      fetchReviews()
    } catch {
      setError('Erreur lors de la validation du client')
    }
  }

  const REVIEW_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'job', 'country', 'city'] as const

  const handleEditCustomer = async (customer: ReviewCustomer) => {
    setEditingCustomer(customer)
    setEditForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      job: customer.job || '',
      country: customer.country || '',
      city: customer.city || '',
    })
    setIsEditing(false)
    setPreviewRotation(0)
    setShowEditModal(true)
    fetchCustomerReviewFiles(customer.id)
    await fetchCustomerReviewDetails(customer.id)
  }

  const fetchCustomerReviewDetails = async (reviewId: number) => {
    try {
      const data = await customerReviewsApi.getById(reviewId)
      setFormulas(data.formulas || [])
      setEditingFormulas(JSON.parse(JSON.stringify(data.formulas || [])))
    } catch {
      setFormulas([])
      setEditingFormulas([])
    }
  }

  const fetchCustomerReviewFiles = async (reviewId: number) => {
    setFilesLoading(true)
    try {
      const data = await customerReviewsApi.getFiles(reviewId)
      const imageFiles = (data.files || []).filter((f: ReviewFile) => f.file_type === 'image/png')
      setCustomerFiles(imageFiles)
    } catch {
      setCustomerFiles([])
    } finally {
      setFilesLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    try {
      setModalError('')
      const customerData: Record<string, string> = {}
      for (const key of REVIEW_FIELDS) {
        if (editForm[key]) customerData[key] = editForm[key]
      }
      await customerReviewsApi.update(editingCustomer!.id, customerData)
      for (const formula of editingFormulas) {
        await formulasApi.updateNotes(formula.id, {
          reference: formula.reference,
          perfume_name: formula.perfume_name,
          top_notes: formula.top_notes,
          heart_notes: formula.heart_notes,
          base_notes: formula.base_notes,
        })
      }
      setIsEditing(false)
      fetchReviews()
      await fetchCustomerReviewDetails(editingCustomer!.id)
      const updatedReview = reviews.find(r => r.id === editingCustomer!.id)
      if (updatedReview) {
        setEditingCustomer({ ...editingCustomer!, ...editForm })
      }
    } catch {
      setModalError('Erreur lors de la modification du client ou de la formule')
    }
  }

  const handleCancelEdit = () => {
    if (isEditing) {
      setIsEditing(false)
      setModalError('')
      if (editingCustomer) {
        setEditForm({
          first_name: editingCustomer.first_name || '',
          last_name: editingCustomer.last_name || '',
          email: editingCustomer.email || '',
          phone: editingCustomer.phone || '',
          job: editingCustomer.job || '',
          country: editingCustomer.country || '',
          city: editingCustomer.city || '',
        })
      }
      setEditingFormulas(JSON.parse(JSON.stringify(formulas)))
    } else {
      setShowEditModal(false)
      setEditingCustomer(null)
      setEditForm({})
      setCustomerFiles([])
      setLightboxImage(null)
      setFormulas([])
      setEditingFormulas([])
      setModalError('')
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalReviews / pageSize)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-900 transition-colors text-lg"
            title="Retour à la liste des clients"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Clients en attente de validation</h1>
            <p className="text-xs text-gray-600">
              Liste temporaire des clients à valider ou supprimer ({totalReviews} en attente)
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchReviews}>🔄</Button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Rechercher par nom, prénom, référence ou nom de parfum..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50/20 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">
          <span>Chargement des clients en attente...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
          <span className="text-3xl mb-2">✅</span>
          <h3 className="text-sm font-medium text-gray-500">Aucun client en attente</h3>
          <p className="text-xs text-gray-700 mt-1">Tous les clients ont été traités.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Prénom</th>
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                  <th className="text-left px-4 py-3 font-medium">Ville</th>
                  <th className="text-left px-4 py-3 font-medium">Pays</th>
                  <th className="text-left px-4 py-3 font-medium">Référence</th>
                  <th className="text-left px-4 py-3 font-medium">Métier</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr
                    key={review.id}
                    onClick={() => handleEditCustomer(review)}
                    className="border-b border-gray-200/50 hover:bg-gray-100/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-medium">
                        {review.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{review.first_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-900">{review.last_name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600">{review.email || 'N/A'}</span>
                        {review.verified_email === '1' && (
                          <span className="text-emerald-600 text-xs" title="Email vérifié">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600">{review.phone || 'N/A'}</span>
                        {review.verified_phone === '1' && (
                          <span className="text-emerald-600 text-xs" title="Téléphone vérifié">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{review.city || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{review.country || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{review.formulas?.[0]?.reference || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-600">{review.job || 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); handleValidate(review.id) }}
                          className="text-emerald-600 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded text-xs font-medium transition-colors"
                          title="Valider ce client"
                        >
                          ✓
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(review.id) }}
                          className="text-red-700 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded text-xs font-medium transition-colors"
                          title="Supprimer ce client"
                        >
                          ✗
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Page {currentPage} sur {totalPages} · {totalReviews} clients en attente</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, currentPage - 2)
                  const pageNumber = startPage + i
                  if (pageNumber > totalPages) return null
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-2 py-1 rounded transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white hover:bg-gray-200 text-gray-500'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleCancelEdit}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-gray-900 font-bold">
                  {isEditing ? 'Modifier le client' : 'Détails du client en attente'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {editingCustomer.verified_email === '1' && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-400/30 px-1.5 py-0.5 rounded-full">✓ Email vérifié</span>
                  )}
                  {editingCustomer.verified_email === '0' && (
                    <span className="text-[10px] bg-red-500/10 text-red-700 border border-red-400/30 px-1.5 py-0.5 rounded-full">✗ Email non vérifié</span>
                  )}
                  {editingCustomer.verified_phone === '1' && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-400/30 px-1.5 py-0.5 rounded-full">✓ Téléphone vérifié</span>
                  )}
                  {editingCustomer.verified_phone === '0' && (
                    <span className="text-[10px] bg-red-500/10 text-red-700 border border-red-400/30 px-1.5 py-0.5 rounded-full">✗ Téléphone non vérifié</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)}>✏️ Modifier</Button>
                )}
                <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-900 text-xl">&times;</button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {!isEditing ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Informations personnelles</h4>
                        <div className="space-y-2">
                          {[
                            ['Prénom', editingCustomer.first_name],
                            ['Nom', editingCustomer.last_name],
                            ['Email', editingCustomer.email],
                            ['Téléphone', editingCustomer.phone],
                            ['Métier', editingCustomer.job],
                            ['Date', formatDateDisplay(editingCustomer.date)],
                          ].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between text-sm">
                              <span className="text-gray-600">{label as string}</span>
                              <span className="text-gray-900">{value || 'Non renseigné'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Localisation</h4>
                        <div className="space-y-2">
                          {[
                            ['Ville', editingCustomer.city],
                            ['Pays', editingCustomer.country],
                          ].map(([label, value]) => (
                            <div key={label as string} className="flex justify-between text-sm">
                              <span className="text-gray-600">{label as string}</span>
                              <span className="text-gray-900">{value || 'Non renseigné'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Informations personnelles</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {['first_name', 'last_name', 'email', 'phone', 'job'].map(field => (
                            <div key={field}>
                              <label className="text-xs text-gray-600 mb-1 block capitalize">{field.replace('_', ' ')}</label>
                              <input
                                type="text"
                                value={editForm[field] || ''}
                                onChange={e => handleFormChange(field, e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Localisation</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {['city', 'country'].map(field => (
                            <div key={field}>
                              <label className="text-xs text-gray-600 mb-1 block capitalize">{field}</label>
                              <input
                                type="text"
                                value={editForm[field] || ''}
                                onChange={e => handleFormChange(field, e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Document scanné</h4>
                  {filesLoading ? (
                    <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Chargement...</div>
                  ) : customerFiles.length > 0 ? (
                    <div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-2">
                        <img
                          src={filesApi.getContentUrl(customerFiles[0].id)}
                          alt={customerFiles[0].file_name}
                          className="w-full cursor-pointer"
                          style={{ transform: `rotate(${previewRotation}deg)`, transition: 'transform 0.3s ease' }}
                          onClick={() => { setLightboxImage(customerFiles[0]); setLightboxRotation(previewRotation) }}
                        />
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setPreviewRotation(r => (r - 90 + 360) % 360)}
                          className="text-xs text-gray-500 hover:text-gray-900 bg-white px-2 py-1 rounded transition-colors"
                        >
                          ↺
                        </button>
                        <button
                          onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                          className="text-xs text-gray-500 hover:text-gray-900 bg-white px-2 py-1 rounded transition-colors"
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                      <span className="text-2xl mb-2">📄</span>
                      <p className="text-sm">Aucun document disponible</p>
                    </div>
                  )}
                </div>
              </div>

              {!isEditing && formulas.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Formule</h4>
                  {formulas.map(formula => (
                    <div key={formula.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-xs">
                          <span className="text-gray-600">Référence :</span>
                          <span className="text-gray-900 ml-1">{formula.reference || 'Non renseigné'}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-600">Nom du parfum :</span>
                          <span className="text-gray-900 ml-1">{formula.perfume_name || 'Non renseigné'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {(['top_notes', 'heart_notes', 'base_notes'] as const).map((noteType, ti) => (
                          <div key={noteType}>
                            <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                              {['Notes de tête', 'Notes de cœur', 'Notes de fond'][ti]}
                            </h5>
                            {formula[noteType]?.length > 0 ? (
                              <ul className="space-y-1">
                                {formula[noteType].map((note, ni) => (
                                  <li key={note.id || ni} className="flex justify-between text-xs text-gray-600">
                                    <span>{note.name}</span>
                                    <span className="text-gray-600">{note.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-700">Aucune note</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isEditing && editingFormulas.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Formule</h4>
                  {editingFormulas.map((formula, formulaIndex) => (
                    <div key={formula.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 mb-1 block">Référence</label>
                        <input
                          type="text"
                          value={formula.reference || ''}
                          onChange={e => {
                            const updated = [...editingFormulas]
                            updated[formulaIndex] = { ...updated[formulaIndex], reference: e.target.value }
                            setEditingFormulas(updated)
                          }}
                          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 mb-1 block">Nom du parfum</label>
                        <input
                          type="text"
                          value={formula.perfume_name || ''}
                          onChange={e => {
                            const updated = [...editingFormulas]
                            updated[formulaIndex] = { ...updated[formulaIndex], perfume_name: e.target.value }
                            setEditingFormulas(updated)
                          }}
                          className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {(['top_notes', 'heart_notes', 'base_notes'] as const).map((noteType, ti) => (
                          <div key={noteType}>
                            <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                              {['Notes de tête', 'Notes de cœur', 'Notes de fond'][ti]}
                            </h5>
                            <div className="space-y-1">
                              {formula[noteType].map((note, noteIndex) => (
                                <div key={note.id || noteIndex} className="flex gap-1 items-center">
                                  <select
                                    value={note.name}
                                    onChange={e => {
                                      const updated = [...editingFormulas]
                                      updated[formulaIndex][noteType][noteIndex] = { ...note, name: e.target.value }
                                      setEditingFormulas(updated)
                                    }}
                                    className="flex-1 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 outline-none focus:border-indigo-500"
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
                                    onChange={e => {
                                      const updated = [...editingFormulas]
                                      updated[formulaIndex][noteType][noteIndex] = { ...note, quantity: e.target.value }
                                      setEditingFormulas(updated)
                                    }}
                                    className="w-16 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 outline-none focus:border-indigo-500"
                                    placeholder="Qté"
                                  />
                                  <button
                                    onClick={() => {
                                      const updated = [...editingFormulas]
                                      updated[formulaIndex][noteType].splice(noteIndex, 1)
                                      setEditingFormulas(updated)
                                    }}
                                    className="text-red-700 hover:text-red-700 text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const updated = [...editingFormulas]
                                  updated[formulaIndex][noteType].push({ name: '', quantity: '' })
                                  setEditingFormulas(updated)
                                }}
                                className="text-xs text-indigo-600 hover:text-indigo-600 transition-colors"
                              >
                                + Ajouter une note
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isEditing && (
                <>
                  {modalError && (
                    <div className="bg-red-50/20 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg mt-6">⚠️ {modalError}</div>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" size="sm" onClick={handleCancelEdit}>Annuler</Button>
                    <Button size="sm" onClick={handleSaveEdit}>Enregistrer</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => { setLightboxImage(null); setLightboxRotation(0) }}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setLightboxImage(null); setLightboxRotation(0) }}
              className="absolute -top-10 right-0 text-gray-900 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
            <div className="flex justify-center gap-2 mb-2">
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
            <img
              src={filesApi.getContentUrl(lightboxImage.id)}
              alt={lightboxImage.file_name}
              className="max-w-full max-h-[80vh] rounded-lg"
              style={{ transform: `rotate(${lightboxRotation}deg)`, transition: 'transform 0.3s ease' }}
            />
            <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
              <span>{lightboxImage.file_name}</span>
              <a
                href={filesApi.getDownloadUrl(lightboxImage.id)}
                download
                className="text-indigo-600 hover:text-indigo-600 transition-colors"
              >
                ⬇️ Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {showFormulaModal && selectedFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowFormulaModal(false)}>
          <div className="bg-gray-100 border border-gray-200 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900 font-bold">Formule {selectedFormula.id}</h3>
              <button onClick={() => setShowFormulaModal(false)} className="text-gray-500 hover:text-gray-900 text-xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Document associé</h4>
                  {selectedFormula.file_id && customerFiles.find(f => f.id === selectedFormula.file_id) ? (
                    <img
                      src={filesApi.getContentUrl(selectedFormula.file_id)}
                      alt={`Fichier ${selectedFormula.file_id}`}
                      className="w-full rounded-lg cursor-pointer border border-gray-200"
                      onClick={() => {
                        const file = customerFiles.find(f => f.id === selectedFormula.file_id)
                        if (file) { setLightboxImage(file); setLightboxRotation(0) }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                      <span className="text-2xl mb-2">📄</span>
                      <p className="text-sm">Aucun document associé</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Composition de la formule</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {(['top_notes', 'heart_notes', 'base_notes'] as const).map((noteType, ti) => (
                      <div key={noteType}>
                        <h5 className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
                          {['Notes de tête', 'Notes de cœur', 'Notes de fond'][ti]}
                        </h5>
                        {selectedFormula[noteType]?.length > 0 ? (
                          <ul className="space-y-1">
                            {selectedFormula[noteType].map((note, ni) => (
                              <li key={note.id || ni} className="flex justify-between text-xs text-gray-600">
                                <span>{note.name}</span>
                                <span className="text-gray-600">{note.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-700">Aucune note</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
