import { useEffect, useState } from 'react'
import { customersApi, ordersApi, formulasApi } from '../../api/ocrClient'
import { useToast } from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

interface Customer {
  id: number
  name: string
  first_name?: string
  last_name?: string
  prenom?: string
  nom?: string
  email: string
  phone: string
  city: string
  country: string
  job: string
  files?: { id: number; file_name: string; file_path?: string }[]
  formulas?: Formula[]
}

interface Order {
  id: number
  order_type: string
  status: string
  created_at: string
  formula_id: number | null
}

interface Formula {
  id: number
  reference?: string
  perfume_name?: string
  file_id?: number
}

interface CustomerDetailsPageProps {
  customerId: number
  onBack: () => void
  onCustomerDeleted: () => void
  onOpenFormula: (formulaId: number) => void
}

export default function CustomerDetailsPage({ customerId, onBack, onCustomerDeleted, onOpenFormula }: CustomerDetailsPageProps) {
  const { showError, showSuccess } = useToast()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxFile, setLightboxFile] = useState<{ id: number; file_name: string; file_path?: string } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null)

  useEffect(() => {
    customersApi.getById(customerId)
      .then(cust => {
        setCustomer(cust)
        setFormulas(cust.formulas || [])
        return ordersApi.getAll(1, 100, { customerId }).then(ordRes => {
          setOrders(ordRes.results || ordRes.data || ordRes.orders || [])
        })
      })
      .catch(() => showError('Erreur', 'Impossible de charger les données'))
      .finally(() => setLoading(false))
  }, [customerId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await customersApi.delete(customerId)
      showSuccess('Client supprimé')
      onCustomerDeleted()
    } catch {
      showError('Erreur', 'Impossible de supprimer le client')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleEdit = () => {
    if (!customer) return
    setEditForm({
      first_name: customer.first_name || customer.prenom || '',
      last_name: customer.last_name || customer.nom || '',
      email: customer.email || '',
      phone: customer.phone || '',
      job: customer.job || '',
      city: customer.city || '',
      country: customer.country || '',
    })
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!customer) return
    setSaving(true)
    try {
      const data: Record<string, string> = {}
      for (const key of ['first_name', 'last_name', 'email', 'phone', 'job', 'city', 'country']) {
        if (editForm[key]) data[key] = editForm[key]
      }
      await customersApi.update(customerId, data)
      setCustomer({ ...customer, ...data, name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : customer.name })
      setIsEditing(false)
      showSuccess('Client modifié')
    } catch {
      showError('Erreur', 'Impossible de modifier le client')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({})
  }

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleGeneratePdf = async (formula: Formula) => {
    setGeneratingPdfId(formula.id)
    try {
      const updated = await formulasApi.generatePdf(formula.id)
      setFormulas(prev => prev.map(f => (f.id === formula.id ? { ...f, file_id: updated.file_id } : f)))
      showSuccess('Fiche PDF générée')
    } catch {
      showError('Erreur', 'Impossible de générer la fiche PDF')
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      en_attente: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      en_cours: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      terminee: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      sans_formule: 'bg-red-500/10 text-red-700 border-red-500/30',
    }
    return colors[status] || 'bg-gray-300/10 text-gray-500 border-gray-400/30'
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      terminee: 'Terminée',
      sans_formule: 'Sans formule',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-700 text-sm">Client introuvable</p>
        <button onClick={onBack} className="mt-4 text-sm text-indigo-600 hover:text-indigo-600">Retour</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900 transition-colors">⬅</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">{customer.name}</h1>
        {!isEditing ? (
          <Button size="sm" onClick={handleEdit}>✏️ Modifier</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Annuler</Button>
            <Button size="sm" onClick={handleSaveEdit} loading={saving}>Enregistrer</Button>
          </div>
        )}
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-600">Email</span>
                <p className="text-sm text-gray-900">{customer.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Téléphone</span>
                <p className="text-sm text-gray-900">{customer.phone || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Profession</span>
                <p className="text-sm text-gray-900">{customer.job || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-600">Ville</span>
                <p className="text-sm text-gray-900">{customer.city || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Pays</span>
                <p className="text-sm text-gray-900">{customer.country || '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {['first_name', 'last_name', 'email', 'phone', 'job'].map(field => (
                <div key={field}>
                  <span className="text-xs text-gray-600 capitalize block mb-1">{field.replace('_', ' ')}</span>
                  <input
                    type="text"
                    value={editForm[field] || ''}
                    onChange={e => handleFormChange(field, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {['city', 'country'].map(field => (
                <div key={field}>
                  <span className="text-xs text-gray-600 capitalize block mb-1">{field}</span>
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
        )}
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">🧪 Formules disponibles ({formulas.length})</h2>
        {formulas.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">Aucune formule disponible pour ce client</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {formulas.map(f => (
              <div
                key={f.id}
                className="flex items-center gap-1 bg-white border border-gray-300 hover:border-indigo-500/30 rounded-lg transition-colors"
              >
                <button
                  onClick={() => onOpenFormula(f.id)}
                  className="text-xs text-gray-600 hover:text-indigo-600 pl-3 pr-2 py-1.5"
                >
                  🔬 {f.reference || `Formule #${f.id}`}
                </button>
                {!f.file_id && (
                  <>
                    <span
                      title="Aucune fiche associée (formule probablement créée digitalement)"
                      className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                    >
                      Aucune fiche
                    </span>
                    <button
                      onClick={() => handleGeneratePdf(f)}
                      disabled={generatingPdfId === f.id}
                      title="Générer et associer une fiche PDF à cette formule"
                      className="text-xs text-indigo-600 hover:text-indigo-600 pl-1 pr-3 py-1.5 disabled:opacity-50"
                    >
                      {generatingPdfId === f.id ? '⏳' : '⬇️'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">📦 Commandes ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">Aucune commande</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Statut</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">Formule</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-200/50 hover:bg-gray-100/60">
                    <td className="py-2 px-3 text-gray-900">{o.order_type}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      {o.formula_id ? (
                        <button
                          onClick={() => onOpenFormula(o.formula_id!)}
                          className="text-indigo-600 hover:text-indigo-600 text-xs"
                        >
                          🔬 Voir formule
                        </button>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {customer.files && customer.files.length > 0 && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">📁 Fichiers ({customer.files.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {customer.files.map((f) => (
              <button
                key={f.id}
                onClick={() => setLightboxFile(f)}
                className="aspect-square bg-white rounded-lg overflow-hidden border border-gray-300 hover:border-indigo-500 transition-colors"
              >
                {f.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={f.file_path} alt={f.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600">📄</div>
                )}
                <p className="text-[10px] text-gray-600 truncate px-1 pb-1">{f.file_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">⬅ Retour</button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-sm text-red-700 hover:text-red-700 transition-colors"
        >
          🗑 Supprimer le client
        </button>
      </div>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le client"
        message={`Êtes-vous sûr de vouloir supprimer ${customer.name} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        danger
        isLoading={deleting}
      />

      {lightboxFile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxFile(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxFile(null)}
              className="absolute -top-8 right-0 text-gray-900/60 hover:text-gray-900 text-sm"
            >
              ✕ Fermer
            </button>
            {lightboxFile.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={lightboxFile.file_path} alt={lightboxFile.file_name} className="w-full rounded-lg" />
            ) : (
              <div className="bg-gray-100 rounded-lg p-12 text-center">
                <p className="text-gray-500">📄 {lightboxFile.file_name}</p>
              </div>
            )}
            <p className="text-center text-sm text-gray-500 mt-3">{lightboxFile.file_name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
