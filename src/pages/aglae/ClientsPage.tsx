import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { customersApi, groupsApi, quotasApi, exportApi, customerReviewsApi } from '../../api/ocrClient'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

interface Customer {
  id: number
  nom?: string
  prenom?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  email_verified?: boolean
  phone_verified?: boolean
  verified_email?: boolean
  verified_phone?: boolean
  telephone?: string
  phone?: string
  metier?: string
  job?: string
  ville?: string
  city?: string
  pays?: string
  country?: string
  reference?: string
  date?: string
  created_at?: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  total_pages: number
}

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const EMPTY_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'first_name', label: 'Prénom' },
  { value: 'last_name', label: 'Nom' },
  { value: 'country', label: 'Pays' },
  { value: 'city', label: 'Ville' },
]

export default function ClientsPage({
  onOpenCustomer,
  onOpenCustomerReviews,
}: {
  onOpenCustomer: (customerId: number) => void
  onOpenGroups: (groupIds: number[]) => void
  onOpenCustomerReviews?: () => void
}) {
  const { sdpUser } = useAuth()
  const { showError, showSuccess, showWarning, showQuotaError } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, total_pages: 0 })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [allCountries, setAllCountries] = useState<string[]>([])
  const [filterCountry, setFilterCountry] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterVerified, setFilterVerified] = useState('')
  const [filterEmptyFields, setFilterEmptyFields] = useState<Set<string>>(new Set())
  const [emptyFieldsOpen, setEmptyFieldsOpen] = useState(false)
  const emptyFieldsRef = useRef<HTMLDivElement>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [pendingReviews, setPendingReviews] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkColumn, setBulkColumn] = useState('pays')
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkNewValue, setBulkNewValue] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupIds, setGroupIds] = useState('')
  const [addingToGroup, setAddingToGroup] = useState(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true'

  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(pagination.pageSize))
      params.set('v2', IS_DEV ? 'true' : 'false')
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filterCountry) params.set('country', filterCountry)
      if (filterYear) params.set('year', filterYear)
      if (filterMonth) params.set('month', filterMonth)
      if (filterVerified) params.set('verified', filterVerified)
      if (filterEmptyFields.size > 0) params.set('empty_fields', Array.from(filterEmptyFields).join(','))
      const data = await customersApi.search(params.toString())
      const items = data.customers || data.results || data.data || data.items || []
      setCustomers(Array.isArray(items) ? items : [])
      if (data.total !== undefined) setPagination(prev => ({ ...prev, page, total: data.total, total_pages: data.total_pages ?? Math.ceil(data.total / prev.pageSize) }))
    } catch {
      setError('Erreur lors du chargement des clients')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pagination.pageSize, filterCountry, filterYear, filterMonth, filterVerified, filterEmptyFields])

  useEffect(() => {
    customersApi.getCountries().then(setAllCountries).catch(() => {})
  }, [])

  useEffect(() => { fetchCustomers(1) }, [fetchCustomers])



  useEffect(() => {
    customerReviewsApi.getAll(1, 1, 'pending')
      .then(data => setPendingReviews(data.total ?? data.count ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!emptyFieldsOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (emptyFieldsRef.current && !emptyFieldsRef.current.contains(e.target as Node)) {
        setEmptyFieldsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [emptyFieldsOpen])

  const toggleEmptyField = (field: string) => {
    setFilterEmptyFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(customers.map(c => c.id)))
      setSelectAll(true)
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExportCsv = async () => {
    if (!sdpUser) { showError('Non connecté'); return }
    try {
      await quotasApi.consumeCsvQuota(sdpUser.id)
    } catch (err: unknown) {
      const error = err as { status?: number; detail?: unknown; message?: string }
      if (error.status === 429) { showQuotaError(error.detail as { type?: string; message?: string } | undefined); return }
      showError('Erreur de quota')
      return
    }
    try {
      const ids = selected.size > 0 ? Array.from(selected) : customers.map(c => c.id)
      const allCustomers = await customersApi.getAllNoPagination()
      const exportData = (Array.isArray(allCustomers) ? allCustomers : allCustomers.customers || allCustomers.results || [])
        .filter((c: Customer) => ids.includes(c.id))
      const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Métier', 'Ville', 'Pays']
      const rows = exportData.map((c: Customer) => ({
        Nom: c.nom || c.name?.split(' ').slice(1).join(' ') || '',
        Prénom: c.prenom || c.name?.split(' ')[0] || '',
        Email: c.email,
        Téléphone: c.telephone || c.phone || '',
        Métier: c.metier || c.job || '',
        Ville: c.ville || c.city || '',
        Pays: c.pays || c.country || '',
      }))
      const blob = await exportApi.generateCsv(headers, rows)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clients_export.csv'
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('Export CSV réussi')
    } catch {
      showError('Erreur lors de l\'export CSV')
    }
  }

  const handleBulkEdit = async () => {
    if (!bulkSearch || !bulkNewValue) { showWarning('Champs requis', 'Veuillez remplir tous les champs'); return }
    setBulkApplying(true)
    try {
      const ids = selected.size > 0 ? Array.from(selected) : customers.map(c => c.id)
      const allCustomers = await customersApi.getAllNoPagination()
      const toUpdate = (Array.isArray(allCustomers) ? allCustomers : allCustomers.customers || allCustomers.results || [])
        .filter((c: Customer) => {
          const val = String((c as unknown as Record<string, unknown>)[bulkColumn] || '').toLowerCase()
          return ids.includes(c.id) && val.includes(bulkSearch.toLowerCase())
        })
      const updates = toUpdate.map((c: Customer) => ({ id: c.id, [bulkColumn]: bulkNewValue }))
      if (updates.length === 0) { showWarning('Aucun client trouvé'); return }
      await customersApi.bulkUpdate(updates)
      showSuccess(`✅ ${updates.length} client(s) mis à jour`)
      setBulkEditOpen(false)
      fetchCustomers(pagination.page)
    } catch {
      showError('Erreur lors de la mise à jour')
    } finally {
      setBulkApplying(false)
    }
  }

  const handleAddToGroup = async () => {
    const ids = groupIds.split(',').map(s => s.trim()).filter(Boolean).map(Number)
    if (ids.length === 0) { showWarning('Entrez des IDs de groupes'); return }
    setAddingToGroup(true)
    try {
      for (const groupId of ids) {
        await groupsApi.addCustomers(groupId, Array.from(selected), sdpUser?.id ?? 0)
      }
      showSuccess('✅ Clients ajoutés aux groupes')
      setGroupModalOpen(false)
      setGroupIds('')
    } catch {
      showError('Erreur lors de l\'ajout aux groupes')
    } finally {
      setAddingToGroup(false)
    }
  }

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    const tp = pagination.total_pages
    if (tp <= 7) {
      for (let i = 1; i <= tp; i++) pages.push(i)
    } else {
      pages.push(1)
      if (pagination.page > 3) pages.push('...')
      for (let i = Math.max(2, pagination.page - 1); i <= Math.min(tp - 1, pagination.page + 1); i++) pages.push(i)
      if (pagination.page < tp - 2) pages.push('...')
      pages.push(tp)
    }
    return pages
  }, [pagination.page, pagination.total_pages])

  const countries = allCountries

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">👥 Clients</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            {pagination.total > 0
              ? `${pagination.total} client${pagination.total !== 1 ? 's' : ''}`
              : ''}
            {pendingReviews > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-medium">
                ⏳ {pendingReviews} avis en attente
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? '🔽 Cache filtres' : '🔼 Filtres'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fetchCustomers(1)}>🔄</Button>
        </div>
      </div>

      {onOpenCustomerReviews && (
        <Button size="sm" onClick={onOpenCustomerReviews}>
          ⏳ Clients en attente de validation
        </Button>
      )}

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 space-y-3">
        <Input
          placeholder="Rechercher par nom, email, téléphone, nom de parfum..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {showFilters && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Pays</label>
                <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Tous</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Année</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Toutes</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Mois</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Tous</option>
                  {MONTHS.filter(Boolean).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Email vérifié</label>
                <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
                  <option value="">Tous</option>
                  <option value="true">✅ Vérifié</option>
                  <option value="false">❌ Non vérifié</option>
                </select>
              </div>
            </div>
            <div className="relative" ref={emptyFieldsRef}>
              <label className="text-xs text-gray-500 mb-1.5 block">Champs manquants (au moins un des champs sélectionnés est vide)</label>
              <button
                type="button"
                onClick={() => setEmptyFieldsOpen(o => !o)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-left text-gray-900 outline-none focus:border-indigo-500 transition-colors flex items-center justify-between"
              >
                <span className={filterEmptyFields.size === 0 ? 'text-gray-500' : ''}>
                  {filterEmptyFields.size === 0
                    ? 'Aucun'
                    : `${filterEmptyFields.size} champ${filterEmptyFields.size > 1 ? 's' : ''} sélectionné${filterEmptyFields.size > 1 ? 's' : ''}`}
                </span>
                <span className={`text-gray-500 transition-transform ${emptyFieldsOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {emptyFieldsOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                  {EMPTY_FIELD_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filterEmptyFields.has(opt.value)}
                        onChange={() => toggleEmptyField(opt.value)}
                        className="accent-indigo-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => { setFilterCountry(''); setFilterYear(''); setFilterMonth(''); setFilterVerified(''); setFilterEmptyFields(new Set()); setSearch(''); }}>Réinitialiser</Button>
            </div>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">{selected.size} sélectionné(s)</span>
          <Button size="sm" onClick={() => setGroupModalOpen(true)}>👥 Ajouter à un groupe</Button>
          <Button size="sm" onClick={handleExportCsv}>📥 Export CSV</Button>
          <Button size="sm" variant="secondary" onClick={() => setBulkEditOpen(true)}>✏️ Édition en masse</Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelected(new Set()); setSelectAll(false) }}>Désélectionner</Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-gray-100 border border-gray-200 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600">
          <span className="text-3xl mb-2">👥</span>
          <p className="text-sm">Aucun client trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll && customers.every(c => selected.has(c.id))}
                      onChange={handleSelectAll}
                      className="accent-indigo-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium">Prénom</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                  <th className="text-left px-4 py-3 font-medium">Métier</th>
                  <th className="text-left px-4 py-3 font-medium">Ville</th>
                  <th className="text-left px-4 py-3 font-medium">Pays</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCustomer(c.id)}
                    className="border-b border-gray-200/50 hover:bg-gray-100/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="accent-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900">{c.nom || c.last_name || c.name?.split(' ').slice(1).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{c.prenom || c.first_name || c.name?.split(' ')[0] || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        {c.email || '—'}
                        {(c.email_verified || c.verified_email) && <span className="text-emerald-600 text-xs" title="Vérifié">✓</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        {c.telephone || c.phone || '—'}
                        {(c.verified_phone || c.phone_verified) && <span className="text-emerald-600 text-xs" title="Vérifié">✓</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.metier || c.job || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.ville || c.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.pays || c.country || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">
                Page {pagination.page} sur {pagination.total_pages}
              </span>
              <div className="flex gap-1">
                <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchCustomers(pagination.page - 1)}>◀</Button>
                {pageNumbers.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`e${i}`} className="px-2 py-1 text-xs text-gray-700">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchCustomers(p)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        p === pagination.page
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => fetchCustomers(pagination.page + 1)}>▶</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="Ajouter aux groupes" size="sm">
        <p className="text-sm text-gray-600 mb-4">Entrez les IDs des groupes séparés par des virgules :</p>
        <Input
          placeholder="1, 2, 3"
          value={groupIds}
          onChange={e => setGroupIds(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setGroupModalOpen(false)}>Annuler</Button>
          <Button size="sm" onClick={handleAddToGroup} loading={addingToGroup}>Ajouter</Button>
        </div>
      </Modal>

      <Modal isOpen={bulkEditOpen} onClose={() => setBulkEditOpen(false)} title="✏️ Édition en masse" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Modification en masse pour {selected.size || customers.length} client(s)
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Colonne</label>
            <select value={bulkColumn} onChange={e => setBulkColumn(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 transition-colors">
              <option value="pays">Pays</option>
              <option value="ville">Ville</option>
              <option value="metier">Métier</option>
              <option value="telephone">Téléphone</option>
            </select>
          </div>
          <Input
            label="Valeur à rechercher"
            placeholder="..."
            value={bulkSearch}
            onChange={e => setBulkSearch(e.target.value)}
          />
          <Input
            label="Nouvelle valeur"
            placeholder="..."
            value={bulkNewValue}
            onChange={e => setBulkNewValue(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setBulkEditOpen(false)}>Annuler</Button>
          <Button size="sm" onClick={handleBulkEdit} loading={bulkApplying}>Appliquer</Button>
        </div>
      </Modal>
    </div>
  )
}
